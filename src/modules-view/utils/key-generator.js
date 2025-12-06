/**
 * AES Key Generation Utility
 * 
 * Generate AES encryption keys in browser using Web Crypto API
 * Returns: { encryptionKey: string (32-byte hex), decryptionKey: string (32-byte hex) }
 */

/**
 * Generate a random 32-byte hex string
 */
function generateRandomHex(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate AES encryption keys
 * Uses Web Crypto API to generate secure random keys
 * 
 * @returns {Promise<{encryptionKey: string, decryptionKey: string}>}
 */
export async function generateAESKey() {
  try {
    // Generate two independent 32-byte keys
    const encryptionKey = generateRandomHex(32);
    const decryptionKey = generateRandomHex(32);
    
    // Validate key length (32 bytes = 64 hex characters)
    if (encryptionKey.length !== 64 || decryptionKey.length !== 64) {
      throw new Error('Generated keys must be 32 bytes (64 hex characters)');
    }
    
    return {
      encryptionKey,
      decryptionKey,
    };
  } catch (error) {
    console.error('Failed to generate AES keys:', error);
    throw new Error('Failed to generate encryption keys. Please try again.');
  }
}

/**
 * Validate encryption key format
 * @param {string} key - Key to validate
 * @returns {boolean}
 */
export function validateKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Must be 32 bytes = 64 hex characters
  if (key.length !== 64) {
    return false;
  }
  
  // Must be valid hex
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    return false;
  }
  
  return true;
}

/**
 * Validate both encryption and decryption keys
 */
export function validateKeys(encryptionKey, decryptionKey) {
  const errors = [];
  
  if (!validateKey(encryptionKey)) {
    errors.push('Encryption key must be a 32-byte hex string (64 characters)');
  }
  
  if (!validateKey(decryptionKey)) {
    errors.push('Decryption key must be a 32-byte hex string (64 characters)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

