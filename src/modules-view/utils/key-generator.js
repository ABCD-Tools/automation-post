/**
 * RSA Key Pair Generation Utility
 * 
 * Generate RSA key pairs in browser using Web Crypto API
 * Returns: { encryptionKey: string (public key, PEM format), decryptionKey: string (private key, PEM format) }
 * 
 * ENCRYPTION_KEY = PUBLIC_KEY (stored in server database)
 * DECRYPTION_KEY = PRIVATE_KEY (stored in client .env, never sent to server)
 */

/**
 * Generate RSA key pair (asymmetric encryption)
 * Uses Web Crypto API to generate RSA-OAEP key pair
 * 
 * @returns {Promise<{encryptionKey: string, decryptionKey: string}>}
 *   encryptionKey: Public key in PEM format (for encryption, stored in server)
 *   decryptionKey: Private key in PEM format (for decryption, stored in client .env)
 */
export async function generateAESKey() {
  try {
    // Check for Web Crypto API availability
    const webCrypto = window.crypto || window.msCrypto;
    if (!webCrypto || !webCrypto.subtle) {
      throw new Error('Web Crypto API is not available. Please use a modern browser.');
    }

    // Generate RSA-OAEP key pair (2048-bit, suitable for encrypting passwords)
    const keyPair = await webCrypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048, // 2048-bit key
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // Export public key (ENCRYPTION_KEY) to PEM format
    const publicKeyData = await webCrypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyPem = arrayBufferToPEM(publicKeyData, 'PUBLIC KEY');
    
    // Export private key (DECRYPTION_KEY) to PEM format
    const privateKeyData = await webCrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyPem = arrayBufferToPEM(privateKeyData, 'PRIVATE KEY');

    return {
      encryptionKey: publicKeyPem,   // PUBLIC_KEY (stored in server)
      decryptionKey: privateKeyPem,  // PRIVATE_KEY (stored in client .env)
    };
  } catch (error) {
    console.error('Failed to generate RSA key pair:', error);
    throw new Error('Failed to generate encryption keys. Please try again.');
  }
}

/**
 * Convert ArrayBuffer to PEM format
 * @param {ArrayBuffer} buffer - Key data
 * @param {string} type - Key type ('PUBLIC KEY' or 'PRIVATE KEY')
 * @returns {string} PEM formatted key
 */
function arrayBufferToPEM(buffer, type) {
  const bytes = new Uint8Array(buffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  const chunks = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${chunks.join('\n')}\n-----END ${type}-----`;
}

/**
 * Validate encryption key format (RSA public key in PEM format)
 * @param {string} key - Key to validate
 * @returns {boolean}
 */
export function validateKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Must be PEM format
  if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
    return false;
  }
  
  // Check for public key format
  if (key.includes('BEGIN PUBLIC KEY') && key.includes('END PUBLIC KEY')) {
    return true;
  }
  
  // Check for private key format
  if (key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY')) {
    return true;
  }
  
  return false;
}

/**
 * Validate both encryption and decryption keys
 */
export function validateKeys(encryptionKey, decryptionKey) {
  const errors = [];
  
  if (!validateKey(encryptionKey)) {
    errors.push('Encryption key must be a valid RSA public key in PEM format');
  } else if (!encryptionKey.includes('PUBLIC KEY')) {
    errors.push('Encryption key must be a public key (PUBLIC KEY)');
  }
  
  if (!validateKey(decryptionKey)) {
    errors.push('Decryption key must be a valid RSA private key in PEM format');
  } else if (!decryptionKey.includes('PRIVATE KEY')) {
    errors.push('Decryption key must be a private key (PRIVATE KEY)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

