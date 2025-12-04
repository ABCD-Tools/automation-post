/**
 * @swagger
 * /api/posts/upload:
 *   post:
 *     summary: Upload image to Cloudinary
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "Image file (max 10MB, formats: JPG, PNG, WEBP)"
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: Cloudinary URL
 *                 public_id:
 *                   type: string
 *       400:
 *         description: Invalid file or upload failed
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  // TODO: Implement upload handler
  res.status(200).json({ message: 'upload endpoint' });
}
