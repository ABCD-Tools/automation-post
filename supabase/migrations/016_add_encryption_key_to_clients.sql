-- Migration 016: Add encryption_key to clients table
-- Purpose: Store client's ENCRYPTION_KEY for account encryption
-- This allows the server to use the same key that the client uses for decryption
-- Note: This is stored in plain text on the server (server-side only, never exposed to client)

-- Add encryption_key column to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS encryption_key TEXT;

-- Create index for query performance
CREATE INDEX IF NOT EXISTS idx_clients_encryption_key ON public.clients(encryption_key) WHERE encryption_key IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.encryption_key IS 'Client ENCRYPTION_KEY (plain text, server-side only). Used to encrypt accounts for this client. Never exposed to client or API.';

