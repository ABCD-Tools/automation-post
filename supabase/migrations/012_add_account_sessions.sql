-- Migration 012: Account Session Management
-- Purpose: Track social media account sessions and re-authentication status
-- This migration adds columns to the accounts table for better session management

-- Add session_valid_until column (when cookies expire)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS session_valid_until TIMESTAMPTZ;

-- Add needs_reauth column (flagged when login fails)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS needs_reauth BOOLEAN DEFAULT FALSE;

-- Add last_auth_attempt column (last time we tried to authenticate)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS last_auth_attempt TIMESTAMPTZ;

-- Add auth_failure_count column (consecutive failures)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS auth_failure_count INTEGER DEFAULT 0;

-- Add locked_until column (temporary lock after multiple failures)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_accounts_session_valid_until ON public.accounts(session_valid_until);
CREATE INDEX IF NOT EXISTS idx_accounts_needs_reauth ON public.accounts(needs_reauth);

-- Create composite index for accounts needing re-auth
CREATE INDEX IF NOT EXISTS idx_accounts_needs_reauth_user 
    ON public.accounts(user_id, needs_reauth) 
    WHERE needs_reauth = TRUE;

-- Create index for locked accounts
CREATE INDEX IF NOT EXISTS idx_accounts_locked_until 
    ON public.accounts(locked_until) 
    WHERE locked_until IS NOT NULL;

-- Update existing accounts with default values
UPDATE public.accounts
SET 
    session_valid_until = CASE 
        WHEN encrypted_cookies IS NOT NULL THEN NOW() + INTERVAL '7 days'
        ELSE NULL
    END,
    needs_reauth = FALSE,
    auth_failure_count = 0
WHERE session_valid_until IS NULL OR needs_reauth IS NULL OR auth_failure_count IS NULL;

-- Add comments
COMMENT ON COLUMN public.accounts.session_valid_until IS 'When the session cookies expire and need to be refreshed';
COMMENT ON COLUMN public.accounts.needs_reauth IS 'Flagged to TRUE when login fails and user needs to re-authenticate';
COMMENT ON COLUMN public.accounts.last_auth_attempt IS 'Last time we attempted to authenticate this account';
COMMENT ON COLUMN public.accounts.auth_failure_count IS 'Number of consecutive authentication failures';
COMMENT ON COLUMN public.accounts.locked_until IS 'Temporary lock timestamp after multiple authentication failures';

