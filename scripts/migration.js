// scripts/migrate.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Execute raw SQL using Supabase RPC
 */
async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }
  
  return data;
}

/**
 * Run a single SQL migration file
 */
async function runSqlFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n▶ Running migration: ${fileName}`);

  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolon and filter empty statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      // Skip comments
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      // Execute each statement
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });

      if (error) {
        throw new Error(`Failed: ${error.message}\nStatement: ${statement.substring(0, 100)}...`);
      }
    }

    console.log(`✅ Migration completed: ${fileName}`);
  } catch (error) {
    console.error(`❌ Migration failed for ${fileName}:`, error.message);
    process.exit(1);
  }
}

/**
 * Fresh migrate: drop and recreate schema
 */
async function freshMigrate(migrationFiles) {
  console.log('⚠️  Performing FRESH migrate: dropping and recreating schema...');

  try {
    const resetSql = `
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: resetSql });
    
    if (error) {
      throw new Error(`Schema reset failed: ${error.message}`);
    }

    console.log('✅ Schema reset complete. Running all migrations...');

    for (const file of migrationFiles) {
      await runSqlFile(path.join(MIGRATIONS_DIR, file));
    }

    console.log('\n✅ Fresh migrate completed successfully.');
  } catch (error) {
    console.error('❌ Fresh migrate failed:', error.message);
    process.exit(1);
  }
}

/**
 * Get all .sql migration files sorted by filename
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    console.log('Creating migrations directory...');
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const firstArg = args[0];

  const allMigrations = getMigrationFiles();

  if (allMigrations.length === 0) {
    console.log('⚠️  No migration files found.');
    return;
  }

  try {
    // Fresh migrate
    if (firstArg === '--fresh') {
      await freshMigrate(allMigrations);
      return;
    }

    // Selected migrate by prefix
    if (firstArg && !firstArg.startsWith('-')) {
      const prefix = firstArg;
      const selected = allMigrations.filter((file) => file.startsWith(prefix));

      if (selected.length === 0) {
        console.error(`❌ No migrations found matching prefix "${prefix}"`);
        process.exit(1);
      }

      console.log(`▶ Running migrations matching "${prefix}":`);
      for (const file of selected) {
        await runSqlFile(path.join(MIGRATIONS_DIR, file));
      }
      console.log('\n✅ Selected migrations completed.');
      return;
    }

    // Default: run all migrations
    console.log('▶ Running ALL migrations in order:');
    for (const file of allMigrations) {
      await runSqlFile(path.join(MIGRATIONS_DIR, file));
    }
    console.log('\n✅ All migrations completed successfully.');

  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

main();