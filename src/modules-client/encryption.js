/**
 * Client-side decryption utilities for Node.js
 * Uses RSA asymmetric decryption (DECRYPTION_KEY = PRIVATE_KEY)
 */

import crypto from 'crypto';

/**
 * Decrypt data using RSA private key (asymmetric decryption)
 * @param {string} encryptedData - Encrypted data (base64 encoded)
 * @param {string} privateKeyPem - Private key in PEM format (client's DECRYPTION_KEY)
 * @param {Object} debugLogger - Optional logger for debugging
 * @returns {Promise<string>} Decrypted data
 */
export async function decrypt(encryptedData, privateKeyPem, debugLogger = null) {
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
  if (!privateKeyPem) {
    const error = new Error('Private key is required for decryption');
    log.error('   Decrypt validation: privateKeyPem is missing');
    throw error;
  }

  try {
    log.debug(`   Decrypt input: encryptedData length=${encryptedData.length} chars, privateKey length=${privateKeyPem.length} chars`);
    
    // Validate private key format
    if (!privateKeyPem.includes('-----BEGIN PRIVATE KEY-----')) {
      log.error(`   Invalid private key format: expected PEM format with 'BEGIN PRIVATE KEY'`);
      throw new Error('Invalid private key format. Expected RSA private key in PEM format.');
    }
    
    // Decode from base64
    let encryptedBuffer;
    try {
      encryptedBuffer = Buffer.from(encryptedData, 'base64');
      log.debug(`   Base64 decoded: buffer length=${encryptedBuffer.length} bytes`);
    } catch (base64Error) {
      log.error(`   Base64 decode failed: ${base64Error.message}`);
      throw new Error(`Invalid base64 data: ${base64Error.message}`);
    }

    // Check if this is hybrid encryption (first byte indicates encrypted AES key length)
    // Format: [1 byte: aesKeyLength][encrypted AES key][IV:12 bytes][encrypted data][auth tag:16 bytes]
    // OR direct RSA encryption (just RSA-encrypted data)
    
    let decrypted;
    
    if (encryptedBuffer.length > 256 && encryptedBuffer[0] > 0 && encryptedBuffer[0] < 256) {
      // Hybrid encryption detected (first byte is length of encrypted AES key)
      log.debug(`   Detected hybrid encryption (RSA + AES-GCM)`);
      
      const aesKeyLength = encryptedBuffer[0];
      const encryptedAesKey = encryptedBuffer.slice(1, 1 + aesKeyLength);
      const iv = encryptedBuffer.slice(1 + aesKeyLength, 1 + aesKeyLength + 12);
      const encrypted = encryptedBuffer.slice(1 + aesKeyLength + 12);
      const authTag = encrypted.slice(-16);
      const encryptedDataOnly = encrypted.slice(0, -16);

      log.debug(`   Extracted: encrypted AES key=${encryptedAesKey.length} bytes, IV=${iv.length} bytes, encrypted data=${encryptedDataOnly.length} bytes, auth tag=${authTag.length} bytes`);

      // 1. Decrypt AES key with RSA private key
      log.debug(`   Decrypting AES key with RSA private key...`);
      const privateKey = crypto.createPrivateKey(privateKeyPem);
      const aesKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedAesKey
      );

      log.debug(`   AES key decrypted: ${aesKey.length} bytes`);

      // 2. Decrypt password with AES-GCM
      log.debug(`   Decrypting password with AES-GCM...`);
      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
      decipher.setAuthTag(authTag);
      decrypted = decipher.update(encryptedDataOnly, null, 'utf8');
      decrypted += decipher.final('utf8');
    } else {
      // Direct RSA decryption
      log.debug(`   Detected direct RSA encryption`);
      
      const privateKey = crypto.createPrivateKey(privateKeyPem);
      const decryptedBuffer = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedBuffer
      );
      decrypted = decryptedBuffer.toString('utf8');
    }

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
    if (error.message.includes('decryption') || error.message.includes('decrypt')) {
      log.error(`   Possible causes:`);
      log.error(`     1. Wrong DECRYPTION_KEY (PRIVATE_KEY) - the private key doesn't match the public key used for encryption`);
      log.error(`     2. Data was encrypted with a different public key`);
      log.error(`     3. Encrypted data is corrupted or incomplete`);
      log.error(`     4. Private key format is invalid (expected RSA private key in PEM format)`);
    } else if (error.message.includes('Invalid base64')) {
      log.error(`   Possible causes:`);
      log.error(`     1. Encrypted data is not valid base64`);
      log.error(`     2. Data format is incorrect`);
    } else if (error.message.includes('too short') || error.message.includes('too long')) {
      log.error(`   Possible causes:`);
      log.error(`     1. Encrypted data is incomplete or corrupted`);
      log.error(`     2. Data format is incorrect`);
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

