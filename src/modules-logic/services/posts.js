import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import { populateMicroActions, convertWorkflowToActions } from '@modules-logic/utils/workflow-converter.js';

const supabase = createSupabaseServiceRoleClient();

/**
 * List all posts (jobs with job_type='post') for a user
 * @param {string} userId - Supabase auth user ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status
 * @param {number} filters.limit - Limit number of results
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Object>} Object with posts array and pagination info
 */
export async function listPosts(userId, filters = {}) {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('job_type', 'post')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // Apply pagination
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch posts: ${error.message}`);
  }

  // Get total count for pagination
  const { count: totalCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('job_type', 'post');

  return {
    posts: data || [],
    count: data?.length || 0,
    total: totalCount || 0,
    limit,
    offset,
  };
}

/**
 * Get a single post (job) by ID
 * @param {string} userId - Supabase auth user ID
 * @param {string} postId - Post ID (job ID)
 * @returns {Promise<Object>} Post object
 */
export async function getPost(userId, postId) {
  const { data: post, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('job_type', 'post')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Post not found');
    }
    throw new Error(`Failed to fetch post: ${error.message}`);
  }

  if (!post) {
    throw new Error('Post not found or access denied');
  }

  return post;
}

/**
 * Update a post (job)
 * @param {string} userId - Supabase auth user ID
 * @param {string} postId - Post ID (job ID)
 * @param {Object} postData - Post data to update
 * @returns {Promise<Object>} Updated post object
 */
export async function updatePost(userId, postId, postData) {
  // Verify post belongs to user and is a post type
  const { data: existingPost, error: checkError } = await supabase
    .from('jobs')
    .select('id, job_type')
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('job_type', 'post')
    .single();

  if (checkError || !existingPost) {
    throw new Error('Post not found or access denied');
  }

  // Build update object
  const updateData = {};
  if (postData.status !== undefined) updateData.status = postData.status;
  if (postData.content !== undefined) updateData.content = postData.content;
  if (postData.target_accounts !== undefined) updateData.target_accounts = postData.target_accounts;
  if (postData.expires_at !== undefined) updateData.expires_at = postData.expires_at;

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data: post, error } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('job_type', 'post')
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }

  return post;
}

/**
 * Delete a post (job)
 * @param {string} userId - Supabase auth user ID
 * @param {string} postId - Post ID (job ID)
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deletePost(userId, postId) {
  // Verify post belongs to user and is a post type
  const { data: existingPost, error: checkError } = await supabase
    .from('jobs')
    .select('id, job_type')
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('job_type', 'post')
    .single();

  if (checkError || !existingPost) {
    throw new Error('Post not found or access denied');
  }

  // Hard delete the post
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('job_type', 'post');

  if (error) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }

  return { success: true, postId };
}

/**
 * Create a new post (job with job_type='post')
 * @param {string} userId - Supabase auth user ID
 * @param {Object} postData - Post data
 * @param {string} postData.caption - Post caption (max 2200 characters)
 * @param {string} postData.image_url - Cloudinary image URL
 * @param {Array<string>} postData.target_accounts - Array of account IDs (optional, defaults to all available accounts)
 * @param {string} postData.scheduled_for - Optional scheduled time (ISO string)
 * @returns {Promise<Object>} Created post (job) object
 */
export async function createPost(userId, postData) {
  const { caption, image_url, target_accounts, scheduled_for } = postData;

  // Validate required fields
  if (!caption || !image_url) {
    throw new Error('Caption and image_url are required');
  }

  // Validate caption length
  if (caption.length > 2200) {
    throw new Error('Caption must be 2200 characters or less');
  }

  // Validate image URL format
  if (!image_url.startsWith('http://') && !image_url.startsWith('https://')) {
    throw new Error('Invalid image URL format');
  }

  // MVP: Get target accounts - if not provided, get all available accounts (no verification check)
  // Just exclude pending_verification and locked accounts
  let accountIds = target_accounts;
  if (!accountIds || accountIds.length === 0) {
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, status, locked_until')
      .eq('user_id', userId)
      .neq('status', 'pending_verification');

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    // Filter out locked accounts (accounts that are currently locked)
    const now = new Date();
    const availableAccounts = (accounts || []).filter(
      (acc) => !acc.locked_until || new Date(acc.locked_until) < now
    );
    accountIds = availableAccounts?.map((acc) => acc.id) || [];
    
    if (accountIds.length === 0) {
      throw new Error('No available accounts found. Please add an account first.');
    }
  } else {
    // Verify all target accounts belong to user
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, platform')
      .eq('user_id', userId)
      .in('id', accountIds);

    if (accountsError) {
      throw new Error(`Failed to verify accounts: ${accountsError.message}`);
    }

    if (accounts.length !== accountIds.length) {
      throw new Error('One or more target accounts not found or access denied');
    }
  }

  // Get platform from target accounts (use first account's platform)
  // For now, we assume all target accounts are from the same platform
  // TODO: Support multiple platforms by creating separate jobs per platform
  const { data: targetAccountsData, error: targetAccountsError } = await supabase
    .from('accounts')
    .select('platform')
    .eq('user_id', userId)
    .in('id', accountIds)
    .limit(1);

  if (targetAccountsError || !targetAccountsData || targetAccountsData.length === 0) {
    throw new Error('Failed to determine platform from target accounts');
  }

  const platform = targetAccountsData[0].platform;

  // Find post workflow for this platform
  const { data: workflows, error: workflowError } = await supabase
    .from('workflows')
    .select('*')
    .eq('platform', platform)
    .eq('type', 'post')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (workflowError) {
    throw new Error(`Failed to find post workflow: ${workflowError.message}`);
  }

  if (!workflows || workflows.length === 0) {
    throw new Error(`No post workflow found for platform: ${platform}. Please create a post workflow first.`);
  }

  let postWorkflow = workflows[0];

  // Parse steps if it's a string (JSONB fields might be returned as strings)
  if (postWorkflow.steps && typeof postWorkflow.steps === 'string') {
    try {
      postWorkflow.steps = JSON.parse(postWorkflow.steps);
    } catch (parseError) {
      throw new Error(`Failed to parse workflow steps: ${parseError.message}`);
    }
  }

  // Populate micro_actions in workflow steps
  if (postWorkflow.steps && Array.isArray(postWorkflow.steps)) {
    const microActionIds = postWorkflow.steps
      .map((step) => step.micro_action_id)
      .filter(Boolean);

    if (microActionIds.length > 0) {
      const { data: microActions, error: microActionsError } = await supabase
        .from('micro_actions')
        .select('id, name, type, platform, params')
        .in('id', microActionIds);

      if (microActionsError) {
        throw new Error(`Failed to load micro-actions: ${microActionsError.message}`);
      }

      // Populate micro_actions in steps
      postWorkflow = populateMicroActions(postWorkflow, microActions || []);
    }
  }

  // Check if post workflow requires auth and load auth workflow if needed
  let authWorkflowActions = [];
  if (postWorkflow.requires_auth && postWorkflow.auth_workflow_id) {
    // Load auth workflow by ID
    const { data: authWorkflows, error: authWorkflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', postWorkflow.auth_workflow_id)
      .eq('is_active', true)
      .single();

    if (authWorkflowError || !authWorkflows) {
      throw new Error(`Failed to load auth workflow: ${authWorkflowError?.message || 'Auth workflow not found'}`);
    }

    let authWorkflow = authWorkflows;

    // Parse steps if it's a string
    if (authWorkflow.steps && typeof authWorkflow.steps === 'string') {
      try {
        authWorkflow.steps = JSON.parse(authWorkflow.steps);
      } catch (parseError) {
        throw new Error(`Failed to parse auth workflow steps: ${parseError.message}`);
      }
    }

    // Populate micro_actions in auth workflow steps
    if (authWorkflow.steps && Array.isArray(authWorkflow.steps)) {
      const authMicroActionIds = authWorkflow.steps
        .map((step) => step.micro_action_id)
        .filter(Boolean);

      if (authMicroActionIds.length > 0) {
        const { data: authMicroActions, error: authMicroActionsError } = await supabase
          .from('micro_actions')
          .select('id, name, type, platform, params')
          .in('id', authMicroActionIds);

        if (authMicroActionsError) {
          throw new Error(`Failed to load auth workflow micro-actions: ${authMicroActionsError.message}`);
        }

        // Populate micro_actions in auth workflow steps
        authWorkflow = populateMicroActions(authWorkflow, authMicroActions || []);
      }
    }

    // Convert auth workflow to actions format
    const convertedAuthWorkflow = convertWorkflowToActions(authWorkflow);
    authWorkflowActions = convertedAuthWorkflow.actions || [];
  }

  // Convert post workflow from database format (steps) to execution format (actions)
  const convertedPostWorkflow = convertWorkflowToActions(postWorkflow);
  const postWorkflowActions = convertedPostWorkflow.actions || [];

  // Combine workflows: auth actions first, then post actions
  const combinedActions = [...authWorkflowActions, ...postWorkflowActions];
  
  // Create combined workflow object
  const combinedWorkflow = {
    id: postWorkflow.id,
    name: postWorkflow.name,
    platform: postWorkflow.platform,
    type: postWorkflow.type,
    description: postWorkflow.description,
    actions: combinedActions,
  };

  // Build content object with workflow and post data
  // The workflow will be used by the client agent to execute the post
  // Template variables like {{caption}} and {{image_url}} can be used in workflow actions
  const content = {
    workflow_id: postWorkflow.id,
    workflow: combinedWorkflow, // Store combined workflow with auth + post actions
    platform: platform,
    caption,
    image_url,
  };

  // Determine status and scheduled_for
  const status = scheduled_for && new Date(scheduled_for) > new Date() ? 'queued' : 'queued';
  const scheduledFor = scheduled_for ? new Date(scheduled_for).toISOString() : null;

  // Create job
  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      job_type: 'post',
      status,
      content,
      target_accounts: accountIds,
      scheduled_for: scheduledFor,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  return job;
}

