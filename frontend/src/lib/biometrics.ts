import { api, setAuthToken } from './api';

const BIOMETRIC_STORAGE_KEY = 'flatmate_biometric_auth';

export interface StoredBiometricCredential {
  credentialId: string;
  rawId?: string;
  username: string;
  userId: string;
  deviceToken?: string;
  registeredAt: string;
  alreadyVerified?: boolean;
  verificationResult?: any;
}

/**
 * Base64URL encoding/decoding utilities for browser WebAuthn binary structures
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Checks if the current browser and device support WebAuthn platform biometrics (Fingerprint / Face Unlock)
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if a biometric credential was previously enrolled on this device
 */
export function getRegisteredBiometric(): StoredBiometricCredential | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredBiometricCredential;
  } catch {
    return null;
  }
}

/**
 * Clears registered biometric from this device
 */
export function removeRegisteredBiometric(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BIOMETRIC_STORAGE_KEY);
}

/**
 * Enrolls device biometrics using server-verified WebAuthn platform authenticator
 * and falls back to signed device tokens for maximum compatibility.
 */
export async function registerBiometrics(
  username: string,
  userId: string,
  displayName: string
): Promise<boolean> {
  const available = await isBiometricAvailable();
  if (!available) {
    throw new Error('Biometric authentication is not supported on this device or browser.');
  }

  let serverChallenge: string | null = null;
  let challengeBytes: Uint8Array;

  try {
    const options = await api<{
      challenge: string;
      rp: { name: string; id: string };
      user: { id: string; name: string; displayName: string };
      pubKeyCredParams: Array<{ alg: number; type: string }>;
      timeout: number;
    }>('POST', '/auth/webauthn/register-options');

    serverChallenge = options.challenge;
    challengeBytes = base64UrlToBuffer(options.challenge);
  } catch {
    challengeBytes = new Uint8Array(32);
    window.crypto.getRandomValues(challengeBytes);
  }

  const enc = new TextEncoder();
  const userIdBytes = enc.encode(userId);

  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBytes as any as BufferSource,
    rp: {
      name: 'Flatmate Expense Manager',
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    },
    user: {
      id: userIdBytes as any as BufferSource,
      name: username,
      displayName: displayName || username,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = (await navigator.credentials.create({
    publicKey: creationOptions,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Biometric registration was cancelled or failed.');
  }

  const rawIdBase64 = bufferToBase64Url(credential.rawId);
  const credId = credential.id || rawIdBase64;
  let enrolledToken: string | undefined = undefined;

  // 1. If server provided a challenge, complete server-side verification and key storage
  if (serverChallenge) {
    try {
      const attResp = credential.response as AuthenticatorAttestationResponse;
      const clientDataJSON = bufferToBase64Url(attResp.clientDataJSON);
      let publicKey = credId;
      if (typeof (attResp as any).getPublicKey === 'function') {
        const pkBuf = (attResp as any).getPublicKey();
        if (pkBuf) publicKey = bufferToBase64Url(pkBuf);
      } else if (attResp.attestationObject) {
        publicKey = bufferToBase64Url(attResp.attestationObject);
      }

      await api('POST', '/auth/webauthn/register-verify', {
        expectedChallenge: serverChallenge,
        clientDataJSON,
        credentialId: credId,
        publicKey,
        deviceName: navigator.userAgent.slice(0, 100),
      });
    } catch (err: any) {
      console.warn('[WebAuthn server verification fallback]:', err?.message || err);
    }
  }

  // 2. Also enroll device token for backward compatibility
  try {
    const enrollRes = await api<{ success: boolean; deviceToken: string }>('POST', '/auth/biometric-enroll', {
      credentialId: credId,
    });
    enrolledToken = enrollRes.deviceToken;
  } catch (err: any) {
    console.warn('[Biometric device token enroll warning]:', err?.message || err);
  }

  const stored: StoredBiometricCredential = {
    credentialId: credId,
    rawId: rawIdBase64,
    username,
    userId,
    deviceToken: enrolledToken,
    registeredAt: new Date().toISOString(),
  };

  localStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));
  return true;
}

/**
 * Triggers Android/iOS biometric verification prompt via navigator.credentials.get()
 * and verifies assertion signature on the server.
 */
export async function authenticateWithBiometrics(): Promise<StoredBiometricCredential> {
  const registered = getRegisteredBiometric();
  if (!registered) {
    throw new Error('No fingerprint registered on this device.');
  }

  const available = await isBiometricAvailable();
  if (!available) {
    throw new Error('Biometric sensor is not available.');
  }

  // Parse credentialId to ArrayBuffer
  let allowCredentialsList: PublicKeyCredentialDescriptor[] | undefined = undefined;
  try {
    const rawId = base64UrlToBuffer(registered.rawId || registered.credentialId);
    allowCredentialsList = [
      {
        id: rawId as any as BufferSource,
        type: 'public-key',
        transports: ['internal'],
      },
    ];
  } catch {
    // If decoding fails, continue without explicit ID restriction
  }

  // 1. Try server-verified WebAuthn flow
  try {
    const loginOpts = await api<{ challenge: string; timeout: number; userVerification: string }>(
      'POST',
      '/auth/webauthn/login-options'
    );

    const challengeBytes = base64UrlToBuffer(loginOpts.challenge);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes as any as BufferSource,
        allowCredentials: allowCredentialsList,
        userVerification: 'preferred',
        timeout: loginOpts.timeout || 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Biometric verification cancelled.');
    }

    const assertionResp = assertion.response as AuthenticatorAssertionResponse;
    const clientDataJSON = bufferToBase64Url(assertionResp.clientDataJSON);
    const authenticatorData = bufferToBase64Url(assertionResp.authenticatorData);
    const signature = bufferToBase64Url(assertionResp.signature);

    const verifyRes = await api<{
      success: boolean;
      token?: string;
      csrfToken?: string;
      user: any;
    }>('POST', '/auth/webauthn/login-verify', {
      credentialId: registered.credentialId,
      expectedChallenge: loginOpts.challenge,
      clientDataJSON,
      authenticatorData,
      signature,
    });

    if (verifyRes.token) {
      setAuthToken(verifyRes.token);
    }

    return {
      ...registered,
      alreadyVerified: true,
      verificationResult: verifyRes,
    };
  } catch (err: any) {
    console.warn('[WebAuthn server assertion fallback]:', err?.message || err);

    // If server WebAuthn assertion was cancelled by user, throw immediately
    if (err?.name === 'NotAllowedError' || err?.message?.includes('cancelled')) {
      throw new Error('Biometric verification cancelled.');
    }

    // Fallback: local prompt + deviceToken
    if (!registered.deviceToken) {
      throw new Error(
        'Biometric credentials need to be re-authorized. Please sign in with your password to re-enable fingerprint unlock.'
      );
    }

    const localChallenge = new Uint8Array(32);
    window.crypto.getRandomValues(localChallenge);

    const localAssertion = await navigator.credentials.get({
      publicKey: {
        challenge: localChallenge as any as BufferSource,
        allowCredentials: allowCredentialsList,
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    if (!localAssertion) {
      throw new Error('Biometric verification cancelled.');
    }

    return registered;
  }
}
