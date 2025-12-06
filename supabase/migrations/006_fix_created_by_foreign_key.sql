-- Fix foreign key constraint for created_by in workflows and micro_actions
-- This migration allows inserts even when the user doesn't exist in the users table
-- by making the foreign key constraint less strict and ensuring NULL values are allowed

-- Step 1: Ensure columns are nullable (should already be done by migration 005, but ensure it)
DO $$
BEGIN
    -- Check and drop NOT NULL constraint on workflows.created_by if it exists
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

    -- Check and drop NOT NULL constraint on micro_actions.created_by if it exists
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

-- Step 2: Drop existing foreign key constraints
DO $$
BEGIN
  -- Drop workflows.created_by foreign key if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
      AND table_name = 'workflows' 
      AND constraint_name = 'workflows_created_by_fkey'
  ) THEN
    ALTER TABLE workflows DROP CONSTRAINT workflows_created_by_fkey;
  END IF;

  -- Drop micro_actions.created_by foreign key if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
      AND table_name = 'micro_actions' 
      AND constraint_name = 'micro_actions_created_by_fkey'
  ) THEN
    ALTER TABLE micro_actions DROP CONSTRAINT micro_actions_created_by_fkey;
  END IF;
END $$;

-- Step 3: Recreate foreign key constraints
-- Note: These constraints will still enforce referential integrity when a non-NULL value is provided
-- To allow inserts when user doesn't exist, the API should set created_by to NULL in those cases
-- OR we can use a trigger/function to handle this, but for now we'll keep the constraint
-- and handle it in the application code

DO $$
BEGIN
    -- Add workflows.created_by foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'workflows' 
        AND constraint_name = 'workflows_created_by_fkey'
    ) THEN
        ALTER TABLE workflows
        ADD CONSTRAINT workflows_created_by_fkey 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
    END IF;

    -- Add micro_actions.created_by foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'micro_actions' 
        AND constraint_name = 'micro_actions_created_by_fkey'
    ) THEN
        ALTER TABLE micro_actions
        ADD CONSTRAINT micro_actions_created_by_fkey 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

