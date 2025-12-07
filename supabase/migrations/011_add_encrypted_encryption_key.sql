-- Migration 011: Add encrypted_encryption_key to clients table
-- Purpose: Store client's encryption key (encrypted) for account encryption
-- This allows the web UI to encrypt accounts using the client's encryption key

-- Add encrypted_encryption_key column to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS encrypted_encryption_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.encrypted_encryption_key IS 'Client encryption key encrypted with user session key. Used by web UI to encrypt accounts for this client.';

