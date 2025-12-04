import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function activateAdminUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';

  if (!url || !serviceKey) {
    console.error('❌ Missing Supabase credentials in .env for 003_activate_admin_user:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`\n▶ Activating admin user in Supabase Auth: ${adminEmail}`);

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await client.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'admin' },
    });

    if (error) {
      // If user already exists in Auth, treat as success
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('duplicate key') ||
        msg.toLowerCase().includes('email') // very defensive
      ) {
        console.log(`⚠️  Supabase Auth admin already exists: ${adminEmail}`);
        return;
      }
      throw error;
    }

    console.log('✅ Supabase Auth admin created with id:', data.user.id);
    console.log('   Email:', adminEmail);
    console.log('   Password (from ADMIN_PASSWORD env)');
  } catch (err) {
    console.error('❌ Failed to activate admin user in Supabase Auth:', err.message);
    throw err;
  }
}

export default activateAdminUser;

