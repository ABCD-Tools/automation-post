import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

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
 * @param {Array<string>} postData.target_accounts - Array of account IDs (optional, defaults to all active)
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

  // Get target accounts - if not provided, get all active accounts for user
  let accountIds = target_accounts;
  if (!accountIds || accountIds.length === 0) {
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    accountIds = accounts?.map((acc) => acc.id) || [];
    
    if (accountIds.length === 0) {
      throw new Error('No active accounts found. Please add an account first.');
    }
  } else {
    // Verify all target accounts belong to user
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .in('id', accountIds);

    if (accountsError) {
      throw new Error(`Failed to verify accounts: ${accountsError.message}`);
    }

    if (accounts.length !== accountIds.length) {
      throw new Error('One or more target accounts not found or access denied');
    }
  }

  // Build content object
  const content = {
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

