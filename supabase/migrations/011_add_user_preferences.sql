-- Migration 011: User Preferences
-- Purpose: Store user preferences and settings
-- This migration creates a table to store user preferences

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User relationship (one-to-one)
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Preferences stored as JSONB for flexibility
    preferences JSONB DEFAULT '{
        "notifications": {
            "email": true,
            "browser": false,
            "jobComplete": true,
            "jobFailed": true
        },
        "ui": {
            "theme": "light",
            "language": "en"
        },
        "agent": {
            "autoStartAgent": false,
            "pollingInterval": 10000,
            "maxConcurrentJobs": 1
        }
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index (already enforced by UNIQUE constraint, but index helps performance)
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_preferences ON public.user_preferences(user_id);

-- Create index for querying preferences (if needed)
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_preferences_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_preferences TO authenticated;
GRANT ALL ON TABLE public.user_preferences TO service_role;

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
    ON public.user_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences"
    ON public.user_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own preferences
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
    ON public.user_preferences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.user_preferences IS 'Stores user preferences and settings';
COMMENT ON COLUMN public.user_preferences.preferences IS 'JSONB object containing user preferences: notifications, UI settings, agent settings, etc.';

