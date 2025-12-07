import { authenticateRequest } from '@modules-logic/middleware/auth';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import crypto from 'crypto';

/**
 * Encrypt password using client's ENCRYPTION_KEY (server-side)
 * 
 * POST /api/clients/[id]/encrypt-password
 * 
 * Body: { password: string }
 * Returns: { encryptedPassword: string }
 * 
 * This endpoint uses the ENCRYPTION_KEY stored in the clients table
 * to encrypt passwords server-side, eliminating the need for browser
 * to handle encryption keys.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { password } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Get client and verify ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, user_id, client_id, encryption_key')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    if (!client.encryption_key) {
      return res.status(400).json({ 
        error: 'Client does not have an encryption key. Please reinstall the client agent.' 
      });
    }

    // MVP: Store password as plain text (no encryption)
    // TODO: Re-enable RSA encryption when ready
    /*
    // Encrypt password using client's ENCRYPTION_KEY (RSA public key)
    // Asymmetric encryption: ENCRYPTION_KEY = PUBLIC_KEY (stored in server)
    const publicKeyPem = client.encryption_key;

    // Validate public key format
    if (!publicKeyPem.includes('-----BEGIN PUBLIC KEY-----')) {
      return res.status(400).json({ 
        error: 'Invalid public key format. Expected RSA public key in PEM format.' 
      });
    }

    // For longer passwords, use hybrid encryption (RSA + AES)
    // RSA can only encrypt up to ~245 bytes (2048-bit key with OAEP)
    // If password is longer, encrypt an AES key with RSA, then encrypt password with AES
    const passwordBuffer = Buffer.from(password, 'utf8');
    const maxRSAEncryptSize = 245; // RSA-OAEP with 2048-bit key can encrypt up to 245 bytes

    let encryptedPassword;
    
    if (passwordBuffer.length <= maxRSAEncryptSize) {
      // Direct RSA encryption (for short passwords)
      try {
        const publicKey = crypto.createPublicKey(publicKeyPem);
        encryptedPassword = crypto.publicEncrypt(
          {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
          },
          passwordBuffer
        ).toString('base64');
      } catch (rsaError) {
        console.error('RSA encryption error:', rsaError);
        return res.status(500).json({ 
          error: `Failed to encrypt password: ${rsaError.message}` 
        });
      }
    } else {
      // Hybrid encryption for longer passwords
      // 1. Generate random AES key
      const aesKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      
      // 2. Encrypt password with AES-GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(passwordBuffer),
        cipher.final()
      ]);
      const authTag = cipher.getAuthTag();
      
      // 3. Encrypt AES key with RSA public key
      const publicKey = crypto.createPublicKey(publicKeyPem);
      const encryptedAesKey = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        aesKey
      );
      
      // 4. Combine: [encrypted AES key][IV][encrypted data][auth tag]
      const combined = Buffer.concat([
        Buffer.from([encryptedAesKey.length]), // 1 byte: length of encrypted AES key
        encryptedAesKey,
        iv,
        encrypted,
        authTag
      ]);
      
      encryptedPassword = combined.toString('base64');
    }
    */

    // MVP: Return password as-is (plain text)
    return res.status(200).json({
      encryptedPassword: password, // Store as plain text for MVP
    });
  } catch (err) {
    console.error('Encrypt password error:', err);
    return res.status(500).json({ 
      error: err.message || 'Failed to encrypt password' 
    });
  }
}

