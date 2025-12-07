import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import { getClientByClientId } from '@modules-logic/services/clients';

/**
 * Get accounts for the authenticated client
 * 
 * GET /api/client/accounts
 * 
 * Returns accounts that are encrypted for this client.
 * Only returns accounts where client_id matches the authenticated client.
 * 
 * Authentication: Bearer token (API_TOKEN) + X-Client-ID header
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
      .select('id, user_id, client_id, api_token')
      .eq('client_id', clientId)
      .eq('api_token', apiToken)
      .single();

    if (clientError || !client) {
      return res.status(401).json({ error: 'Invalid client credentials' });
    }

    // Get accounts for this client
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, platform, username, encrypted_password, status, last_verified_at, last_used_at, created_at')
      .eq('client_id', client.client_id)
      .eq('user_id', client.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    return res.status(200).json({
      accounts: accounts || [],
    });
  } catch (err) {
    console.error('Get accounts error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to get accounts',
    });
  }
}

