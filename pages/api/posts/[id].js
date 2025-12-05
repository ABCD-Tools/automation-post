import { authenticateRequest } from '@modules-logic/middleware/auth';
import { getPost, updatePost, deletePost } from '@modules-logic/services/posts';

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get a single post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 *       401:
 *         description: Unauthorized
 *
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [queued, processing, completed, failed, cancelled]
 *               content:
 *                 type: object
 *                 description: Post content/metadata
 *               target_accounts:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       404:
 *         description: Post not found
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       404:
 *         description: Post not found
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const post = await getPost(user.id, id);
      return res.status(200).json(post);
    } else if (req.method === 'PUT') {
      const post = await updatePost(user.id, id, req.body);
      return res.status(200).json({
        message: 'Post updated successfully',
        post,
      });
    } else if (req.method === 'DELETE') {
      const result = await deletePost(user.id, id);
      return res.status(200).json({
        message: 'Post deleted successfully',
        ...result,
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Post operation error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Operation failed' });
  }
}

