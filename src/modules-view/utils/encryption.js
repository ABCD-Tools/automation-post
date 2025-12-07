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
  if (typeof window === 'undefined') {
    throw new Error('deriveKeyFromPassword can only be used in browser environment');
  }

  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.subtle) {
    throw new Error('Web Crypto API is not available. Please use HTTPS or a modern browser.');
  }

  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const keyMaterial = await webCrypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return webCrypto.subtle.deriveKey(
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
  if (typeof window === 'undefined') {
    throw new Error('generateSalt can only be used in browser environment');
  }
  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.getRandomValues) {
    throw new Error('Crypto API is not available.');
  }
  return webCrypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate a random IV (Initialization Vector)
 * @returns {Uint8Array} Random IV (12 bytes for AES-GCM)
 */
function generateIV() {
  if (typeof window === 'undefined') {
    throw new Error('generateIV can only be used in browser environment');
  }
  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.getRandomValues) {
    throw new Error('Crypto API is not available.');
  }
  return webCrypto.getRandomValues(new Uint8Array(12));
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

  if (typeof window === 'undefined') {
    throw new Error('Encrypt function can only be used in browser environment');
  }

  // Check for Web Crypto API availability
  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.subtle) {
    throw new Error('Web Crypto API is not available. Please use HTTPS or a modern browser that supports Web Crypto API.');
  }

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKeyFromPassword(password, salt);

    const encryptedData = await webCrypto.subtle.encrypt(
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
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}. Web Crypto API may not be available.`);
  }
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

  if (typeof window === 'undefined') {
    throw new Error('Hash function can only be used in browser environment');
  }

  // Check for Web Crypto API availability
  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.subtle) {
    throw new Error('Web Crypto API is not available. Please use HTTPS or a modern browser that supports Web Crypto API.');
  }

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const hashBuffer = await webCrypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    throw new Error(`Hashing failed: ${error.message}. Web Crypto API may not be available.`);
  }
}

/**
 * Generate a random encryption key
 * @param {number} length - Key length in bytes (default: 32)
 * @returns {string} Random key (base64 encoded)
 */
export function generateKey(length = 32) {
  if (typeof window === 'undefined') {
    throw new Error('generateKey can only be used in browser environment');
  }

  // Check for Web Crypto API availability
  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.getRandomValues) {
    throw new Error('Crypto API is not available. Please use HTTPS or a modern browser that supports Web Crypto API.');
  }

  try {
    const randomBytes = webCrypto.getRandomValues(new Uint8Array(length));
    return btoa(String.fromCharCode(...randomBytes));
  } catch (error) {
    throw new Error(`Key generation failed: ${error.message}. Crypto API may not be available.`);
  }
}

/**
 * Get or generate master encryption key for account passwords
 * Uses auth token to derive a consistent key per user
 * @returns {Promise<string>} Master encryption key
 */
export async function getMasterEncryptionKey() {
  if (typeof window === 'undefined') {
    throw new Error('Master encryption key can only be accessed in browser');
  }

  // Check for Web Crypto API availability first
  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.subtle) {
    throw new Error('Web Crypto API is not available. Please access this page over HTTPS (secure connection) or use a modern browser that supports Web Crypto API.');
  }

  // Try to get from localStorage first
  const storedKey = localStorage.getItem('account_master_key');
  if (storedKey) {
    return storedKey;
  }

  // Generate key from auth token if available
  const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (authToken) {
    try {
      // Hash the auth token to create a consistent master key
      const key = await hash(authToken);
      localStorage.setItem('account_master_key', key);
      return key;
    } catch (error) {
      // If hashing fails, fall back to random key
      console.warn('Failed to hash auth token, using random key:', error.message);
      const randomKey = generateKey(32);
      localStorage.setItem('account_master_key', randomKey);
      return randomKey;
    }
  }

  // Fallback: generate a random key (user will need to re-enter passwords if they clear storage)
  const randomKey = generateKey(32);
  localStorage.setItem('account_master_key', randomKey);
  return randomKey;
}

/**
 * Encrypt account password using master key
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Encrypted password
 */
export async function encryptAccountPassword(password) {
  const masterKey = await getMasterEncryptionKey();
  return encrypt(password, masterKey);
}

/**
 * Decrypt client encryption key from server response
 * The key is encrypted with a session key derived from auth token
 * @param {string} encryptedKey - Encrypted key from server (format: "iv:encrypted")
 * @param {string} authToken - User's auth token
 * @param {string} userId - User ID
 * @returns {Promise<string>} Decrypted encryption key
 */
export async function decryptClientEncryptionKey(encryptedKey, authToken, userId) {
  if (!encryptedKey || !authToken || !userId) {
    throw new Error('Encrypted key, auth token, and user ID are required');
  }

  if (typeof window === 'undefined') {
    throw new Error('decryptClientEncryptionKey can only be used in browser environment');
  }

  const webCrypto = window.crypto || window.msCrypto;
  if (!webCrypto || !webCrypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  try {
    // Derive session key from auth token (same as server)
    const encoder = new TextEncoder();
    const sessionKeyData = encoder.encode(authToken + userId);
    const sessionKeyHash = await webCrypto.subtle.digest('SHA-256', sessionKeyData);
    const sessionKeyBuffer = new Uint8Array(sessionKeyHash).slice(0, 32);

    // Parse IV and encrypted data
    const [ivHex, encryptedHex] = encryptedKey.split(':');
    if (!ivHex || !encryptedHex) {
      throw new Error('Invalid encrypted key format');
    }

    const iv = Uint8Array.from(ivHex.match(/.{1,2}/g) || [], byte => parseInt(byte, 16));
    const encrypted = Uint8Array.from(encryptedHex.match(/.{1,2}/g) || [], byte => parseInt(byte, 16));

    // Import session key
    const key = await webCrypto.subtle.importKey(
      'raw',
      sessionKeyBuffer,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await webCrypto.subtle.decrypt(
      { name: 'AES-CBC', iv: iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error(`Failed to decrypt client encryption key: ${error.message}`);
  }
}

/**
 * Encrypt account password using client's encryption key
 * @param {string} password - Plain text password
 * @param {string} clientEncryptionKey - Client's encryption key (hex string)
 * @returns {Promise<string>} Encrypted password
 */
export async function encryptAccountPasswordWithClientKey(password, clientEncryptionKey) {
  if (!password || !clientEncryptionKey) {
    throw new Error('Password and client encryption key are required');
  }

  // Convert hex key to string for use with PBKDF2
  // The client key is a hex string, but we need to use it as a password for PBKDF2
  // We'll use it directly as the password parameter
  return encrypt(password, clientEncryptionKey);
}