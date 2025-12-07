import { authenticateRequest } from '@modules-logic/middleware/auth';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import crypto from 'crypto';

/**
 * Get client encryption key (encrypted with user's session)
 * 
 * GET /api/clients/[id]/encryption-key
 * 
 * Returns the client's encryption key encrypted with a key derived from the user's auth token.
 * This allows the web UI to decrypt it client-side and use it for account encryption.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Get client and verify ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, user_id, client_id, encrypted_encryption_key')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    // If we have the encrypted key stored, return it
    if (client.encrypted_encryption_key) {
      return res.status(200).json({
        encryptedKey: client.encrypted_encryption_key,
      });
    }

    // If not stored, try to get it from installer_downloads
    // Find the installer_downloads record for this client
    const { data: downloadRecord, error: downloadError } = await supabase
      .from('installer_downloads')
      .select('metadata')
      .eq('client_id', client.client_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (downloadError || !downloadRecord || !downloadRecord.metadata?.encryptionKey) {
      return res.status(404).json({ 
        error: 'Encryption key not found. Please reinstall the client agent.' 
      });
    }

    // Get the encryption key from metadata
    const encryptionKey = downloadRecord.metadata.encryptionKey;

    // Encrypt the key with a key derived from user's auth token
    // We'll use a simple approach: hash the auth token to create a session key
    const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
    if (!authToken) {
      return res.status(401).json({ error: 'Auth token required' });
    }

    // Derive encryption key from auth token
    const sessionKey = crypto
      .createHash('sha256')
      .update(authToken + user.id) // Add user ID for uniqueness
      .digest('hex');

    // Encrypt the client's encryption key with the session key
    // Using AES-256-CBC (simple encryption for this use case)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(sessionKey, 'hex').slice(0, 32), iv);
    let encrypted = cipher.update(encryptionKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combine IV and encrypted data
    const encryptedKey = iv.toString('hex') + ':' + encrypted;

    // Store encrypted key in clients table for future use
    await supabase
      .from('clients')
      .update({ encrypted_encryption_key: encryptedKey })
      .eq('id', id);

    return res.status(200).json({
      encryptedKey: encryptedKey,
    });
  } catch (err) {
    console.error('Get encryption key error:', err);
    return res.status(500).json({ 
      error: err.message || 'Failed to get encryption key' 
    });
  }
}

