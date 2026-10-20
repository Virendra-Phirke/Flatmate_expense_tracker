import { api } from './api';

const BIOMETRIC_STORAGE_KEY = 'flatmate_biometric_auth';

export interface StoredBiometricCredential {
  credentialId: string;
  username: string;
  userId: string;
  deviceToken?: string;
  registeredAt: string;
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
 * Triggers Android/iOS biometric enrollment via navigator.credentials.create()
 * and retrieves a cryptographically signed device token from the backend.
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

  // Generate random 32-byte challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // User ID as bytes
  const enc = new TextEncoder();
  const userIdBytes = enc.encode(userId);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Flatmate Expense Manager',
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    },
    user: {
      id: userIdBytes,
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
    publicKey: publicKeyCredentialCreationOptions,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Biometric registration was cancelled or failed.');
  }

  // Obtain signed device enrollment token from backend for this authenticated session
  const enrollRes = await api<{ success: boolean; deviceToken: string }>('POST', '/auth/biometric-enroll', {
    credentialId: credential.id,
  });

  const stored: StoredBiometricCredential = {
    credentialId: credential.id,
    username,
    userId,
    deviceToken: enrollRes.deviceToken,
    registeredAt: new Date().toISOString(),
  };

  localStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));
  return true;
}

/**
 * Triggers Android/iOS biometric verification prompt via navigator.credentials.get()
 */
export async function authenticateWithBiometrics(): Promise<StoredBiometricCredential> {
  const registered = getRegisteredBiometric();
  if (!registered) {
    throw new Error('No fingerprint registered on this device.');
  }
  if (!registered.deviceToken) {
    throw new Error('Biometric credentials need to be re-authorized. Please sign in with your password to re-enable fingerprint unlock.');
  }

  const available = await isBiometricAvailable();
  if (!available) {
    throw new Error('Biometric sensor is not available.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // Parse credentialId to ArrayBuffer
  let allowCredentialsList: PublicKeyCredentialDescriptor[] | undefined = undefined;
  try {
    const rawId = Uint8Array.from(atob(registered.credentialId.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    allowCredentialsList = [
      {
        id: rawId,
        type: 'public-key',
        transports: ['internal'],
      },
    ];
  } catch {
    // If base64 decoding fails, allow fallback without explicit id
  }

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    ...(allowCredentialsList ? { allowCredentials: allowCredentialsList } : {}),
    userVerification: 'preferred',
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  if (!assertion) {
    throw new Error('Biometric verification cancelled.');
  }

  return registered;
}
