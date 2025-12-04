import { authenticateRequest } from './auth.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * Middleware to check if user is admin
 * @param {Object} req - Request object
 * @returns {Promise<Object>} User object if admin
 * @throws {Error} If not admin
 */
export async function requireAdmin(req) {
  // First authenticate
  const user = await authenticateRequest(req);

  // Check if user is admin via Supabase Auth metadata
  const supabase = createSupabaseServiceRoleClient();
  const { data: authUser, error } = await supabase.auth.admin.getUserById(user.id);

  if (error) {
    throw new Error('Failed to verify admin status');
  }

  const isAdmin =
    authUser.user?.app_metadata?.role === 'admin' ||
    authUser.user?.user_metadata?.role === 'admin';

  if (!isAdmin) {
    throw new Error('Admin access required');
  }

  return user;
}
