-- Make created_by nullable in micro_actions and workflows tables
-- This allows inserts even when the user doesn't exist in the users table
-- (e.g., when using Supabase Auth users that aren't synced to the custom users table)

-- Check and alter micro_actions.created_by to allow NULL if it's currently NOT NULL
DO $$
BEGIN
  -- Check if column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'micro_actions' 
      AND column_name = 'created_by' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE micro_actions ALTER COLUMN created_by DROP NOT NULL;
  END IF;
END $$;

-- Check and alter workflows.created_by to allow NULL if it's currently NOT NULL
DO $$
BEGIN
  -- Check if column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'workflows' 
      AND column_name = 'created_by' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE workflows ALTER COLUMN created_by DROP NOT NULL;
  END IF;
END $$;

-- Note: The foreign key constraint and ON DELETE SET NULL behavior remain unchanged
-- This only allows NULL values to be inserted directly

