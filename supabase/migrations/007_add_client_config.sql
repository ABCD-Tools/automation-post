-- Migration 007: Add Installer Configuration to Clients Table
-- Purpose: Add installer configuration tracking to clients table
-- This migration adds columns needed for the installer system

-- Add browser_path column (path to Chrome/Edge executable)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS browser_path TEXT;

-- Add encryption_key_hash column (hash of client's local AES key for verification)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS encryption_key_hash TEXT;

-- Add installation_source column (web/api/manual)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS installation_source VARCHAR(50) DEFAULT 'manual';

-- Add installer_version column (version of installer used)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS installer_version VARCHAR(20);

-- Add auto_start column (whether agent starts on boot)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS auto_start BOOLEAN DEFAULT FALSE;

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_clients_installation_source ON public.clients(installation_source);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Update existing clients with default values
UPDATE public.clients
SET 
    installation_source = COALESCE(installation_source, 'manual'),
    auto_start = COALESCE(auto_start, FALSE)
WHERE installation_source IS NULL OR auto_start IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.clients.browser_path IS 'Path to Chrome/Edge executable used by the client agent';
COMMENT ON COLUMN public.clients.encryption_key_hash IS 'Hash of the client''s local AES encryption key for verification';
COMMENT ON COLUMN public.clients.installation_source IS 'Source of installation: web (from website), api (via API), or manual';
COMMENT ON COLUMN public.clients.installer_version IS 'Version of the installer used to install this client';
COMMENT ON COLUMN public.clients.auto_start IS 'Whether the agent should start automatically on system boot';

