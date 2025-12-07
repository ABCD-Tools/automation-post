import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * Client Delete API
 * 
 * Delete a client (self-deletion by client agent)
 * 
 * DELETE /api/client/delete
 * Headers: {
 *   Authorization: Bearer <api_token>
 *   X-Client-ID: <client_id>
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
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
      .select('id, user_id, client_id, api_token')
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

    // Delete the client
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', client.id)
      .eq('client_id', clientId)
      .eq('api_token', apiToken);

    if (deleteError) {
      console.error('Delete client error:', deleteError);
      return res.status(500).json({
        error: deleteError.message || 'Failed to delete client',
      });
    }

    return res.status(200).json({
      message: 'Client deleted successfully',
      clientId: client.client_id,
    });
  } catch (err) {
    console.error('Delete client error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to delete client',
    });
  }
}

