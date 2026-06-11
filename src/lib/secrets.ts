import crypto from 'node:crypto';

// Use a secure fallback for POC, in production this must be set in ENV
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET_KEY || '12345678901234567890123456789012'; // 32 bytes
const ALGORITHM_GCM = 'aes-256-gcm';
const ALGORITHM_CBC = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encryptSecret(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM_GCM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(encryptedText: string): string {
  const parts = encryptedText.split(':');
  
  if (parts.length === 3) {
    // aes-256-gcm format: iv:authTag:encrypted
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM_GCM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } else if (parts.length === 2) {
    // Legacy aes-256-cbc format: iv:encrypted
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM_CBC, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  throw new Error('Invalid encrypted text format');
}

export function maskSecretValue(text: string): string {
  if (!text) return text;
  return '********';
}
