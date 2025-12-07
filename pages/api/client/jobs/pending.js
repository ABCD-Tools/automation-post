import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * Client Pending Jobs API
 * 
 * Get pending jobs for the authenticated client
 * 
 * GET /api/client/jobs/pending
 * Headers: {
 *   Authorization: Bearer <api_token>
 *   X-Client-ID: <client_id>
 * }
 * Query params:
 *   - limit: number (default: 10)
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

    // Get limit from query params
    const limit = parseInt(req.query.limit || '10', 10);

    // Get pending jobs for this user
    // Pending jobs are: queued status, not expired, and either no scheduled_for or scheduled_for <= now
    const now = new Date().toISOString();
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', client.user_id)
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (jobsError) {
      console.error('Failed to fetch pending jobs:', jobsError);
      return res.status(500).json({ error: 'Failed to fetch pending jobs' });
    }

    return res.status(200).json({
      jobs: jobs || [],
      count: jobs?.length || 0,
    });
  } catch (err) {
    console.error('Get pending jobs error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to get pending jobs',
    });
  }
}
