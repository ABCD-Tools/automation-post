import { authenticateRequest } from '@modules-logic/middleware/auth';
import { logout } from '@modules-logic/services/auth';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user to get token
    const user = await authenticateRequest(req);
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Logout (clears session on server side)
    await logout(token);

    return res.status(200).json({
      message: 'Logout successful',
      success: true,
    });
  } catch (error) {
    console.error('Logout error:', error);

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

