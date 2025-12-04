import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Workflow ID is required' });
  }

  try {
    // Require admin
    await requireAdmin(req);

    const supabase = createSupabaseServiceRoleClient();

    if (req.method === 'GET') {
      // Get single workflow
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        throw error;
      }

      // Populate micro-action details in steps
      if (data.steps && Array.isArray(data.steps)) {
        const microActionIds = data.steps
          .map((step) => step.micro_action_id)
          .filter(Boolean);

        if (microActionIds.length > 0) {
          const { data: microActions } = await supabase
            .from('micro_actions')
            .select('id, name, type, platform, params')
            .in('id', microActionIds);

          const microActionsMap = new Map(
            (microActions || []).map((ma) => [ma.id, ma]),
          );

          data.steps = data.steps.map((step) => ({
            ...step,
            micro_action: microActionsMap.get(step.micro_action_id) || null,
          }));
        }
      }

      return res.status(200).json(data);
    } else if (req.method === 'PUT') {
      // Update workflow
      const {
        name,
        description,
        platform,
        type,
        steps,
        requires_auth,
        auth_workflow_id,
        is_active,
      } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (platform !== undefined) updateData.platform = platform;
      if (type !== undefined) updateData.type = type;
      if (steps !== undefined) {
        // Validate steps if provided
        if (!Array.isArray(steps) || steps.length === 0) {
          return res.status(400).json({ error: 'Steps must be a non-empty array' });
        }
        for (const step of steps) {
          if (!step.micro_action_id) {
            return res.status(400).json({
              error: 'Each step must have a micro_action_id',
            });
          }
        }
        updateData.steps = steps;
      }
      if (requires_auth !== undefined) updateData.requires_auth = requires_auth;
      if (auth_workflow_id !== undefined) updateData.auth_workflow_id = auth_workflow_id;
      if (is_active !== undefined) updateData.is_active = is_active;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('workflows')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        throw error;
      }

      return res.status(200).json(data);
    } else if (req.method === 'DELETE') {
      // Soft delete (set is_active = false)
      const { data, error } = await supabase
        .from('workflows')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        throw error;
      }

      return res.status(200).json({ message: 'Workflow deleted', data });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling workflow:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
