import EncryptedStorage from 'react-native-encrypted-storage';
import type { AuthSession } from '../../types';

/**
 * Persists the auth session using react-native-encrypted-storage, per
 * the SDP-1 acceptance criterion: "JWT or token-based authentication
 * is stored securely on the mobile device."
 */
const SESSION_KEY = 'sdp.auth.session';

export async function saveSession(session: AuthSession): Promise<void> {
  await EncryptedStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | null> {
  const raw = await EncryptedStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as AuthSession) : null;
}

export async function clearSession(): Promise<void> {
  await EncryptedStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired(session: AuthSession): boolean {
  return Date.now() >= session.expiresAt;
}
