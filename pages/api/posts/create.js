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
export default async function handler(req, res) {
  // TODO: Implement create handler
  res.status(200).json({ message: 'create endpoint' });
}
