import { authenticateRequest } from '@modules-logic/middleware/auth';
import { addAccount } from '@modules-logic/services/accounts';

/**
 * @swagger
 * /api/accounts/add:
 *   post:
 *     summary: Add a new social media account
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
 *               - platform
 *               - username
 *               - encryptedPassword
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [instagram, facebook, twitter]
 *                 description: Social media platform
 *               username:
 *                 type: string
 *                 description: Account username
 *               encryptedPassword:
 *                 type: string
 *                 description: Password encrypted client-side
 *     responses:
 *       200:
 *         description: Account created successfully
 *       400:
 *         description: Invalid input or account limit reached
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

    const { platform, username, encryptedPassword } = req.body || {};

    if (!platform || !username || !encryptedPassword) {
      return res.status(400).json({ 
        error: 'Platform, username, and encryptedPassword are required' 
      });
    }

    const result = await addAccount(user.id, {
      platform,
      username,
      encryptedPassword,
    });

    return res.status(200).json({
      message: 'Account added successfully. Verification job created.',
      account: result.account,
      verificationJob: result.verificationJob,
    });
  } catch (err) {
    console.error('Add account error:', err);
    return res.status(400).json({ 
      error: err.message || 'Failed to add account' 
    });
  }
}
