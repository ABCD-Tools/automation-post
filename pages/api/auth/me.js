import { authenticateRequest } from '@modules-logic/middleware/auth.js';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

/**
 * Get current user information including tier
 * GET /api/auth/me
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);

    const supabase = createSupabaseServiceRoleClient();

    // Get user info from users table
    const { data: userRows, error: userError } = await supabase
      .from('users')
      .select('id, email, tier, created_at')
      .eq('id', user.id)
      .limit(1);

    // Handle case where user doesn't exist in users table
    let userInfo = null;
    
    // Check if user exists in users table (userRows is an array, check length)
    if (userRows && Array.isArray(userRows) && userRows.length > 0) {
      // User exists in users table - use that data
      userInfo = {
        id: userRows[0].id,
        email: userRows[0].email,
        tier: userRows[0].tier || 'free',
        created_at: userRows[0].created_at,
      };
    } else {
      // User doesn't exist in users table - get email and check admin role from Supabase Auth
      // Only throw if it's a real error (not just "not found")
      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }
      
      // Fetch user from Supabase Auth to get email and check admin role
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
      
      // Check if user has admin role in Supabase Auth metadata
      const isAdmin = 
        authUser?.user?.app_metadata?.role === 'admin' ||
        authUser?.user?.user_metadata?.role === 'admin';
      
      // Determine tier: if admin in Auth but not in users table, default to 'premium'
      // Otherwise default to 'free'
      const defaultTier = isAdmin ? 'premium' : 'free';
      
      userInfo = {
        id: user.id,
        email: authUser?.user?.email || user.email || 'unknown',
        tier: defaultTier,
        created_at: null,
      };
    }

    return res.status(200).json(userInfo);
  } catch (error) {
    console.error('Error getting user info:', error);

    if (error.message?.includes('authorization') || error.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

