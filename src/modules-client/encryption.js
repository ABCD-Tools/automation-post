/**
 * Client-side encryption/decryption utilities for Node.js
 * Uses the same encryption format as web UI (AES-GCM with PBKDF2)
 */

import crypto from 'crypto';

/**
 * Derive key from password using PBKDF2
 * @param {string} password - Password to derive key from
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Promise<Buffer>} Derived encryption key
 */
async function deriveKeyFromPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Decrypt data using AES-GCM (compatible with web UI encryption)
 * @param {string} encryptedData - Encrypted data (base64 encoded, includes salt and IV)
 * @param {string} password - Password for decryption (client's DECRYPTION_KEY)
 * @returns {Promise<string>} Decrypted data
 */
export async function decrypt(encryptedData, password) {
  if (!encryptedData) {
    throw new Error('Encrypted data is required for decryption');
  }
  if (!password) {
    throw new Error('Password is required for decryption');
  }

  try {
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract salt, iv, and encrypted data
    // Format: [salt (16 bytes)][IV (12 bytes)][encrypted data with auth tag]
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    // Derive key from password using PBKDF2
    const key = await deriveKeyFromPassword(password, salt);

    // Extract auth tag (last 16 bytes of encrypted data for AES-GCM)
    const authTag = encrypted.slice(-16);
    const encryptedDataOnly = encrypted.slice(0, -16);

    // Decrypt using AES-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedDataOnly, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Decrypt account password using client's decryption key
 * @param {string} encryptedPassword - Encrypted password from database
 * @param {string} decryptionKey - Client's DECRYPTION_KEY from config
 * @returns {Promise<string>} Decrypted password
 */
export async function decryptAccountPassword(encryptedPassword, decryptionKey) {
  return decrypt(encryptedPassword, decryptionKey);
}

