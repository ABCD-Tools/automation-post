import { createClient } from '@supabase/supabase-js';

const ensureEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const supabaseUrl = ensureEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = ensureEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Server-side client for working with Supabase Auth (no persisted session).
const supabaseServerClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

/**
 * Register a new user with email/password using Supabase Auth.
 * Also creates a record in the users table.
 * Supabase sends the verification email automatically.
 */
export async function registerWithEmail(email, password) {
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
    : undefined;

  // Register user in Supabase Auth
  const { data, error } = await supabaseServerClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  // If user was created successfully, also create record in users table
  if (data.user) {
    // Import service role client for database operations
    const { createSupabaseServiceRoleClient } = await import('@modules-view/utils/supabase.js');
    const supabaseService = createSupabaseServiceRoleClient();

    // Create user record in users table
    // Note: password_hash is required by schema, but password is stored in Supabase Auth
    // Using a placeholder hash to satisfy the NOT NULL constraint
    const { error: userError } = await supabaseService
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        password_hash: 'auth_stored', // Placeholder - password is stored in Supabase Auth, not in users table
        email_verified: data.user.email_confirmed_at !== null,
        tier: 'free', // Default tier
        created_at: data.user.created_at,
        updated_at: new Date().toISOString(),
      });

    // If insert fails, log but don't fail registration (user is already in Auth)
    if (userError) {
      console.error('Failed to create user record in users table:', userError);
      // Don't throw - user is registered in Auth, table record can be created later
    }
  }

  return data;
}

/**
 * Log in with email and password. Returns session + user.
 * If the email is not verified yet, Supabase will reject the login.
 */
export async function loginWithEmail(email, password) {
  const { data, error } = await supabaseServerClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Verify a Supabase JWT access token and return the user if valid.
 */
export async function getUserFromAccessToken(accessToken) {
  const { data, error } = await supabaseServerClient.auth.getUser(accessToken);

  if (error) {
    throw error;
  }

  return data.user;
}

/**
 * Logout user by invalidating session
 * Note: With Supabase, logout is typically handled client-side by clearing tokens
 * This endpoint provides server-side confirmation
 */
export async function logout(accessToken) {
  // Verify token is valid before logout
  const user = await getUserFromAccessToken(accessToken);
  
  // With Supabase, we can't directly invalidate tokens server-side
  // The client should clear tokens from storage
  // This endpoint confirms logout request
  return { success: true, userId: user.id };
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email) {
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    : undefined;

  const { data, error } = await supabaseServerClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Confirm password reset with token and new password
 */
export async function confirmPasswordReset(token, newPassword) {
  // Note: Supabase handles password reset via magic links
  // This function would be used if implementing custom flow
  // For now, Supabase handles this automatically via redirect
  throw new Error('Password reset confirmation handled by Supabase via magic link');
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshToken) {
  const { data, error } = await supabaseServerClient.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Change password for authenticated user
 * Note: Supabase requires verifying current password by re-authenticating
 * For security, we verify the current password first
 */
export async function changePassword(accessToken, currentPassword, newPassword) {
  // First verify the user and get their email
  const user = await getUserFromAccessToken(accessToken);
  
  if (!user.email) {
    throw new Error('User email not found');
  }

  // Verify current password by attempting to sign in
  // This ensures the user knows their current password
  try {
    await loginWithEmail(user.email, currentPassword);
  } catch (error) {
    throw new Error('Current password is incorrect');
  }

  // Create a client with the access token to update password
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  // Update password using Supabase
  const { data, error } = await userClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  return { success: true, user: data.user };
}