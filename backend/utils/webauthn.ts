import { randomBytes, createHash, createVerify } from 'crypto';
import sql from '../db/index';

/**
 * Base64URL encoding/decoding utilities for WebAuthn binary structures.
 */
export function bufferToBase64Url(buffer: Buffer | Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url: string): Buffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

/**
 * Generate a random 32-byte cryptographic challenge and persist it with 5-minute expiry.
 */
export async function createWebAuthnChallenge(
  type: 'registration' | 'authentication',
  userId?: string | null
): Promise<string> {
  const challenge = bufferToBase64Url(randomBytes(32));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await sql`
    INSERT INTO webauthn_challenges (user_id, challenge, type, expires_at)
    VALUES (${userId || null}, ${challenge}, ${type}, ${expiresAt.toISOString()})
  `;

  return challenge;
}

/**
 * Validate and consume a cryptographic challenge (prevents replay).
 */
export async function consumeWebAuthnChallenge(
  challenge: string,
  type: 'registration' | 'authentication',
  userId?: string | null
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM webauthn_challenges
    WHERE challenge = ${challenge}
      AND type = ${type}
      AND expires_at > NOW()
      ${userId ? sql`AND (user_id = ${userId} OR user_id IS NULL)` : sql``}
    RETURNING id
  `;

  return rows.length > 0;
}

/**
 * Verify WebAuthn registration response and extract credential ID and public key.
 */
export async function verifyRegistrationResponse(params: {
  userId: string;
  expectedChallenge: string;
  clientDataJSON: string;
  credentialId: string;
  publicKey: string;
  deviceName?: string;
  transports?: string[];
}): Promise<{ id: string; credentialId: string }> {
  const { userId, expectedChallenge, clientDataJSON, credentialId, publicKey, deviceName, transports } = params;

  // 1. Verify clientDataJSON
  const clientDataBuf = base64UrlToBuffer(clientDataJSON);
  const clientData = JSON.parse(clientDataBuf.toString('utf8'));

  if (clientData.type !== 'webauthn.create') {
    throw new Error('Invalid clientData type for registration');
  }

  if (clientData.challenge !== expectedChallenge) {
    throw new Error('Challenge mismatch during registration');
  }

  // 2. Consume challenge
  const valid = await consumeWebAuthnChallenge(expectedChallenge, 'registration', userId);
  if (!valid) {
    throw new Error('WebAuthn challenge expired or already consumed');
  }

  // 3. Store credential in database
  const rows = await sql`
    INSERT INTO webauthn_credentials
      (user_id, credential_id, public_key, counter, device_name, transports, is_revoked)
    VALUES
      (${userId}, ${credentialId}, ${publicKey}, 0, ${deviceName || 'Biometric Device'},
       ${transports ? JSON.stringify(transports) : null}, FALSE)
    ON CONFLICT (credential_id)
    DO UPDATE SET
      public_key = ${publicKey},
      counter = 0,
      is_revoked = FALSE,
      last_used_at = NOW()
    RETURNING id, credential_id AS "credentialId"
  `;

  return rows[0];
}

/**
 * Verify WebAuthn authentication assertion signature.
 */
export async function verifyAuthenticationResponse(params: {
  credentialId: string;
  expectedChallenge: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle?: string;
}): Promise<{ userId: string; credentialRecordId: string }> {
  const { credentialId, expectedChallenge, clientDataJSON, authenticatorData, signature } = params;

  // 1. Find credential record
  const creds = await sql`
    SELECT id, user_id, public_key, counter, is_revoked
    FROM webauthn_credentials
    WHERE credential_id = ${credentialId}
    LIMIT 1
  `;

  if (!creds.length) {
    throw new Error('WebAuthn credential not found on server');
  }

  const cred = creds[0];
  if (cred.is_revoked) {
    throw new Error('This biometric device credential has been revoked');
  }

  // 2. Verify clientDataJSON
  const clientDataBuf = base64UrlToBuffer(clientDataJSON);
  const clientData = JSON.parse(clientDataBuf.toString('utf8'));

  if (clientData.type !== 'webauthn.get') {
    throw new Error('Invalid clientData type for authentication');
  }

  if (clientData.challenge !== expectedChallenge) {
    throw new Error('Challenge mismatch during authentication');
  }

  // 3. Consume challenge
  const validChallenge = await consumeWebAuthnChallenge(expectedChallenge, 'authentication');
  if (!validChallenge) {
    throw new Error('WebAuthn challenge expired or already consumed');
  }

  // 4. Authenticator data & sign counter check
  const authDataBuf = base64UrlToBuffer(authenticatorData);
  // Flags byte is at index 32
  const flags = authDataBuf[32];
  const userPresent = (flags & 0x01) !== 0;
  if (!userPresent) {
    throw new Error('User presence check flag not asserted by authenticator');
  }

  // Sign counter is 4-byte big-endian integer at offset 33-37
  const newCounter = authDataBuf.readUInt32BE(33);
  if (newCounter > 0 && newCounter <= cred.counter) {
    throw new Error('Potential authenticator cloning / replay detected (counter did not increase)');
  }

  // 5. Verify cryptographic signature if public key is in PEM/SPKI format
  const clientDataHash = createHash('sha256').update(clientDataBuf).digest();
  const signedData = Buffer.concat([authDataBuf, clientDataHash]);
  const signatureBuf = base64UrlToBuffer(signature);

  if (cred.public_key.includes('BEGIN PUBLIC KEY')) {
    const verifier = createVerify('SHA256');
    verifier.update(signedData);
    const signatureValid = verifier.verify(cred.public_key, signatureBuf);
    if (!signatureValid) {
      throw new Error('Cryptographic signature verification failed');
    }
  }

  // 6. Update counter and last_used_at
  await sql`
    UPDATE webauthn_credentials
    SET counter = ${newCounter},
        last_used_at = NOW()
    WHERE id = ${cred.id}
  `;

  return { userId: cred.user_id, credentialRecordId: cred.id };
}
