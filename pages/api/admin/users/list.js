import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { listUsers } from '@modules-logic/services/admin-users.js';

/**
 * @swagger
 * /api/admin/users/list:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [free, pro, enterprise, admin, superadmin]
 *         description: Filter by tier
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of users to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
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

    const { tier, search, limit, offset } = req.query || {};
    const filters = {};

    if (tier) filters.tier = tier;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const result = await listUsers(filters);

    return res.status(200).json(result);
  } catch (err) {
    console.error('List users error:', err);

    if (err.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to list users' });
  }
}

