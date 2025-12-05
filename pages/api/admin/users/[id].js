import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { getUser, updateUser, deleteUser } from '@modules-logic/services/admin-users.js';

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get a single user by ID (admin only)
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *
 *   put:
 *     summary: Update a user (admin only)
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               tier:
 *                 type: string
 *                 enum: [free, pro, enterprise, admin, superadmin]
 *               emailVerified:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Require admin and get current user ID
    const currentUser = await requireAdmin(req);

    // Prevent self-deletion and self-editing
    if (id === currentUser.id) {
      if (req.method === 'DELETE') {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      if (req.method === 'PUT') {
        return res.status(400).json({ error: 'Cannot edit your own account from this page. Use profile settings instead.' });
      }
    }

    if (req.method === 'GET') {
      const user = await getUser(id);
      return res.status(200).json(user);
    } else if (req.method === 'PUT') {
      const user = await updateUser(id, req.body, currentUser.id);
      return res.status(200).json({
        message: 'User updated successfully',
        user,
      });
    } else if (req.method === 'DELETE') {
      const result = await deleteUser(id, currentUser.id);
      return res.status(200).json({
        message: 'User deleted successfully',
        ...result,
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('User operation error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Operation failed' });
  }
}

