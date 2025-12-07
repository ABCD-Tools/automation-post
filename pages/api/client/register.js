import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import crypto from 'crypto';

/**
 * Client Registration API
 * 
 * Register client after installation
 * 
 * POST /api/client/register
 * Body: {
 *   downloadToken?: string,
 *   clientId: string,
 *   installPath: string,
 *   browserPath: string,
 *   platform: string,
 *   agentVersion: string
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      downloadToken,
      clientId,
      installPath,
      browserPath,
      platform,
      agentVersion,
    } = req.body;

    console.log('[DEBUG] Client registration request:', {
      clientId,
      hasDownloadToken: !!downloadToken,
      installPath,
      browserPath,
      platform,
      agentVersion,
    });

    // Validate required fields
    if (!clientId || !installPath || !browserPath || !platform) {
      console.error('[ERROR] Missing required fields:', {
        clientId: !!clientId,
        installPath: !!installPath,
        browserPath: !!browserPath,
        platform: !!platform,
      });
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['clientId', 'installPath', 'browserPath', 'platform'],
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    // If downloadToken provided, verify it and get user_id
    let userId = null;
    if (downloadToken) {
      console.log('[DEBUG] Verifying download token...');
      const { data: downloadRecord, error: downloadError } = await supabase
        .from('installer_downloads')
        .select('user_id, status, expires_at')
        .eq('download_token', downloadToken)
        .single();

      if (downloadError || !downloadRecord) {
        console.error('[ERROR] Invalid download token:', downloadError);
        return res.status(400).json({ error: 'Invalid download token' });
      }

      // Check if token expired
      if (new Date(downloadRecord.expires_at) < new Date()) {
        console.error('[ERROR] Download token expired');
        return res.status(400).json({ error: 'Download token has expired' });
      }

      userId = downloadRecord.user_id;
      console.log('[DEBUG] Download token verified, userId:', userId);
      // Note: client_id will be updated AFTER client is created in clients table
    } else {
      console.warn('[WARN] No download token provided');
    }

    // Get API token from Authorization header if provided
    let apiTokenFromHeader = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiTokenFromHeader = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Check if client already exists
    console.log('[DEBUG] Checking if client already exists...');
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id, user_id, api_token')
      .eq('client_id', clientId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, other errors are not
      console.error('[ERROR] Error checking client existence:', checkError);
      return res.status(500).json({ error: 'Database error while checking client' });
    }

    if (existingClient) {
      console.log('[DEBUG] Client exists, updating...');
      
      // Prepare update data
      const updateData = {
        install_path: installPath,
        browser_path: browserPath,
        platform: platform,
        agent_version: agentVersion,
        status: 'online',
        last_seen: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
      };

      // If client provided an API token in the header, update it in the database
      // This ensures the database token matches what the client has in its .env file
      if (apiTokenFromHeader) {
        if (existingClient.api_token !== apiTokenFromHeader) {
          console.log('[DEBUG] Updating API token to match client\'s .env file');
          updateData.api_token = apiTokenFromHeader;
          // Reset token expiration when updating token
          updateData.token_expires_at = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          console.log('[DEBUG] API token matches, no update needed');
        }
      }

      // If downloadToken provided and encryption_key is missing, try to get it from installer_downloads
      if (downloadToken && !existingClient.encryption_key) {
        console.log('[DEBUG] Encryption key missing, attempting to retrieve from installer_downloads...');
        const { data: downloadRecord, error: downloadRecordError } = await supabase
          .from('installer_downloads')
          .select('metadata')
          .eq('download_token', downloadToken)
          .eq('user_id', existingClient.user_id)
          .single();

        if (!downloadRecordError && downloadRecord?.metadata?.encryptionKey) {
          updateData.encryption_key = downloadRecord.metadata.encryptionKey;
          console.log('[DEBUG] Retrieved ENCRYPTION_KEY from installer_downloads');
        }
      }

      // Update existing client
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('client_id', clientId)
        .select()
        .single();

      if (updateError) {
        console.error('[ERROR] Update client error:', updateError);
        return res.status(500).json({ error: 'Failed to update client' });
      }

      console.log('[DEBUG] Client updated successfully');
      return res.status(200).json({
        message: 'Client updated successfully',
        client: updatedClient,
      });
    }

    console.log('[DEBUG] Client does not exist, creating new client...');

    // Create new client record
    // If userId not found from download token, we can't create client
    if (!userId) {
      console.error('[ERROR] Cannot register client without valid download token');
      return res.status(400).json({
        error: 'Cannot register client without valid download token or user authentication',
      });
    }

    // Get API token: prefer from Authorization header, otherwise generate new one
    let apiToken = null;
    if (apiTokenFromHeader) {
      // Use the token from the client's .env file
      apiToken = apiTokenFromHeader;
      console.log('[DEBUG] Using API token from client\'s Authorization header');
    } else {
      // Generate new token if client didn't provide one
      apiToken = `sk_${crypto.randomBytes(32).toString('hex')}`;
      console.log('[DEBUG] Generated new API token');
    }

    console.log('[DEBUG] Creating new client record...');
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        client_id: clientId,
        client_name: `Client ${clientId.substring(0, 8)}`,
        install_path: installPath,
        browser_path: browserPath,
        platform: platform,
        os_version: process.platform || 'windows',
        status: 'online',
        api_token: apiToken,
        token_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        installed_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        agent_version: agentVersion || '1.0.0',
        total_jobs: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('[ERROR] Create client error:', createError);
      return res.status(500).json({ error: 'Failed to create client record' });
    }

    console.log('[DEBUG] Client created successfully:', newClient.client_id);

    // Now that client exists, update installer_downloads with client_id
    // Also store encrypted encryption key in clients table
    if (downloadToken) {
      console.log('[DEBUG] Updating installer_downloads record...');
      
      // Get encryption key from installer_downloads metadata
      const { data: downloadRecord, error: downloadRecordError } = await supabase
        .from('installer_downloads')
        .select('metadata')
        .eq('download_token', downloadToken)
        .single();

      let encryptionKey = null;
      let encryptedEncryptionKey = null;
      if (!downloadRecordError && downloadRecord?.metadata?.encryptionKey) {
        encryptionKey = downloadRecord.metadata.encryptionKey;
        
        // Encrypt the encryption key with user's auth token for web UI use
        // This is used when the web UI needs to encrypt accounts
        const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
        if (authToken) {
          // Derive encryption key from auth token
          const sessionKey = crypto
            .createHash('sha256')
            .update(authToken + userId)
            .digest('hex');

          // Encrypt the client's encryption key with the session key
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(sessionKey, 'hex').slice(0, 32), iv);
          let encrypted = cipher.update(encryptionKey, 'utf8', 'hex');
          encrypted += cipher.final('hex');

          // Combine IV and encrypted data
          encryptedEncryptionKey = iv.toString('hex') + ':' + encrypted;
        } else {
          // If no auth token, store plain (will be encrypted later when requested)
          encryptedEncryptionKey = encryptionKey;
        }
      }

      const { error: updateError } = await supabase
        .from('installer_downloads')
        .update({
          status: 'installed',
          installed_at: new Date().toISOString(),
          client_id: clientId, // Now safe to set since client exists
        })
        .eq('download_token', downloadToken);
      
      if (updateError) {
        console.error('[ERROR] Failed to update installer_downloads:', updateError);
        // Don't fail the registration if this update fails
      } else {
        console.log('[DEBUG] installer_downloads updated successfully');
      }

      // Store encryption key in clients table (both plain and encrypted versions)
      const clientUpdateData = {};
      if (encryptionKey) {
        // Store plain encryption_key for server-side use (never exposed to client)
        clientUpdateData.encryption_key = encryptionKey;
        console.log('[DEBUG] Storing ENCRYPTION_KEY in clients table');
      }
      if (encryptedEncryptionKey) {
        // Store encrypted version for web UI use
        clientUpdateData.encrypted_encryption_key = encryptedEncryptionKey;
        console.log('[DEBUG] Storing encrypted_encryption_key in clients table');
      }
      
      if (Object.keys(clientUpdateData).length > 0) {
        await supabase
          .from('clients')
          .update(clientUpdateData)
          .eq('id', newClient.id);
      }
    }

    console.log('[DEBUG] Client registration completed successfully');
    return res.status(200).json({
      message: 'Client registered successfully',
      client: {
        clientId: newClient.client_id,
        status: newClient.status,
        installedAt: newClient.installed_at,
      },
    });

  } catch (err) {
    console.error('Client registration error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to register client',
    });
  }
}
