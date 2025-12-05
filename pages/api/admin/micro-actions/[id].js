import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import { optimizeVisualData, validateVisualDataSize } from '@modules-logic/utils/visual-data-optimizer.js';

/**
 * @swagger
 * /api/admin/micro-actions/{id}:
 *   get:
 *     summary: Get a single micro-action by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Micro-action UUID
 *     responses:
 *       200:
 *         description: Micro-action retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MicroAction'
 *       404:
 *         description: Micro-action not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *
 *   put:
 *     summary: Update a micro-action (visual data optimized automatically)
 *     description: |
 *       Updates a micro-action. If params.visual is provided, screenshots are automatically optimized:
 *       - Compressed to 80% quality
 *       - Resized to max 400x400px
 *       - Size validated (warns if >100KB, errors if >500KB)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               params:
 *                 type: object
 *                 description: Updated params (visual data will be optimized)
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Micro-action updated successfully
 *       400:
 *         description: Validation error (size too large)
 *       404:
 *         description: Micro-action not found
 *
 *   delete:
 *     summary: Permanently delete a micro-action
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Micro-action deleted successfully
 *       404:
 *         description: Micro-action not found
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Micro-action ID is required' });
  }

  try {
    // Require admin
    await requireAdmin(req);

    const supabase = createSupabaseServiceRoleClient();

    if (req.method === 'GET') {
      // Get single micro-action
      const { data, error } = await supabase
        .from('micro_actions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Micro-action not found' });
        }
        throw error;
      }

      return res.status(200).json(data);
    } else if (req.method === 'PUT') {
      // Update micro-action
      const { name, description, params, is_active } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;
      updateData.updated_at = new Date().toISOString();

      // Optimize visual data if params are being updated
      if (params !== undefined) {
        let optimizedParams = params;
        if (params.visual) {
          try {
            optimizedParams = await optimizeVisualData(params, {
              quality: 80,
              maxWidth: 400,
              maxHeight: 400,
            });
          } catch (error) {
            console.error('Error optimizing visual data:', error);
            // Continue with original params if optimization fails
          }
        }

        // Validate size
        const sizeValidation = validateVisualDataSize(optimizedParams);
        if (!sizeValidation.valid) {
          return res.status(400).json({
            error: sizeValidation.errors.join('; '),
            warnings: sizeValidation.warnings,
          });
        }

        // Log warnings if any
        if (sizeValidation.warnings.length > 0) {
          console.warn('Size warnings:', sizeValidation.warnings);
        }

        updateData.params = optimizedParams;
      }

      const { data, error } = await supabase
        .from('micro_actions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Micro-action not found' });
        }
        throw error;
      }

      return res.status(200).json(data);
    } else if (req.method === 'DELETE') {
      // Hard delete (permanently remove from database)
      const { data, error } = await supabase
        .from('micro_actions')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Micro-action not found' });
        }
        throw error;
      }

      if (!data) {
        return res.status(404).json({ error: 'Micro-action not found' });
      }

      return res.status(200).json({ message: 'Micro-action deleted successfully', data });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling micro-action:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
