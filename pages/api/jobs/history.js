import { authenticateRequest } from '@modules-logic/middleware/auth';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * @swagger
 * /api/jobs/history:
 *   get:
 *     summary: Get job history for authenticated user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, processing, completed, failed, cancelled]
 *         description: Filter by job status
 *       - in: query
 *         name: job_type
 *         schema:
 *           type: string
 *         description: Filter by job type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of jobs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Job history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, job_type, limit, offset } = req.query || {};
    const supabase = createSupabaseServiceRoleClient();

    // Build query
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (job_type) {
      query = query.eq('job_type', job_type);
    }

    // Apply pagination
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: jobs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch job history: ${error.message}`);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (job_type) {
      countQuery = countQuery.eq('job_type', job_type);
    }

    const { count: totalCount } = await countQuery;

    return res.status(200).json({
      jobs: jobs || [],
      count: jobs?.length || 0,
      total: totalCount || 0,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err) {
    console.error('Get job history error:', err);

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to get job history' });
  }
}
