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

    // Check if client already exists
    console.log('[DEBUG] Checking if client already exists...');
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('client_id', clientId)
      .single();

    if (existingClient) {
      console.log('[DEBUG] Client exists, updating...');
      // Update existing client
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({
          install_path: installPath,
          browser_path: browserPath,
          platform: platform,
          agent_version: agentVersion,
          status: 'online',
          last_seen: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
        })
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

    // Get API token from installer_downloads or generate new one
    let apiToken = null;
    if (downloadToken) {
      // Get API token from the download record's metadata or generate
      // For now, we'll need to store it during installer creation
      // This is a simplified version - in production, store token securely
      apiToken = `sk_${crypto.randomBytes(32).toString('hex')}`;
    } else {
      apiToken = `sk_${crypto.randomBytes(32).toString('hex')}`;
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

      let encryptedEncryptionKey = null;
      if (!downloadRecordError && downloadRecord?.metadata?.encryptionKey) {
        // Encrypt the encryption key with user's auth token (if available)
        // For now, we'll store it in a way that can be retrieved later
        // The actual encryption will happen when the web UI requests it
        const encryptionKey = downloadRecord.metadata.encryptionKey;
        
        // Store a placeholder - the actual encryption will be done when requested
        // This is a temporary solution - in production, encrypt it here with a user-specific key
        encryptedEncryptionKey = encryptionKey; // TODO: Encrypt with user-specific key
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

      // Store encrypted encryption key in clients table
      if (encryptedEncryptionKey) {
        await supabase
          .from('clients')
          .update({ encrypted_encryption_key: encryptedEncryptionKey })
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
