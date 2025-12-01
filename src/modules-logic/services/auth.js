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
 * Supabase sends the verification email automatically.
 */
export async function registerWithEmail(email, password) {
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
    : undefined;

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
