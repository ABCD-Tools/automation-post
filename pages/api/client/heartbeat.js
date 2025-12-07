import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * Client Heartbeat API
 * 
 * Updates client status and heartbeat timestamp
 * Called periodically by the agent to indicate it's still running
 * 
 * POST /api/client/heartbeat
 * Headers: {
 *   Authorization: Bearer <api_token>
 * }
 * Body: {
 *   clientId: string,
 *   status?: string (default: 'online'),
 *   agentVersion?: string
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, status = 'online', agentVersion } = req.body;

    // Get API token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const apiToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!clientId) {
      return res.status(400).json({ error: 'Missing required field: clientId' });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verify client exists and token matches
    const { data: client, error: checkError } = await supabase
      .from('clients')
      .select('id, user_id, client_id, api_token, token_expires_at, status')
      .eq('client_id', clientId)
      .eq('api_token', apiToken)
      .single();

    if (checkError || !client) {
      console.error('[ERROR] Heartbeat: Invalid client ID or API token', {
        clientId,
        hasToken: !!apiToken,
        error: checkError?.message,
      });
      return res.status(401).json({ error: 'Invalid client ID or API token' });
    }

    // Check if token is expired
    if (client.token_expires_at && new Date(client.token_expires_at) < new Date()) {
      console.error('[ERROR] Heartbeat: API token expired', {
        clientId,
        expiresAt: client.token_expires_at,
      });
      return res.status(401).json({ error: 'API token has expired' });
    }

    // Update heartbeat with status
    const now = new Date().toISOString();
    const updateData = {
      last_seen: now,
      last_heartbeat: now,
      status: status, // Update status to 'online' (or provided status)
    };

    // Update agent version if provided
    if (agentVersion) {
      updateData.agent_version = agentVersion;
    }

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', client.id)
      .select('id, client_id, status, last_seen, last_heartbeat, agent_version')
      .single();

    if (updateError) {
      console.error('[ERROR] Heartbeat: Failed to update', {
        clientId,
        error: updateError.message,
      });
      return res.status(500).json({ error: 'Failed to update heartbeat' });
    }

    // Log heartbeat (only in debug mode or if there's an issue)
    if (process.env.DEBUG || updatedClient.status !== 'online') {
      console.log('[DEBUG] Heartbeat received', {
        clientId: updatedClient.client_id,
        status: updatedClient.status,
        lastHeartbeat: updatedClient.last_heartbeat,
      });
    }

    return res.status(200).json({
      message: 'Heartbeat received',
      client: {
        clientId: updatedClient.client_id,
        status: updatedClient.status,
        lastHeartbeat: updatedClient.last_heartbeat,
      },
    });

  } catch (err) {
    console.error('[ERROR] Heartbeat error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to process heartbeat',
    });
  }
}
