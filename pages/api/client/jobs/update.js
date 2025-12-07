import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * Client Job Update API
 * 
 * Update job status and results from client
 * 
 * POST /api/client/jobs/update
 * Headers: {
 *   Authorization: Bearer <api_token>
 *   X-Client-ID: <client_id>
 * }
 * Body: {
 *   jobId: string (UUID),
 *   status: string (processing, completed, failed),
 *   results?: object (optional job results)
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

    const { jobId, status, results } = req.body;

    if (!jobId || !status) {
      return res.status(400).json({ error: 'Missing required fields: jobId and status are required' });
    }

    // Validate status
    const validStatuses = ['processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

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

    // Verify job belongs to user
    const { data: existingJob, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, user_id')
      .eq('id', jobId)
      .eq('user_id', client.user_id)
      .single();

    if (jobError || !existingJob) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    // Build update object
    const updateData = {
      status,
      processed_at: new Date().toISOString(),
    };

    // Add results if provided
    if (results !== undefined) {
      updateData.results = results;
    }

    // Update job
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('user_id', client.user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update job:', updateError);
      return res.status(500).json({ error: 'Failed to update job' });
    }

    // Update client's total_jobs count if job completed
    if (status === 'completed') {
      await supabase.rpc('increment_client_jobs', { client_id: client.id }).catch(() => {
        // Fallback: manual increment if RPC doesn't exist
        supabase
          .from('clients')
          .update({ total_jobs: supabase.raw('total_jobs + 1') })
          .eq('id', client.id)
          .catch(() => {
            // Ignore errors in background update
          });
      });
    }

    return res.status(200).json({
      message: 'Job updated successfully',
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        processed_at: updatedJob.processed_at,
      },
    });
  } catch (err) {
    console.error('Update job error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to update job',
    });
  }
}
