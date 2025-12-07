-- Migration 012: Add client_id to accounts table
-- Purpose: Link accounts to specific clients for encryption key management
-- This allows accounts to be encrypted with the client's encryption key

-- Add client_id column to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS client_id VARCHAR(100) REFERENCES public.clients(client_id) ON DELETE SET NULL;

-- Create index for query performance
CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON public.accounts(client_id);

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.client_id IS 'Client ID that this account is encrypted for. Used to determine which encryption key to use for decryption.';

