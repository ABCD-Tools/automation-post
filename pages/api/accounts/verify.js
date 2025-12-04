import { authenticateRequest } from '@modules-logic/middleware/auth';
import { verifyAccount } from '@modules-logic/services/accounts';

/**
 * @swagger
 * /api/accounts/verify:
 *   post:
 *     summary: Re-verify a failed account or trigger verification
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_id
 *             properties:
 *               account_id:
 *                 type: string
 *                 format: uuid
 *                 description: Account ID to verify
 *     responses:
 *       200:
 *         description: Verification job created successfully
 *       400:
 *         description: Invalid input or account not found
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

    const { account_id } = req.body || {};

    if (!account_id) {
      return res.status(400).json({ 
        error: 'account_id is required' 
      });
    }

    const verificationJob = await verifyAccount(user.id, account_id);

    return res.status(200).json({
      message: 'Verification job created successfully',
      verificationJob,
    });
  } catch (err) {
    console.error('Verify account error:', err);
    return res.status(400).json({ 
      error: err.message || 'Failed to verify account' 
    });
  }
}
