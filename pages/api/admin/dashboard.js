import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin
    const user = await requireAdmin(req);

    const supabase = createSupabaseServiceRoleClient();

    // Get user info from users table (may not exist if user is only in Supabase Auth)
    const { data: userRows, error: userError } = await supabase
      .from('users')
      .select('id, email, tier, created_at')
      .eq('id', user.id)
      .limit(1);

    // Handle case where user doesn't exist in users table
    let userRow = null;
    if (userError && userError.code !== 'PGRST116') {
      // Only throw if it's not a "not found" error
      throw userError;
    } else if (userRows && userRows.length > 0) {
      userRow = userRows[0];
    } else {
      // User exists in Auth but not in users table - get email from Auth
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
      userRow = {
        id: user.id,
        email: authUser?.user?.email || 'unknown',
        tier: 'admin', // Default tier
        created_at: new Date().toISOString(),
      };
    }

    // Get statistics in parallel
    const [
      { count: totalMicroActions },
      { count: totalWorkflows },
      { data: microActionsByPlatform },
      { data: workflowsByPlatform },
      { data: microActionsByType },
      { data: workflowsByType },
    ] = await Promise.all([
      // Count total micro-actions
      supabase
        .from('micro_actions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      // Count total workflows
      supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      // Get micro-actions for platform distribution
      supabase.from('micro_actions').select('platform').eq('is_active', true),
      // Get workflows for platform distribution
      supabase.from('workflows').select('platform').eq('is_active', true),
      // Get micro-actions for type distribution
      supabase.from('micro_actions').select('type').eq('is_active', true),
      // Get workflows for type distribution
      supabase.from('workflows').select('type').eq('is_active', true),
    ]);

    // Calculate platform distribution
    const platformDistribution = {
      microActions: {},
      workflows: {},
    };

    microActionsByPlatform?.forEach((ma) => {
      const platform = ma.platform || 'all';
      platformDistribution.microActions[platform] =
        (platformDistribution.microActions[platform] || 0) + 1;
    });

    workflowsByPlatform?.forEach((w) => {
      const platform = w.platform || 'all';
      platformDistribution.workflows[platform] =
        (platformDistribution.workflows[platform] || 0) + 1;
    });

    // Calculate type distribution
    const typeDistribution = {
      microActions: {},
      workflows: {},
    };

    microActionsByType?.forEach((ma) => {
      const type = ma.type || 'unknown';
      typeDistribution.microActions[type] =
        (typeDistribution.microActions[type] || 0) + 1;
    });

    workflowsByType?.forEach((w) => {
      const type = w.type || 'unknown';
      typeDistribution.workflows[type] = (typeDistribution.workflows[type] || 0) + 1;
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentMicroActions } = await supabase
      .from('micro_actions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: recentWorkflows } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('created_at', sevenDaysAgo.toISOString());

    const dashboard = {
      user: userRow,
      statistics: {
        microActions: {
          total: totalMicroActions || 0,
          recent: recentMicroActions || 0,
          byPlatform: platformDistribution.microActions,
          byType: typeDistribution.microActions,
        },
        workflows: {
          total: totalWorkflows || 0,
          recent: recentWorkflows || 0,
          byPlatform: platformDistribution.workflows,
          byType: typeDistribution.workflows,
        },
      },
    };

    return res.status(200).json(dashboard);
  } catch (error) {
    console.error('Error in admin dashboard:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

