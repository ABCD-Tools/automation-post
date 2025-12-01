import { createClient } from '@supabase/supabase-js';

const ensureEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing Supabase environment variable: ${key}`);
  }
  return value;
};

let browserClient;

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    const url = ensureEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = ensureEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    browserClient = createClient(url, anonKey);
  }
  return browserClient;
};

export const createSupabaseServiceRoleClient = () => {
  const url = ensureEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = ensureEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
};
