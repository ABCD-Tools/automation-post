/**
 * @swagger
 * /api/posts/create:
 *   post:
 *     summary: Create a new post job
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caption
 *               - image_url
 *             properties:
 *               caption:
 *                 type: string
 *                 maxLength: 2200
 *                 description: Post caption (max 2200 characters)
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: Cloudinary image URL
 *               target_accounts:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                   description: "Array of account IDs to post to (default: all active accounts)"
 *     responses:
 *       200:
 *         description: Post job created successfully
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
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
import { authenticateRequest } from '@modules-logic/middleware/auth';
import { createPost } from '@modules-logic/services/posts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { caption, image_url, target_accounts, scheduled_for } = req.body;

    // Validate required fields
    if (!caption || !image_url) {
      return res.status(400).json({
        error: 'Missing required fields: caption and image_url are required',
      });
    }

    // Create post
    const job = await createPost(user.id, {
      caption,
      image_url,
      target_accounts,
      scheduled_for,
    });

    return res.status(201).json({
      message: 'Post created successfully',
      job,
    });
  } catch (err) {
    console.error('Create post error:', err);

    if (err.message?.includes('Unauthorized') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (err.message?.includes('required') || err.message?.includes('Invalid') || err.message?.includes('No active accounts')) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message || 'Failed to create post' });
  }
}
