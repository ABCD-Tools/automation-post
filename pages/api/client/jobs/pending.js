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
    
    // Query jobs: get all queued jobs for this user
    // We'll filter scheduled_for and expires_at in JavaScript since Supabase .or() syntax is complex
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', client.user_id)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(limit * 2); // Get more than needed, then filter

    if (jobsError) {
      console.error('Failed to fetch pending jobs:', jobsError);
      console.error('Query error details:', {
        user_id: client.user_id,
        client_id: client.client_id,
        now,
        error: jobsError.message,
        code: jobsError.code,
      });
      return res.status(500).json({ error: 'Failed to fetch pending jobs' });
    }

    // Filter jobs manually to ensure both conditions are met:
    // 1. scheduled_for must be null or <= now (job is ready to run)
    // 2. expires_at must be null or >= now (job hasn't expired)
    const filteredJobs = (jobs || []).filter(job => {
      const nowDate = new Date(now);
      
      // Check scheduled_for: must be null or <= now
      const scheduledOk = !job.scheduled_for || new Date(job.scheduled_for) <= nowDate;
      
      // Check expires_at: must be null or >= now
      const expiresOk = !job.expires_at || new Date(job.expires_at) >= nowDate;
      
      return scheduledOk && expiresOk;
    }).slice(0, limit); // Apply limit after filtering

    // Log for debugging
    if (filteredJobs.length > 0) {
      console.log(`[DEBUG] Found ${filteredJobs.length} pending job(s) for client ${client.client_id}`);
    } else if (jobs && jobs.length > 0) {
      console.log(`[DEBUG] Found ${jobs.length} queued job(s) but none passed scheduled_for/expires_at filters`);
    }

    // Return array directly to match client expectations
    return res.status(200).json(filteredJobs);
  } catch (err) {
    console.error('Get pending jobs error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to get pending jobs',
    });
  }
}
