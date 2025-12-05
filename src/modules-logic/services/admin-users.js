// Admin user management service

import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

const supabase = createSupabaseServiceRoleClient();

/**
 * List all users (admin only)
 * @param {Object} filters - Optional filters
 * @param {string} filters.tier - Filter by tier
 * @param {string} filters.search - Search by email
 * @param {number} filters.limit - Limit number of results
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Object>} Object with users array and pagination info
 */
export async function listUsers(filters = {}) {
  // Get users ONLY from users table (single source of truth)
  let query = supabase.from('users').select('*').order('created_at', { ascending: false });

  // Apply filters
  if (filters.tier && filters.tier !== 'all') {
    query = query.eq('tier', filters.tier);
  }

  if (filters.search) {
    query = query.ilike('email', `%${filters.search}%`);
  }

  // Get total count before pagination
  const { count: totalCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Apply pagination
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data: usersTable, error: usersError } = await query;

  if (usersError) {
    throw new Error(`Failed to fetch users: ${usersError.message}`);
  }

  // Transform users table data to match expected format
  const users = (usersTable || []).map((user) => ({
    id: user.id,
    email: user.email,
    tier: user.tier || 'free',
    emailVerified: user.email_verified || false,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastSignInAt: null, // Not stored in users table
    isActive: true, // All users in table are considered active
  }));

  return {
    users,
    count: users.length,
    total: totalCount || 0,
    limit,
    offset,
  };
}

/**
 * Get a single user by ID (admin only)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object from users table
 */
export async function getUser(userId) {
  // Get user from users table only (single source of truth)
  const { data: userTable, error: tableError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (tableError) {
    if (tableError.code === 'PGRST116') {
      throw new Error('User not found');
    }
    throw new Error(`Failed to fetch user: ${tableError.message}`);
  }

  if (!userTable) {
    throw new Error('User not found');
  }

  // Transform to match expected format
  const user = {
    id: userTable.id,
    email: userTable.email,
    tier: userTable.tier || 'free',
    emailVerified: userTable.email_verified || false,
    createdAt: userTable.created_at,
    updatedAt: userTable.updated_at,
    lastSignInAt: null, // Not stored in users table
    isActive: true, // All users in table are considered active
  };

  return user;
}

/**
 * Update a user (admin only)
 * @param {string} userId - User ID to update
 * @param {Object} userData - User data to update
 * @param {string} currentUserId - Current admin user ID (to prevent self-editing)
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUser(userId, userData, currentUserId = null) {
  // Prevent self-editing
  if (currentUserId && userId === currentUserId) {
    throw new Error('Cannot edit your own account from admin panel. Use profile settings instead.');
  }
  const updateData = {};
  const authUpdateData = {};

  // Update users table fields
  if (userData.tier !== undefined) {
    updateData.tier = userData.tier;
  }
  if (userData.emailVerified !== undefined) {
    updateData.email_verified = userData.emailVerified;
  }
  updateData.updated_at = new Date().toISOString();

  // Update auth user if needed
  if (userData.email !== undefined) {
    authUpdateData.email = userData.email;
  }
  if (userData.isActive !== undefined) {
    if (userData.isActive) {
      authUpdateData.ban_duration = 'none'; // Unban user
    } else {
      authUpdateData.ban_duration = '876000h'; // Ban user (100 years)
    }
  }

  // Update users table
  if (Object.keys(updateData).length > 0) {
    const { data: userTable, error: tableError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (tableError && tableError.code !== 'PGRST116') {
      // If user doesn't exist in table, create it
      if (tableError.code === 'PGRST116') {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: userData.email || 'unknown',
            tier: updateData.tier || 'free',
            email_verified: updateData.email_verified || false,
            ...updateData,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create user record: ${insertError.message}`);
        }
      } else {
        throw new Error(`Failed to update user: ${tableError.message}`);
      }
    }
  }

  // Update auth user
  if (Object.keys(authUpdateData).length > 0) {
    const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      authUpdateData,
    );

    if (authError) {
      throw new Error(`Failed to update auth user: ${authError.message}`);
    }
  }

  // Return updated user
  return getUser(userId);
}

/**
 * Delete a user (admin only)
 * @param {string} userId - User ID to delete
 * @param {string} currentUserId - Current admin user ID (to prevent self-deletion)
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteUser(userId, currentUserId = null) {
  // Prevent self-deletion
  if (currentUserId && userId === currentUserId) {
    throw new Error('Cannot delete your own account');
  }

  // Delete from auth (this will cascade delete from users table due to foreign key)
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    throw new Error(`Failed to delete user: ${authError.message}`);
  }

  return { success: true, userId };
}

/**
 * Get user statistics (admin only)
 * @returns {Promise<Object>} User statistics from users table
 */
export async function getUserStatistics() {
  // Get all users from users table only (single source of truth)
  const { data: usersTable, error: tableError } = await supabase
    .from('users')
    .select('tier, email_verified, created_at');

  if (tableError) {
    throw new Error(`Failed to fetch user statistics: ${tableError.message}`);
  }

  // Calculate statistics
  const totalUsers = usersTable?.length || 0;
  const activeUsers = totalUsers; // All users in table are considered active
  const verifiedUsers = usersTable?.filter((u) => u.email_verified === true).length || 0;

  // Tier distribution
  const tierDistribution = {};
  usersTable?.forEach((user) => {
    const tier = user.tier || 'free';
    tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
  });

  // Recent users (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentUsers = usersTable?.filter(
    (u) => new Date(u.created_at) >= sevenDaysAgo,
  ).length || 0;

  return {
    total: totalUsers,
    active: activeUsers,
    verified: verifiedUsers,
    recent: recentUsers,
    tierDistribution,
  };
}

