import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * Client Status API
 * 
 * Get client status and information
 * 
 * GET /api/client/status
 * Headers: {
 *   Authorization: Bearer <api_token>
 *   X-Client-ID: <client_id>
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate client using API token and client ID
    const authHeader = req.headers.authorization;
    const clientId = req.headers['x-client-id'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Missing X-Client-ID header' });
    }

    const apiToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    const supabase = createSupabaseServiceRoleClient();

    // Verify client exists and API token matches
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, user_id, client_id, client_name, status, platform, os_version, agent_version, installed_at, last_seen, last_heartbeat, total_jobs')
      .eq('client_id', clientId)
      .eq('api_token', apiToken)
      .single();

    if (clientError || !client) {
      return res.status(401).json({ error: 'Invalid client credentials' });
    }

    // Check if token is expired (if token_expires_at exists)
    const { data: tokenInfo } = await supabase
      .from('clients')
      .select('token_expires_at')
      .eq('id', client.id)
      .single();

    if (tokenInfo?.token_expires_at && new Date(tokenInfo.token_expires_at) < new Date()) {
      return res.status(401).json({ error: 'API token has expired' });
    }

    return res.status(200).json({
      client: {
        clientId: client.client_id,
        clientName: client.client_name,
        status: client.status,
        platform: client.platform,
        osVersion: client.os_version,
        agentVersion: client.agent_version,
        installedAt: client.installed_at,
        lastSeen: client.last_seen,
        lastHeartbeat: client.last_heartbeat,
        totalJobs: client.total_jobs || 0,
      },
    });
  } catch (err) {
    console.error('Get client status error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to get client status',
    });
  }
}
