// Web Crypto API helpers

/**
 * Client-side encryption using Web Crypto API
 * Provides secure encryption/decryption in the browser
 */

/**
 * Generate a key from a password using PBKDF2
 * @param {string} password - Password to derive key from
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
async function deriveKeyFromPassword(password, salt) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt
 * @returns {Uint8Array} Random salt (16 bytes)
 */
function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate a random IV (Initialization Vector)
 * @returns {Uint8Array} Random IV (12 bytes for AES-GCM)
 */
function generateIV() {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt data using Web Crypto API (AES-GCM)
 * @param {string} data - Data to encrypt
 * @param {string} password - Password for encryption
 * @returns {Promise<string>} Encrypted data (base64 encoded, includes salt and IV)
 */
export async function encrypt(data, password) {
  if (!data) {
    throw new Error('Data is required for encryption');
  }
  if (!password) {
    throw new Error('Password is required for encryption');
  }

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKeyFromPassword(password, salt);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Combine salt, iv, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using Web Crypto API (AES-GCM)
 * @param {string} encryptedData - Encrypted data (base64 encoded, includes salt and IV)
 * @param {string} password - Password for decryption
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
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKeyFromPassword(password, salt);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt an object (converts to JSON first)
 * @param {Object} obj - Object to encrypt
 * @param {string} password - Password for encryption
 * @returns {Promise<string>} Encrypted JSON string
 */
export async function encryptObject(obj, password) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Object is required for encryption');
  }

  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString, password);
}

/**
 * Decrypt an object (decrypts JSON string and parses)
 * @param {string} encryptedData - Encrypted JSON string
 * @param {string} password - Password for decryption
 * @returns {Promise<Object>} Decrypted object
 */
export async function decryptObject(encryptedData, password) {
  const decryptedString = await decrypt(encryptedData, password);

  try {
    return JSON.parse(decryptedString);
  } catch (error) {
    throw new Error(`Failed to parse decrypted data: ${error.message}`);
  }
}

/**
 * Hash data using Web Crypto API (SHA-256)
 * @param {string} data - Data to hash
 * @returns {Promise<string>} Hashed data (hex string)
 */
export async function hash(data) {
  if (!data) {
    throw new Error('Data is required for hashing');
  }

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Generate a random encryption key
 * @param {number} length - Key length in bytes (default: 32)
 * @returns {string} Random key (base64 encoded)
 */
export function generateKey(length = 32) {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...randomBytes));
}
