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
import { authenticateRequest } from '@modules-logic/middleware/auth';
import { uploadImage } from '@modules-logic/services/cloudinary';

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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: base64
 *                 description: "Base64 encoded image data (data:image/...;base64,...) or base64 string"
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid file or upload failed
 *       401:
 *         description: Unauthorized
 */
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

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Handle base64 data URL or plain base64
    let base64Data = image;
    let mimeType = 'image/jpeg'; // default

    if (image.startsWith('data:')) {
      // Extract mime type and base64 data from data URL
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid base64 data URL format' });
      }
      mimeType = matches[1];
      base64Data = matches[2];
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.',
      });
    }

    // Validate base64 data size (10MB limit)
    const base64Size = (base64Data.length * 3) / 4; // Approximate size
    if (base64Size > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: 'File size exceeds 10MB limit',
      });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create a data URL for Cloudinary (it accepts data URLs)
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Upload to Cloudinary
    const uploadResult = await uploadImage(dataUrl, {
      folder: `posts/${user.id}`,
      resource_type: 'image',
    });

    return res.status(200).json({
      url: uploadResult.secure_url || uploadResult.url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
    });
  } catch (err) {
    console.error('Upload image error:', err);

    if (err.message?.includes('Unauthorized') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (err.message?.includes('Cloudinary')) {
      return res.status(500).json({ error: 'Image upload failed: ' + err.message });
    }

    return res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
}
