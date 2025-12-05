import { authenticateRequest } from '@modules-logic/middleware/auth';
import { regenerateClientToken } from '@modules-logic/services/clients';

/**
 * @swagger
 * /api/clients/{id}/regenerate-token:
 *   post:
 *     summary: Regenerate API token for a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Token regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 client:
 *                   type: object
 *                 apiToken:
 *                   type: string
 *                   description: New API token (only shown once)
 *       404:
 *         description: Client not found
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
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await regenerateClientToken(user.id, id);

    return res.status(200).json({
      message: 'API token regenerated successfully',
      client: {
        id: client.id,
        clientId: client.client_id,
        clientName: client.client_name,
        status: client.status,
        tokenExpiresAt: client.token_expires_at,
      },
      apiToken: client.api_token, // Only shown once during regeneration
    });
  } catch (err) {
    console.error('Regenerate token error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Failed to regenerate token' });
  }
}

