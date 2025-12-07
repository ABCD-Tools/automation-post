import { authenticateRequest } from '@modules-logic/middleware/auth';
import { getJob } from '@modules-logic/services/jobs';

/**
 * @swagger
 * /api/jobs/{jobId}/status:
 *   get:
 *     summary: Get job status
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobId } = req.query;

  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get job
    const job = await getJob(user.id, jobId);

    // Return status information
    return res.status(200).json({
      jobId: job.id,
      status: job.status,
      job_type: job.job_type,
      created_at: job.created_at,
      processed_at: job.processed_at,
      scheduled_for: job.scheduled_for,
      expires_at: job.expires_at,
      retry_count: job.retry_count || 0,
      max_retries: job.max_retries || 3,
    });
  } catch (err) {
    console.error('Get job status error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to get job status' });
  }
}
