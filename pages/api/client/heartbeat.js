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

    // First, check if client exists (without token validation)
    const { data: clientExists, error: clientCheckError } = await supabase
      .from('clients')
      .select('id, client_id, api_token')
      .eq('client_id', clientId)
      .maybeSingle();

    if (clientCheckError) {
      console.error('[ERROR] Heartbeat: Error checking client existence', {
        clientId,
        error: clientCheckError.message,
        errorCode: clientCheckError.code,
        errorDetails: clientCheckError,
      });
      return res.status(500).json({ error: 'Database error while checking client' });
    }

    if (!clientExists) {
      console.error('[ERROR] Heartbeat: Client not found', {
        clientId,
        hasToken: !!apiToken,
        tokenLength: apiToken?.length,
      });
      return res.status(401).json({ error: 'Invalid client ID or API token' });
    }

    // Now verify the API token matches
    if (clientExists.api_token !== apiToken) {
      console.error('[ERROR] Heartbeat: API token mismatch', {
        clientId,
        hasToken: !!apiToken,
        tokenLength: apiToken?.length,
        storedTokenLength: clientExists.api_token?.length,
        tokenMatches: clientExists.api_token === apiToken,
        // Don't log actual tokens for security, but log first/last few chars for debugging
        tokenPrefix: apiToken?.substring(0, 8),
        storedTokenPrefix: clientExists.api_token?.substring(0, 8),
      });
      return res.status(401).json({ error: 'Invalid client ID or API token' });
    }

    // Get full client data for token expiration check
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, user_id, client_id, api_token, token_expires_at, status')
      .eq('id', clientExists.id)
      .single();

    if (fetchError || !client) {
      console.error('[ERROR] Heartbeat: Failed to fetch client data', {
        clientId,
        error: fetchError?.message,
        errorDetails: fetchError,
      });
      return res.status(500).json({ error: 'Failed to fetch client data' });
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
