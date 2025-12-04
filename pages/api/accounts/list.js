import { authenticateRequest } from '@modules-logic/middleware/auth';
import { listAccounts } from '@modules-logic/services/accounts';

/**
 * @swagger
 * /api/accounts/list:
 *   get:
 *     summary: List all social media accounts for authenticated user
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [instagram, facebook, twitter]
 *         description: Filter by platform
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, pending_verification, login_failed, needs_reauth]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of accounts
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { platform, status } = req.query || {};
    const filters = {};
    
    if (platform) filters.platform = platform;
    if (status) filters.status = status;

    const accounts = await listAccounts(user.id, filters);

    return res.status(200).json({
      accounts,
      count: accounts.length,
    });
  } catch (err) {
    console.error('List accounts error:', err);
    return res.status(400).json({ 
      error: err.message || 'Failed to list accounts' 
    });
  }
}
