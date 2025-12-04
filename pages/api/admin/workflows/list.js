import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin
    await requireAdmin(req);

    const supabase = createSupabaseServiceRoleClient();
    const { platform, type, page = 1, limit = 50 } = req.query;

    // Build query
    let query = supabase.from('workflows').select('*', { count: 'exact' });

    // Apply filters
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
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

    // Populate micro-action details in steps
    if (data && data.length > 0) {
      const workflowIds = data.map((w) => w.id);
      const allMicroActionIds = new Set();
      data.forEach((workflow) => {
        if (workflow.steps && Array.isArray(workflow.steps)) {
          workflow.steps.forEach((step) => {
            if (step.micro_action_id) {
              allMicroActionIds.add(step.micro_action_id);
            }
          });
        }
      });

      if (allMicroActionIds.size > 0) {
        const { data: microActions } = await supabase
          .from('micro_actions')
          .select('id, name, type, platform, params')
          .in('id', Array.from(allMicroActionIds));

        const microActionsMap = new Map(
          (microActions || []).map((ma) => [ma.id, ma]),
        );

        // Attach micro-action details to steps
        data.forEach((workflow) => {
          if (workflow.steps && Array.isArray(workflow.steps)) {
            workflow.steps = workflow.steps.map((step) => ({
              ...step,
              micro_action: microActionsMap.get(step.micro_action_id) || null,
            }));
          }
        });
      }
    }

    return res.status(200).json({
      workflows: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error listing workflows:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
