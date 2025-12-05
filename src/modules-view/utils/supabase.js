import { createClient } from '@supabase/supabase-js';

// Environment variable map for Next.js static replacement
// Next.js replaces NEXT_PUBLIC_* vars at build time, so we need direct property access
const envVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const ensureEnv = (key) => {
  // Use direct property access for Next.js static replacement
  const value = envVars[key];
  
  if (!value) {
    // Provide helpful error message
    if (typeof window !== 'undefined') {
      console.error(`Missing environment variable: ${key}`);
      console.error('Available NEXT_PUBLIC_ vars:', Object.keys(envVars).filter(k => k.startsWith('NEXT_PUBLIC_') && envVars[k]));
      console.error('Please ensure:');
      console.error('1. Create .env (or .env.local) file in project root');
      console.error('2. Add the variable:', key);
      console.error('3. Restart the dev server (pnpm dev)');
      console.error('4. Note: .env file is supported, but .env.local takes precedence');
    }
    throw new Error(`Missing environment variable: ${key}. Please check your .env or .env.local file and restart the dev server.`);
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
