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

