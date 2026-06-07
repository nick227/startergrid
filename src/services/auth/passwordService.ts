import { hash, verify } from '@node-rs/argon2';

export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return hash(password);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    // Returns false for invalid hash format (e.g. Phase A placeholder sentinels)
    return false;
  }
}
