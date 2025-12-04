import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin (Supabase Auth metadata role=admin)
    const user = await requireAdmin(req);

    const supabase = createSupabaseServiceRoleClient();

    // Look up tier in internal users table
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email, tier, created_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      throw userError;
    }

    if (!userRow || userRow.tier !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required' });
    }

    // Simple summary payload (can be extended later)
    const summary = {
      user: userRow,
      message: 'Superadmin dashboard summary',
    };

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error in superadmin dashboard:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}


