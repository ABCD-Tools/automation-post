import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import { optimizeVisualData, validateVisualDataSize } from '@modules-logic/utils/visual-data-optimizer.js';

/**
 * @swagger
 * /api/admin/micro-actions/create:
 *   post:
 *     summary: Create a new micro-action with visual data support
 *     description: |
 *       Creates a micro-action that can use visual recording data for robust element finding.
 *       Visual data (screenshots, positions, text) is automatically optimized before storage:
 *       - Screenshots compressed to 80% quality
 *       - Resized to max 400x400px
 *       - EXIF data removed
 *       - Size validation (warns if >100KB, errors if >500KB)
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
 *               - name
 *               - type
 *               - platform
 *               - params
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Click Login Button"
 *               description:
 *                 type: string
 *                 example: "Clicks the login button on Instagram"
 *               type:
 *                 type: string
 *                 enum: [click, type, wait, navigate, upload, extract, scroll, screenshot]
 *                 example: "click"
 *               platform:
 *                 type: string
 *                 enum: [instagram, facebook, twitter, all]
 *                 example: "instagram"
 *               params:
 *                 type: object
 *                 description: |
 *                   Action parameters. For visual actions (click, type, upload), can include:
 *                   - visual: Visual data object with screenshot, position, text
 *                   - backup_selector: CSS selector as fallback
 *                   - execution_method: "selector_first" | "visual_first" | "visual_only"
 *                 example:
 *                   visual:
 *                     screenshot: "data:image/png;base64,iVBORw0KGgo..."
 *                     text: "Log In"
 *                     position:
 *                       absolute:
 *                         x: 640
 *                         y: 450
 *                       relative:
 *                         x: 50
 *                         y: 62.5
 *                     boundingBox:
 *                       x: 590
 *                       y: 430
 *                       width: 100
 *                       height: 40
 *                     surroundingText: ["Instagram", "Sign up"]
 *                   backup_selector: "button[type='submit']"
 *                   execution_method: "visual_first"
 *     responses:
 *       201:
 *         description: Micro-action created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MicroAction'
 *       400:
 *         description: Validation error (missing fields, invalid type/platform, size too large)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Action size is 600KB (max: 500KB). Please optimize or split the action."
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */

// Validate params based on type
function validateParams(type, params) {
  if (!params || typeof params !== 'object') {
    throw new Error('Params must be an object');
  }

  switch (type) {
    case 'click':
      if (!params.selector) throw new Error('Selector is required for click actions');
      break;
    case 'type':
      if (!params.selector) throw new Error('Selector is required for type actions');
      if (!params.text && params.text !== '') throw new Error('Text is required for type actions');
      break;
    case 'wait':
      if (!params.duration || params.duration < 0) {
        throw new Error('Valid duration is required for wait actions');
      }
      break;
    case 'navigate':
      if (!params.url) throw new Error('URL is required for navigate actions');
      break;
    case 'upload':
      if (!params.selector) throw new Error('Selector is required for upload actions');
      if (!params.filePath) throw new Error('FilePath is required for upload actions');
      break;
    case 'extract':
      if (!params.selector) throw new Error('Selector is required for extract actions');
      if (!params.variableName) throw new Error('VariableName is required for extract actions');
      break;
    case 'scroll':
      if (!params.direction || !['up', 'down'].includes(params.direction)) {
        throw new Error('Valid direction (up/down) is required for scroll actions');
      }
      break;
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin
    const user = await requireAdmin(req);

    const { name, description, type, platform, params } = req.body;

    // Validate required fields
    if (!name || !type || !platform || !params) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, platform, params',
      });
    }

    // Validate platform
    if (!['instagram', 'facebook', 'twitter', 'all'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Validate type
    if (
      !['click', 'type', 'wait', 'navigate', 'upload', 'extract', 'scroll', 'screenshot'].includes(
        type,
      )
    ) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    // Validate params
    try {
      validateParams(type, params);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    // Optimize visual data before saving to database
    // - Compress all screenshots to 80% quality
    // - Resize screenshots to max 400x400px
    // - Remove EXIF data
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

    const supabase = createSupabaseServiceRoleClient();

    const { data, error } = await supabase
      .from('micro_actions')
      .insert({
        name,
        description: description || null,
        type,
        platform,
        params: optimizedParams, // Use optimized params
        created_by: user.id,
        is_active: true,
        version: '1.0.0',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Error creating micro-action:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
