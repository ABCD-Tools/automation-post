import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

const supabase = createSupabaseServiceRoleClient();

/**
 * Update user profile information
 * @param {string} userId - Supabase auth user ID
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated user profile
 */
export async function updateUserProfile(userId, profileData) {
  // Check if user exists in users table
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  const updateData = {};
  if (profileData.email !== undefined) updateData.email = profileData.email;
  if (profileData.tier !== undefined) updateData.tier = profileData.tier;
  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }

  if (existingUser) {
    // Update existing user in users table
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, tier, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return user;
  } else {
    // Create user record if it doesn't exist
    // Note: We can't update email in Supabase Auth directly via this service
    // Email updates should be handled through Supabase Auth API
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: profileData.email || 'unknown',
        tier: profileData.tier || 'free',
        ...updateData,
      })
      .select('id, email, tier, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return user;
  }
}

/**
 * Get user profile information
 * @param {string} userId - Supabase auth user ID
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, tier, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // User doesn't exist in users table, get from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      return {
        id: userId,
        email: authUser?.user?.email || 'unknown',
        tier: 'free',
        created_at: null,
        updated_at: null,
      };
    }
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return user;
}

