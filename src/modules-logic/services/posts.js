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

