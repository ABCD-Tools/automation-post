import { authenticateRequest } from '@modules-logic/middleware/auth';
import { getAccount, updateAccount, deleteAccount } from '@modules-logic/services/accounts';

/**
 * @swagger
 * /api/accounts/{id}:
 *   get:
 *     summary: Get a single account by ID
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
 *     responses:
 *       200:
 *         description: Account retrieved successfully
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 *
 *   put:
 *     summary: Update an account
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               encryptedPassword:
 *                 type: string
 *               status:
 *                 type: string
 *               encryptedCookies:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account updated successfully
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     summary: Delete an account
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
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const account = await getAccount(user.id, id);
      return res.status(200).json(account);
    } else if (req.method === 'PUT') {
      const accountData = req.body || {};
      const updatedAccount = await updateAccount(user.id, id, accountData);
      return res.status(200).json({
        message: 'Account updated successfully',
        account: updatedAccount,
      });
    } else if (req.method === 'DELETE') {
      await deleteAccount(user.id, id);
      return res.status(200).json({
        message: 'Account deleted successfully',
        accountId: id,
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Account operation error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Operation failed' });
  }
}

