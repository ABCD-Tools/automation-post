import { requireAdmin } from '@modules-logic/middleware/admin.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin
    const user = await requireAdmin(req);

    const {
      name,
      description,
      platform,
      type,
      steps,
      requires_auth = false,
      auth_workflow_id = null,
    } = req.body;

    // Validate required fields
    if (!name || !platform || !type || !steps) {
      return res.status(400).json({
        error: 'Missing required fields: name, platform, type, steps',
      });
    }

    // Validate platform
    if (!['instagram', 'facebook', 'twitter'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Validate type
    if (!['auth', 'post', 'story', 'comment', 'like'].includes(type)) {
      return res.status(400).json({ error: 'Invalid workflow type' });
    }

    // Validate steps
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Steps must be a non-empty array' });
    }

    // Validate each step has micro_action_id
    for (const step of steps) {
      if (!step.micro_action_id) {
        return res.status(400).json({
          error: 'Each step must have a micro_action_id',
        });
      }
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verify all micro_action_ids exist
    const microActionIds = steps.map((s) => s.micro_action_id);
    const { data: existingActions, error: checkError } = await supabase
      .from('micro_actions')
      .select('id')
      .in('id', microActionIds);

    if (checkError) {
      throw checkError;
    }

    if (existingActions.length !== microActionIds.length) {
      return res.status(400).json({
        error: 'One or more micro_action_ids do not exist',
      });
    }

    // Validate auth_workflow_id if provided
    if (auth_workflow_id) {
      const { data: authWorkflow, error: authError } = await supabase
        .from('workflows')
        .select('id')
        .eq('id', auth_workflow_id)
        .single();

      if (authError || !authWorkflow) {
        return res.status(400).json({ error: 'Invalid auth_workflow_id' });
      }
    }

    // Check if user exists in users table before setting created_by
    // If user doesn't exist, set created_by to NULL to avoid foreign key constraint violation
    const { data: userRows } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .limit(1);
    
    const userRow = userRows && userRows.length > 0 ? userRows[0] : null;

    const createdBy = userRow ? user.id : null;

    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name,
        description: description || null,
        platform,
        type,
        steps,
        requires_auth: requires_auth,
        auth_workflow_id: auth_workflow_id,
        is_active: true,
        created_by: createdBy,
        version: '1.0.0',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Error creating workflow:', error);

    if (error.message === 'Admin access required') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
