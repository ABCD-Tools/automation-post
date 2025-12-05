// Server-side encryption (AES)

import CryptoJS from 'crypto-js';

/**
 * Get encryption key from environment variable
 * Falls back to a default key if not set (for development only)
 * @returns {string} Encryption key
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || process.env.SUPABASE_ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set, using default key (NOT SECURE FOR PRODUCTION)');
    return 'abcdefghijklmnopqrstuvwxyz1234567890';
  }
  return key;
}

/**
 * Encrypt data using AES encryption
 * @param {string} data - Data to encrypt
 * @param {string} key - Optional encryption key (uses env key if not provided)
 * @returns {string} Encrypted data (base64 encoded)
 */
export function encrypt(data, key = null) {
  if (!data) {
    throw new Error('Data is required for encryption');
  }

  const encryptionKey = key || getEncryptionKey();
  const encrypted = CryptoJS.AES.encrypt(String(data), encryptionKey).toString();
  return encrypted;
}

/**
 * Decrypt data using AES decryption
 * @param {string} encryptedData - Encrypted data (base64 encoded)
 * @param {string} key - Optional decryption key (uses env key if not provided)
 * @returns {string} Decrypted data
 */
export function decrypt(encryptedData, key = null) {
  if (!encryptedData) {
    throw new Error('Encrypted data is required for decryption');
  }

  const encryptionKey = key || getEncryptionKey();
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    
    return decryptedString;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt an object (converts to JSON first)
 * @param {Object} obj - Object to encrypt
 * @param {string} key - Optional encryption key
 * @returns {string} Encrypted JSON string
 */
export function encryptObject(obj, key = null) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Object is required for encryption');
  }
  
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString, key);
}

/**
 * Decrypt an object (decrypts JSON string and parses)
 * @param {string} encryptedData - Encrypted JSON string
 * @param {string} key - Optional decryption key
 * @returns {Object} Decrypted object
 */
export function decryptObject(encryptedData, key = null) {
  const decryptedString = decrypt(encryptedData, key);
  
  try {
    return JSON.parse(decryptedString);
  } catch (error) {
    throw new Error(`Failed to parse decrypted data: ${error.message}`);
  }
}

/**
 * Hash data using SHA256 (one-way, cannot be decrypted)
 * @param {string} data - Data to hash
 * @returns {string} Hashed data (hex string)
 */
export function hash(data) {
  if (!data) {
    throw new Error('Data is required for hashing');
  }
  
  return CryptoJS.SHA256(String(data)).toString();
}

/**
 * Generate a random encryption key
 * @param {number} length - Key length in bytes (default: 32)
 * @returns {string} Random key (hex string)
 */
export function generateKey(length = 32) {
  return CryptoJS.lib.WordArray.random(length).toString();
}
