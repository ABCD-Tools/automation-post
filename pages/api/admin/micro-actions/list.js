import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * @swagger
 * /api/admin/micro-actions/list:
 *   get:
 *     summary: List micro-actions with filters and pagination
 *     description: |
 *       Returns paginated list of micro-actions. Supports filtering by platform and type,
 *       and searching by name/description. Returns actions with visual data if available.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [all, instagram, facebook, twitter]
 *           default: all
 *         description: Filter by platform
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, click, type, wait, navigate, upload, extract, scroll, screenshot]
 *           default: all
 *         description: Filter by action type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of micro-actions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 microActions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MicroAction'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin
    await requireAdmin(req);

    // Debug: Verify service role key is loaded (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing');
      console.log('[DEBUG] Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');
    }

    const supabase = createSupabaseServiceRoleClient();
    const { platform, type, search, page = 1, limit = 50 } = req.query;

    // Build query
    let query = supabase.from('micro_actions').select('*', { count: 'exact' });

    // Filter out inactive items by default (only show active micro-actions)
    query = query.eq('is_active', true);

    // Apply filters
    if (platform && platform !== 'all') {
      query = query.or(`platform.eq.${platform},platform.eq.all`);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return res.status(200).json({
      microActions: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error listing micro-actions:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
