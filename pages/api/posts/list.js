import { authenticateRequest } from '@modules-logic/middleware/auth';
import { listPosts } from '@modules-logic/services/posts';

/**
 * @swagger
 * /api/posts/list:
 *   get:
 *     summary: List all posts for authenticated user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, processing, completed, failed, cancelled]
 *         description: Filter by post status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
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

    const { status, limit, offset } = req.query || {};
    const filters = {};
    
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const result = await listPosts(user.id, filters);

    return res.status(200).json(result);
  } catch (err) {
    console.error('List posts error:', err);

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to list posts' });
  }
}

