import { authenticateRequest } from '@modules-logic/middleware/auth';
import { retryJob } from '@modules-logic/services/jobs';

/**
 * @swagger
 * /api/jobs/{jobId}/retry:
 *   post:
 *     summary: Retry a failed or cancelled job
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
 *         description: Job ID to retry
 *     responses:
 *       200:
 *         description: Job retried successfully, new job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 job:
 *                   type: object
 *       400:
 *         description: Cannot retry job in current status
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  const { jobId } = req.query;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const newJob = await retryJob(user.id, jobId);

    return res.status(200).json({
      message: 'Job retried successfully',
      job: newJob,
    });
  } catch (err) {
    console.error('Retry job error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('Cannot retry')) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to retry job' });
  }
}

