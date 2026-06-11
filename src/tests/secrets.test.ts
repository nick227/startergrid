import { describe, it, expect } from 'vitest';
import assert from 'node:assert';
import { encryptSecret, decryptSecret, maskSecretValue } from '../lib/secrets.js';
import crypto from 'node:crypto';

describe('secrets.ts', () => {
  it('encrypts and decrypts with aes-256-gcm', () => {
    const raw = 'my-super-secret-password-123';
    const encrypted = encryptSecret(raw);
    
    // Format should be iv:authTag:ciphertext
    const parts = encrypted.split(':');
    assert.equal(parts.length, 3);
    
    const decrypted = decryptSecret(encrypted);
    assert.equal(decrypted, raw);
  });

  it('fails decryption if tampered', () => {
    const raw = 'my-super-secret-password-123';
    const encrypted = encryptSecret(raw);
    
    const parts = encrypted.split(':');
    // Modify ciphertext
    parts[2] = parts[2].substring(0, parts[2].length - 1) + (parts[2].endsWith('a') ? 'b' : 'a');
    
    assert.throws(() => {
      decryptSecret(parts.join(':'));
    });
  });

  it('decrypts legacy aes-256-cbc format', () => {
    // Generate a CBC encrypted string manually
    const key = process.env.ENCRYPTION_SECRET_KEY || '12345678901234567890123456789012';
    const raw = 'legacy-secret';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(raw, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const legacyPayload = `${iv.toString('hex')}:${encrypted}`;

    const decrypted = decryptSecret(legacyPayload);
    assert.equal(decrypted, raw);
  });

  it('masks correctly', () => {
    assert.equal(maskSecretValue('foo'), '********');
    assert.equal(maskSecretValue(''), '');
  });
});
