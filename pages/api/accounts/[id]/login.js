import { authenticateRequest } from '@modules-logic/middleware/auth';
import { loginAccount } from '@modules-logic/services/accounts';

/**
 * @swagger
 * /api/accounts/{id}/login:
 *   post:
 *     summary: Login to an account using auth workflow
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
 *         description: Login job created successfully
 *       400:
 *         description: Invalid input or no auth workflow found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
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

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Create login job
    const loginJob = await loginAccount(user.id, id);

    return res.status(200).json({
      message: 'Login job created successfully',
      job: loginJob,
    });
  } catch (err) {
    console.error('Login account error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('No auth workflow')) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to create login job' });
  }
}

