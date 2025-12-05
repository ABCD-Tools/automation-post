import { authenticateRequest } from '@modules-logic/middleware/auth';
import { getJob, cancelJob } from '@modules-logic/services/jobs';

/**
 * @swagger
 * /api/jobs/{jobId}:
 *   get:
 *     summary: Get a single job by ID
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
 *         description: Job retrieved successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     summary: Cancel a job
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
 *         description: Job cancelled successfully
 *       404:
 *         description: Job not found
 *       400:
 *         description: Cannot cancel job in current status
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
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

    if (req.method === 'GET') {
      const job = await getJob(user.id, jobId);
      return res.status(200).json(job);
    } else if (req.method === 'DELETE') {
      const cancelledJob = await cancelJob(user.id, jobId);
      return res.status(200).json({
        message: 'Job cancelled successfully',
        job: cancelledJob,
      });
    } else {
      res.setHeader('Allow', ['GET', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Job operation error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('Cannot cancel')) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Operation failed' });
  }
}

