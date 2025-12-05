import { authenticateRequest } from '@modules-logic/middleware/auth';
import { getClient, updateClient, deleteClient } from '@modules-logic/services/clients';

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get a single client by ID
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
 *         description: Client retrieved successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 *
 *   put:
 *     summary: Update a client
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientName:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [windows, macos, linux]
 *               osVersion:
 *                 type: string
 *               installPath:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               agentVersion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     summary: Delete a client
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
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const client = await getClient(user.id, id);
      return res.status(200).json(client);
    } else if (req.method === 'PUT') {
      const client = await updateClient(user.id, id, req.body);
      return res.status(200).json({
        message: 'Client updated successfully',
        client,
      });
    } else if (req.method === 'DELETE') {
      const result = await deleteClient(user.id, id);
      return res.status(200).json({
        message: 'Client deleted successfully',
        ...result,
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Client operation error:', err);

    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(400).json({ error: err.message || 'Operation failed' });
  }
}

