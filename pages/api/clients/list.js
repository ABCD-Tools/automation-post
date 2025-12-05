import { authenticateRequest } from '@modules-logic/middleware/auth';
import { listClients } from '@modules-logic/services/clients';

/**
 * @swagger
 * /api/clients/list:
 *   get:
 *     summary: List all clients for authenticated user
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by client status
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [windows, macos, linux]
 *         description: Filter by platform
 *     responses:
 *       200:
 *         description: List of clients retrieved successfully
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

    const { status, platform } = req.query || {};
    const filters = {};
    
    if (status) filters.status = status;
    if (platform) filters.platform = platform;

    const clients = await listClients(user.id, filters);

    return res.status(200).json({ clients });
  } catch (err) {
    console.error('List clients error:', err);

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to list clients' });
  }
}
