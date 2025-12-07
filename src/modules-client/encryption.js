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
 * @param {Object} debugLogger - Optional logger for debugging
 * @returns {Promise<string>} Decrypted data
 */
export async function decrypt(encryptedData, password, debugLogger = null) {
  const log = debugLogger || {
    debug: () => {},
    error: () => {},
    warn: () => {},
  };

  if (!encryptedData) {
    const error = new Error('Encrypted data is required for decryption');
    log.error('   Decrypt validation: encryptedData is missing');
    throw error;
  }
  if (!password) {
    const error = new Error('Password is required for decryption');
    log.error('   Decrypt validation: password is missing');
    throw error;
  }

  try {
    log.debug(`   Decrypt input: encryptedData length=${encryptedData.length}, password length=${password.length}`);
    
    // Validate password format (should be hex string, 64 chars = 32 bytes)
    const isHex = /^[0-9a-fA-F]+$/.test(password);
    log.debug(`   Password format: ${isHex ? 'hex' : 'non-hex'}, length=${password.length} chars`);
    if (password.length !== 64) {
      log.warn(`   Password length is ${password.length}, expected 64 (32 bytes in hex)`);
    }
    
    // Decode from base64
    let combined;
    try {
      combined = Buffer.from(encryptedData, 'base64');
      log.debug(`   Base64 decoded: combined buffer length=${combined.length} bytes`);
    } catch (base64Error) {
      log.error(`   Base64 decode failed: ${base64Error.message}`);
      throw new Error(`Invalid base64 data: ${base64Error.message}`);
    }

    // Validate minimum size: salt (16) + IV (12) + auth tag (16) = 44 bytes minimum
    if (combined.length < 44) {
      const error = new Error(`Encrypted data too short: ${combined.length} bytes (minimum 44 bytes required)`);
      log.error(`   ${error.message}`);
      log.error(`   Expected format: [salt:16 bytes][IV:12 bytes][encrypted data + auth tag:16+ bytes]`);
      throw error;
    }

    // Extract salt, iv, and encrypted data
    // Format: [salt (16 bytes)][IV (12 bytes)][encrypted data with auth tag]
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    log.debug(`   Extracted components: salt=${salt.length} bytes, IV=${iv.length} bytes, encrypted=${encrypted.length} bytes`);

    // Validate encrypted data has auth tag (minimum 16 bytes for auth tag)
    if (encrypted.length < 16) {
      const error = new Error(`Encrypted data too short: ${encrypted.length} bytes (minimum 16 bytes for auth tag)`);
      log.error(`   ${error.message}`);
      throw error;
    }

    // Derive key from password using PBKDF2
    log.debug(`   Deriving key from password using PBKDF2 (100000 iterations, SHA-256)...`);
    let key;
    try {
      key = await deriveKeyFromPassword(password, salt);
      log.debug(`   Key derived successfully: ${key.length} bytes`);
    } catch (keyError) {
      log.error(`   Key derivation failed: ${keyError.message}`);
      throw new Error(`Key derivation failed: ${keyError.message}`);
    }

    // Extract auth tag (last 16 bytes of encrypted data for AES-GCM)
    const authTag = encrypted.slice(-16);
    const encryptedDataOnly = encrypted.slice(0, -16);

    log.debug(`   Auth tag: ${authTag.length} bytes, Encrypted data: ${encryptedDataOnly.length} bytes`);

    // Decrypt using AES-GCM
    log.debug(`   Creating decipher (AES-256-GCM)...`);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    log.debug(`   Decrypting data...`);
    let decrypted = decipher.update(encryptedDataOnly, null, 'utf8');
    decrypted += decipher.final('utf8');

    log.debug(`   Decryption successful: decrypted length=${decrypted.length} chars`);
    return decrypted;
  } catch (error) {
    // Provide more detailed error information
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    };

    log.error(`   Decryption error details:`, errorDetails);
    
    // Provide specific error messages for common issues
    if (error.message.includes('Unsupported state') || error.message.includes('unable to authenticate')) {
      log.error(`   Possible causes:`);
      log.error(`     1. Wrong DECRYPTION_KEY - the key doesn't match the one used for encryption`);
      log.error(`     2. Data was encrypted with a different key or method`);
      log.error(`     3. Encrypted data is corrupted or incomplete`);
      log.error(`     4. Auth tag mismatch - data may have been tampered with`);
    } else if (error.message.includes('Invalid base64')) {
      log.error(`   Possible causes:`);
      log.error(`     1. Encrypted data is not valid base64`);
      log.error(`     2. Data format is incorrect`);
    } else if (error.message.includes('too short')) {
      log.error(`   Possible causes:`);
      log.error(`     1. Encrypted data is incomplete`);
      log.error(`     2. Data format is incorrect (expected: salt + IV + encrypted data)`);
    }

    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Decrypt account password using client's decryption key
 * @param {string} encryptedPassword - Encrypted password from database
 * @param {string} decryptionKey - Client's DECRYPTION_KEY from config
 * @param {Object} debugLogger - Optional logger for debugging
 * @returns {Promise<string>} Decrypted password
 */
export async function decryptAccountPassword(encryptedPassword, decryptionKey, debugLogger = null) {
  return decrypt(encryptedPassword, decryptionKey, debugLogger);
}

