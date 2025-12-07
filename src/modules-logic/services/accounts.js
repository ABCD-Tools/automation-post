import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

const supabase = createSupabaseServiceRoleClient();

/**
 * Add a new social media account for a user
 * @param {string} userId - Supabase auth user ID
 * @param {Object} accountData - Account data
 * @param {string} accountData.platform - Platform name (instagram, facebook, twitter)
 * @param {string} accountData.username - Account username
 * @param {string} accountData.encryptedPassword - Password encrypted client-side
 * @param {string} accountData.clientId - Client ID (UUID) that this account is encrypted for
 * @returns {Promise<Object>} Created account object
 */
export async function addAccount(userId, accountData) {
  const { platform, username, encryptedPassword, clientId } = accountData;

  if (!platform || !username || !encryptedPassword) {
    throw new Error('Platform, username, and encrypted password are required');
  }

  if (!clientId) {
    throw new Error('Client ID is required');
  }

  // Verify client exists and belongs to user
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('client_id')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (clientError || !client) {
    throw new Error('Client not found or access denied');
  }

  // Validate platform
  const validPlatforms = ['instagram', 'facebook', 'twitter'];
  if (!validPlatforms.includes(platform.toLowerCase())) {
    throw new Error(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
  }

  // Check account limit for free tier
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single();

  if (userError) {
    throw new Error('Failed to fetch user data');
  }

  // Check existing accounts count
  const { count, error: countError } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    throw new Error('Failed to check account limit');
  }

  // Free tier: Max 3 accounts
  if (userData.tier === 'free' && count >= 3) {
    throw new Error('Free tier limit reached. Maximum 3 accounts allowed.');
  }

  // Insert account with status 'active' (no verification needed for social media accounts)
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      platform: platform.toLowerCase(),
      username,
      encrypted_password: encryptedPassword,
      client_id: client.client_id, // Store client_id string, not UUID
      status: 'active',
    })
    .select()
    .single();

  if (accountError) {
    throw new Error(`Failed to create account: ${accountError.message}`);
  }

  return {
    account,
  };
}

/**
 * List all accounts for a user
 * @param {string} userId - Supabase auth user ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.platform - Filter by platform
 * @param {string} filters.status - Filter by status
 * @returns {Promise<Array>} Array of account objects
 */
export async function listAccounts(userId, filters = {}) {
  let query = supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters.platform) {
    query = query.eq('platform', filters.platform.toLowerCase());
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  // Don't return encrypted passwords in the response
  return data.map(({ encrypted_password, encrypted_cookies, ...account }) => account);
}

/**
 * Trigger verification for an account
 * @param {string} userId - Supabase auth user ID
 * @param {string} accountId - Account ID to verify
 * @returns {Promise<Object>} Verification job object
 */
export async function verifyAccount(userId, accountId) {
  // Verify account belongs to user
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (accountError || !account) {
    throw new Error('Account not found or access denied');
  }

  // Update account status to pending_verification
  const { error: updateError } = await supabase
    .from('accounts')
    .update({ status: 'pending_verification' })
    .eq('id', accountId);

  if (updateError) {
    throw new Error(`Failed to update account status: ${updateError.message}`);
  }

  // Create verification job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      job_type: 'verify_account',
      status: 'queued',
      content: {
        account_id: accountId,
        platform: account.platform,
        username: account.username,
      },
      target_accounts: [accountId],
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (jobError) {
    throw new Error(`Failed to create verification job: ${jobError.message}`);
  }

  return job;
}

/**
 * Get a single account by ID
 * @param {string} userId - Supabase auth user ID
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Account object
 */
export async function getAccount(userId, accountId) {
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Account not found');
    }
    throw new Error(`Failed to fetch account: ${error.message}`);
  }

  if (!account) {
    throw new Error('Account not found or access denied');
  }

  // Don't return encrypted password and cookies
  const { encrypted_password, encrypted_cookies, ...accountData } = account;
  return accountData;
}

/**
 * Update an account
 * @param {string} userId - Supabase auth user ID
 * @param {string} accountId - Account ID
 * @param {Object} accountData - Account data to update
 * @returns {Promise<Object>} Updated account object
 */
export async function updateAccount(userId, accountId, accountData) {
  // Verify account belongs to user
  const { data: existingAccount, error: checkError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingAccount) {
    throw new Error('Account not found or access denied');
  }

  // Build update object
  const updateData = {};
  if (accountData.username !== undefined) updateData.username = accountData.username;
  if (accountData.encryptedPassword !== undefined) {
    updateData.encrypted_password = accountData.encryptedPassword;
  }
  if (accountData.status !== undefined) updateData.status = accountData.status;
  if (accountData.encryptedCookies !== undefined) {
    updateData.encrypted_cookies = accountData.encryptedCookies;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .update(updateData)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update account: ${error.message}`);
  }

  // Don't return encrypted password and cookies
  const { encrypted_password, encrypted_cookies, ...safeAccountData } = account;
  return safeAccountData;
}

/**
 * Delete an account
 * @param {string} userId - Supabase auth user ID
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteAccount(userId, accountId) {
  // Verify account belongs to user
  const { data: existingAccount, error: checkError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingAccount) {
    throw new Error('Account not found or access denied');
  }

  // Hard delete the account
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete account: ${error.message}`);
  }

  return { success: true, accountId };
}