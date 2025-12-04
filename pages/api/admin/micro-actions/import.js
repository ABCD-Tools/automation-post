import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import {
  optimizeVisualData,
  validateTotalSize,
} from '@modules-logic/utils/visual-data-optimizer.js';

/**
 * @swagger
 * /api/admin/micro-actions/import:
 *   post:
 *     summary: Bulk import micro-actions from recording (visual data optimized automatically)
 *     description: |
 *       Imports multiple micro-actions from a recording file. All visual data is automatically optimized:
 *       - Screenshots compressed to 80% quality
 *       - Resized to max 400x400px
 *       - EXIF data removed
 *       - Total size validated (warns if >5MB, suggests splitting workflow)
 *       - Individual action size validated (warns if >100KB, errors if >500KB)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - microActions
 *             properties:
 *               microActions:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - type
 *                     - platform
 *                     - params
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [click, type, wait, navigate, upload, extract, scroll, screenshot]
 *                     platform:
 *                       type: string
 *                       enum: [instagram, facebook, twitter, all]
 *                     params:
 *                       type: object
 *                       description: |
 *                         Action parameters. Visual data will be optimized automatically.
 *                         Recommended screenshot size: <100KB per action.
 *     responses:
 *       201:
 *         description: Micro-actions imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: integer
 *                   description: Number of actions created
 *                 actions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MicroAction'
 *       400:
 *         description: Validation error (missing fields, size too large)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                 totalSizeKB:
 *                   type: number
 *                   description: Total size in KB if validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin
    const user = await requireAdmin(req);

    const { microActions } = req.body;

    if (!microActions || !Array.isArray(microActions)) {
      return res.status(400).json({ error: 'microActions array is required' });
    }

    if (microActions.length === 0) {
      return res.status(400).json({ error: 'microActions array cannot be empty' });
    }

    // Validate each micro-action
    for (const action of microActions) {
      if (!action.name || !action.type || !action.platform || !action.params) {
        return res.status(400).json({
          error: 'Each micro-action must have: name, type, platform, params',
        });
      }
    }

    // Optimize visual data before saving to database
    // - Compress all screenshots to 80% quality
    // - Resize screenshots to max 400x400px
    // - Remove EXIF data
    const optimizedActions = await Promise.all(
      microActions.map(async (action) => {
        let optimizedParams = action.params;
        if (action.params?.visual) {
          try {
            optimizedParams = await optimizeVisualData(action.params, {
              quality: 80,
              maxWidth: 400,
              maxHeight: 400,
            });
          } catch (error) {
            console.error(`Error optimizing visual data for action "${action.name}":`, error);
            // Continue with original params if optimization fails
          }
        }
        return {
          ...action,
          params: optimizedParams,
        };
      })
    );

    // Validate total size
    const sizeValidation = validateTotalSize(optimizedActions);
    if (!sizeValidation.valid) {
      return res.status(400).json({
        error: sizeValidation.errors.join('; '),
        warnings: sizeValidation.warnings,
        totalSizeKB: sizeValidation.totalSizeKB,
      });
    }

    // Log warnings if any
    if (sizeValidation.warnings.length > 0) {
      console.warn('Size warnings:', sizeValidation.warnings);
      console.warn(`Total size: ${(sizeValidation.totalSizeKB / 1024).toFixed(2)}MB`);
    }

    const supabase = createSupabaseServiceRoleClient();

    // Check if user exists in users table (Supabase Auth users may not be synced)
    let createdByUserId = null;
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
      
      // Only set created_by if user exists in users table
      if (userRow) {
        createdByUserId = user.id;
      }
    } catch (error) {
      // User doesn't exist in users table, set created_by to NULL
      console.warn(`User ${user.id} not found in users table, setting created_by to NULL`);
    }

    // Prepare insert data with optimized params
    const insertData = optimizedActions.map((action) => ({
      name: action.name,
      description: action.description || null,
      type: action.type,
      platform: action.platform,
      params: action.params, // Already optimized
      created_by: createdByUserId, // NULL if user doesn't exist in users table
      is_active: true,
      version: '1.0.0',
    }));

    const { data, error } = await supabase
      .from('micro_actions')
      .insert(insertData)
      .select();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      created: data.length,
      actions: data,
    });
  } catch (error) {
    console.error('Error importing micro-actions:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

