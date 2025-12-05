import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { getUserStatistics } from '@modules-logic/services/admin-users.js';

/**
 * @swagger
 * /api/admin/users/statistics:
 *   get:
 *     summary: Get user statistics (admin only)
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin
    await requireAdmin(req);

    const statistics = await getUserStatistics();

    return res.status(200).json(statistics);
  } catch (err) {
    console.error('Get user statistics error:', err);

    if (err.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to get user statistics' });
  }
}

