-- Migration 008: Installer Downloads Tracking
-- Purpose: Track installer downloads and installations
-- This migration creates a table to track installer download tokens and installation status

-- Create installer_downloads table
CREATE TABLE IF NOT EXISTS public.installer_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User relationship
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Download token (one-time use, unique)
    download_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Installation configuration
    install_path TEXT,
    browser_path TEXT,
    encryption_key_hash TEXT,
    
    -- Client relationship (set after installation)
    client_id VARCHAR(100) REFERENCES public.clients(client_id) ON DELETE SET NULL,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'installed', 'failed', 'expired')),
    
    -- Timestamps
    downloaded_at TIMESTAMPTZ,
    installed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_installer_downloads_user_id ON public.installer_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_installer_downloads_token ON public.installer_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_installer_downloads_status ON public.installer_downloads(status);
CREATE INDEX IF NOT EXISTS idx_installer_downloads_expires_at ON public.installer_downloads(expires_at);

-- Create index for active downloads (not installed)
-- Note: expires_at > NOW() check should be done in application code, not in index predicate
-- because NOW() is not immutable
CREATE INDEX IF NOT EXISTS idx_installer_downloads_active 
    ON public.installer_downloads(expires_at, status) 
    WHERE status IN ('pending', 'downloaded');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.installer_downloads TO authenticated;
GRANT ALL ON TABLE public.installer_downloads TO service_role;

-- Enable Row Level Security
ALTER TABLE public.installer_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own downloads
DROP POLICY IF EXISTS "Users can view their own installer downloads" ON public.installer_downloads;
CREATE POLICY "Users can view their own installer downloads"
    ON public.installer_downloads
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own downloads
DROP POLICY IF EXISTS "Users can insert their own installer downloads" ON public.installer_downloads;
CREATE POLICY "Users can insert their own installer downloads"
    ON public.installer_downloads
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own downloads (for status changes)
DROP POLICY IF EXISTS "Users can update their own installer downloads" ON public.installer_downloads;
CREATE POLICY "Users can update their own installer downloads"
    ON public.installer_downloads
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.installer_downloads IS 'Tracks installer downloads and installation status for users';
COMMENT ON COLUMN public.installer_downloads.download_token IS 'One-time use token for downloading the installer package';
COMMENT ON COLUMN public.installer_downloads.status IS 'Status: pending (created), downloaded (file downloaded), installed (agent installed), failed (installation failed), expired (token expired)';
COMMENT ON COLUMN public.installer_downloads.metadata IS 'Additional metadata: installer config, user agent, IP address, etc.';

