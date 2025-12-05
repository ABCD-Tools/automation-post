import { authenticateRequest } from '@modules-logic/middleware/auth';
import { getUserProfile, updateUserProfile } from '@modules-logic/services/user';

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile information
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *
 *   put:
 *     summary: Update user profile information
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               tier:
 *                 type: string
 *                 enum: [free, premium, enterprise]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const profile = await getUserProfile(user.id);
      return res.status(200).json(profile);
    } else if (req.method === 'PUT') {
      const profileData = req.body || {};
      
      // Validate tier if provided
      if (profileData.tier && !['free', 'premium', 'enterprise'].includes(profileData.tier)) {
        return res.status(400).json({ error: 'Invalid tier. Must be one of: free, premium, enterprise' });
      }

      const updatedProfile = await updateUserProfile(user.id, profileData);
      return res.status(200).json({
        message: 'Profile updated successfully',
        profile: updatedProfile,
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Profile operation error:', err);

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Operation failed' });
  }
}

