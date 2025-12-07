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
    // Log raw key for debugging
    log.debug(`   [DEBUG] Raw privateKeyPem length: ${privateKeyPem.length} chars`);
    log.debug(`   [DEBUG] Raw privateKeyPem first 200 chars: ${JSON.stringify(privateKeyPem.substring(0, 200))}`);
    log.debug(`   [DEBUG] Raw privateKeyPem contains '\\n': ${privateKeyPem.includes('\n')}`);
    log.debug(`   [DEBUG] Raw privateKeyPem contains '\\\\n': ${privateKeyPem.includes('\\n')}`);
    log.debug(`   [DEBUG] Raw privateKeyPem contains 'BEGIN PRIVATE KEY': ${privateKeyPem.includes('-----BEGIN PRIVATE KEY-----')}`);
    log.debug(`   [DEBUG] Raw privateKeyPem contains 'END PRIVATE KEY': ${privateKeyPem.includes('-----END PRIVATE KEY-----')}`);
    
    // Normalize private key - ensure proper newlines for PEM format
    // dotenv may not preserve newlines correctly when reading from .env
    let normalizedKey = privateKeyPem;
    
    // Step 1: Replace escaped newlines (\\n -> \n)
    const beforeReplace = normalizedKey;
    normalizedKey = normalizedKey.replace(/\\n/g, '\n');
    if (beforeReplace !== normalizedKey) {
      log.debug(`   [DEBUG] Replaced escaped newlines (\\n -> actual newlines)`);
    }
    
    // Step 2: If key has BEGIN/END but no newlines, reconstruct PEM format
    if (normalizedKey.includes('-----BEGIN PRIVATE KEY-----') && normalizedKey.includes('-----END PRIVATE KEY-----')) {
      if (!normalizedKey.includes('\n')) {
        log.warn(`   ⚠️  Private key appears to be missing newlines - attempting to fix...`);
        log.debug(`   [DEBUG] Key before reconstruction: ${JSON.stringify(normalizedKey.substring(0, 100))}`);
        
        // Extract the base64 content between BEGIN and END
        const beginMarker = '-----BEGIN PRIVATE KEY-----';
        const endMarker = '-----END PRIVATE KEY-----';
        const beginIdx = normalizedKey.indexOf(beginMarker);
        const endIdx = normalizedKey.indexOf(endMarker);
        
        if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
          const beforeBegin = normalizedKey.substring(0, beginIdx);
          const afterEnd = normalizedKey.substring(endIdx + endMarker.length);
          const base64Content = normalizedKey.substring(beginIdx + beginMarker.length, endIdx).trim();
          
          // Reconstruct with proper newlines: BEGIN on its own line, base64 in 64-char lines, END on its own line
          const base64Lines = [];
          for (let i = 0; i < base64Content.length; i += 64) {
            base64Lines.push(base64Content.substring(i, i + 64));
          }
          
          normalizedKey = beforeBegin + 
            beginMarker + '\n' + 
            base64Lines.join('\n') + '\n' + 
            endMarker + 
            afterEnd;
          
          log.debug(`   [DEBUG] Reconstructed key with ${base64Lines.length} base64 lines`);
        }
      }
    }
    
    // Step 3: Clean up any issues
    normalizedKey = normalizedKey.trim();
    
    // Log normalized key for debugging
    log.debug(`   [DEBUG] Normalized key length: ${normalizedKey.length} chars`);
    log.debug(`   [DEBUG] Normalized key first 200 chars: ${JSON.stringify(normalizedKey.substring(0, 200))}`);
    log.debug(`   [DEBUG] Normalized key contains newlines: ${normalizedKey.includes('\n')}`);
    log.debug(`   [DEBUG] Normalized key line count: ${normalizedKey.split('\n').length}`);
    log.debug(`   [DEBUG] Normalized key first line: ${JSON.stringify(normalizedKey.split('\n')[0])}`);
    log.debug(`   [DEBUG] Normalized key last line: ${JSON.stringify(normalizedKey.split('\n').slice(-1)[0])}`);
    
    // Validate private key format
    if (!normalizedKey.includes('-----BEGIN PRIVATE KEY-----')) {
      log.error(`   [ERROR] Invalid private key format: expected PEM format with 'BEGIN PRIVATE KEY'`);
      log.error(`   [ERROR] Key preview: ${JSON.stringify(normalizedKey.substring(0, 200))}`);
      throw new Error('Invalid private key format. Expected RSA private key in PEM format.');
    }
    
    if (!normalizedKey.includes('-----END PRIVATE KEY-----')) {
      log.error(`   [ERROR] Invalid private key format: missing 'END PRIVATE KEY' marker`);
      log.error(`   [ERROR] Key preview: ${JSON.stringify(normalizedKey.substring(0, 200))}`);
      throw new Error('Invalid private key format. Missing END PRIVATE KEY marker.');
    }
    
    // Verify key has proper structure
    if (!normalizedKey.includes('\n')) {
      log.error(`   [ERROR] Private key still missing newlines after normalization`);
      throw new Error('Private key format is invalid: missing required newlines.');
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
      const privateKey = crypto.createPrivateKey(normalizedKey);
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
      
      const privateKey = crypto.createPrivateKey(normalizedKey);
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

