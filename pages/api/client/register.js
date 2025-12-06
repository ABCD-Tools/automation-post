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

    // Validate required fields
    if (!clientId || !installPath || !browserPath || !platform) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['clientId', 'installPath', 'browserPath', 'platform'],
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    // If downloadToken provided, verify it and get user_id
    let userId = null;
    if (downloadToken) {
      const { data: downloadRecord, error: downloadError } = await supabase
        .from('installer_downloads')
        .select('user_id, status, expires_at')
        .eq('download_token', downloadToken)
        .single();

      if (downloadError || !downloadRecord) {
        return res.status(400).json({ error: 'Invalid download token' });
      }

      // Check if token expired
      if (new Date(downloadRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Download token has expired' });
      }

      userId = downloadRecord.user_id;
      // Note: client_id will be updated AFTER client is created in clients table
    }

    // Check if client already exists
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('client_id', clientId)
      .single();

    if (existingClient) {
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
        console.error('Update client error:', updateError);
        return res.status(500).json({ error: 'Failed to update client' });
      }

      return res.status(200).json({
        message: 'Client updated successfully',
        client: updatedClient,
      });
    }

    // Create new client record
    // If userId not found from download token, we can't create client
    if (!userId) {
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
      console.error('Create client error:', createError);
      return res.status(500).json({ error: 'Failed to create client record' });
    }

    // Now that client exists, update installer_downloads with client_id
    if (downloadToken) {
      await supabase
        .from('installer_downloads')
        .update({
          status: 'installed',
          installed_at: new Date().toISOString(),
          client_id: clientId, // Now safe to set since client exists
        })
        .eq('download_token', downloadToken);
    }

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
