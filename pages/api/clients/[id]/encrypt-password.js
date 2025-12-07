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

    // Encrypt password using client's ENCRYPTION_KEY
    // Use the same encryption method as client-side (AES-GCM with PBKDF2)
    const encryptionKey = client.encryption_key;

    // Generate salt and IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    // Derive key from encryption key using PBKDF2
    const derivedKey = await new Promise((resolve, reject) => {
      crypto.pbkdf2(encryptionKey, salt, 100000, 32, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    // Encrypt using AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(password, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    // Combine: salt (16 bytes) + IV (12 bytes) + encrypted data + auth tag (16 bytes)
    const combined = Buffer.concat([salt, iv, encrypted, authTag]);

    // Convert to base64
    const encryptedPassword = combined.toString('base64');

    return res.status(200).json({
      encryptedPassword,
    });
  } catch (err) {
    console.error('Encrypt password error:', err);
    return res.status(500).json({ 
      error: err.message || 'Failed to encrypt password' 
    });
  }
}

