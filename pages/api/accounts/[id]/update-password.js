import { authenticateRequest } from '@modules-logic/middleware/auth';
import { updateAccount } from '@modules-logic/services/accounts';

/**
 * @swagger
 * /api/accounts/{id}/update-password:
 *   post:
 *     summary: Update password for a specific social media account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedPassword
 *             properties:
 *               encryptedPassword:
 *                 type: string
 *                 description: New encrypted password (encrypted client-side)
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!id) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { encryptedPassword } = req.body || {};

    if (!encryptedPassword) {
      return res.status(400).json({ error: 'encryptedPassword is required' });
    }

    const account = await updateAccount(user.id, id, {
      encryptedPassword,
    });

    return res.status(200).json({
      message: 'Password updated successfully',
      account,
    });
  } catch (err) {
    console.error('Update password error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to update password' });
  }
}

