## Database migrations with Supabase CLI

This project uses plain SQL migrations stored in `supabase/migrations`.  
You can manage them locally using the **Supabase CLI** via `npx` (no global install required).

---

### 1. Prerequisites

- **Node.js / pnpm** installed
- A running **Postgres / Supabase** database
- A database connection string exported as `DATABASE_URL`

Create or update your root `.env` file:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
```

For a Supabase project, copy the connection string from the dashboard (e.g. “Connection string → psql”) and paste it here.

---

### 2. Running the built-in helpers (`psql` required)

The project ships with convenience scripts that call `psql` under the hood.  
Make sure the PostgreSQL CLI (`psql`) is installed and available on your PATH.

```bash
# Apply all migrations
pnpm migrate

# Drop and recreate schema, then apply migrations
pnpm migrate:fresh

# Run SQL seeders (e.g. create admin user)
pnpm seed
```

These scripts read `DATABASE_URL` from `.env` and pass it directly to `psql`.

---

### 3. Running Supabase CLI via `npx`

If you prefer to use the Supabase CLI directly, you don’t need to install it globally. From the project root:

```bash
npx supabase init
```

Then you can run:

```bash
npx supabase --help
```

---

### 4. Initialize migrations (if needed)

If you ever need to (re)initialize the migrations folder:

```bash
npx supabase init
```

This will create a `supabase/` directory if it doesn’t exist.  
In this repo, `supabase/migrations/` already exists with SQL files, so you can usually skip this.

---

### 5. Creating a new migration

To create a new empty SQL migration:

```bash
npx supabase migration new my_change_name
```

This will create a file like:

```text
supabase/migrations/20250101010101_my_change_name.sql
```

Edit that file and add your SQL `CREATE TABLE`, `ALTER TABLE`, etc.

---

### 6. Applying migrations to the database

Use `db push` to apply all pending migrations to the database pointed to by `DATABASE_URL`:

```bash
npx supabase db push --db-url "$DATABASE_URL"
```

This will:

- Read all SQL files under `supabase/migrations/`
- Apply any migrations that have not yet been run

---

### 6. Resetting the database (fresh migrate)

To drop and recreate the schema from scratch using all migrations:

```bash
npx supabase db reset --force --db-url "$DATABASE_URL"
```

This is useful in local development when you want a clean database.

---

### 7. Running a specific migration file (advanced)

Supabase CLI doesn’t directly support “run only this one file” against a remote DB, but you can:

1. Copy the SQL from the specific migration (e.g. `supabase/migrations/001_initialization.sql`)
2. Run it manually with `psql`:

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_initialization.sql
```

In most cases, you should prefer `db push` / `db reset` so Supabase keeps track of migration history.

---

### 8. Suggested `pnpm` scripts

For convenience, you can add these to `package.json`:

```json
{
  "scripts": {
    "migrate": "npx supabase db push --db-url \"$DATABASE_URL\"",
    "migrate:fresh": "npx supabase db reset --force --db-url \"$DATABASE_URL\""
  }
}
```

Then you can run:

```bash
pnpm migrate
pnpm migrate:fresh
```

Make sure `DATABASE_URL` is set in your environment (e.g. via `.env`) before running these commands.


