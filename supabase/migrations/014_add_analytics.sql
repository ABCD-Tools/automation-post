-- Migration 014: Analytics and Usage Tracking
-- Purpose: Basic analytics and usage tracking for the platform
-- This migration creates a table to track user events and analytics

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User relationship
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Event data
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Session tracking
    session_id VARCHAR(100),
    
    -- Request metadata
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON public.analytics_events(session_id);

-- Create composite index for common queries (user + event type + time)
CREATE INDEX IF NOT EXISTS idx_analytics_user_event_time 
    ON public.analytics_events(user_id, event_type, created_at DESC);

-- Create GIN index for querying event_data JSONB
CREATE INDEX IF NOT EXISTS idx_analytics_event_data_gin 
    ON public.analytics_events USING gin(event_data);

-- Grant permissions
GRANT SELECT, INSERT ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own analytics
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.analytics_events;
CREATE POLICY "Users can view their own analytics"
    ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own analytics
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.analytics_events;
CREATE POLICY "Users can insert their own analytics"
    ON public.analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Service role can view all (for admin dashboard)
-- Note: Admin dashboard uses service role to view aggregated analytics

-- Create materialized view for analytics summary (daily aggregations)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.analytics_summary_daily AS
SELECT 
    DATE(created_at) AS event_date,
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT session_id) AS unique_sessions
FROM public.analytics_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at), event_type
ORDER BY event_date DESC, event_count DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_analytics_summary_daily_date 
    ON public.analytics_summary_daily(event_date DESC);

-- Grant permissions on materialized view
GRANT SELECT ON public.analytics_summary_daily TO authenticated;
GRANT SELECT ON public.analytics_summary_daily TO service_role;

-- Add comments
COMMENT ON TABLE public.analytics_events IS 'Tracks user events and analytics for the platform';
COMMENT ON COLUMN public.analytics_events.event_type IS 'Type of event: page_view, button_click, job_created, etc.';
COMMENT ON COLUMN public.analytics_events.event_data IS 'Additional event data in JSON format';
COMMENT ON COLUMN public.analytics_events.session_id IS 'User session identifier for tracking user journeys';
COMMENT ON COLUMN public.analytics_events.ip_address IS 'IP address (should be anonymized for privacy)';
COMMENT ON MATERIALIZED VIEW public.analytics_summary_daily IS 'Daily aggregated analytics summary (last 90 days). Should be refreshed periodically.';

-- Note: Materialized view should be refreshed periodically (e.g., daily via cron job)
-- Example: REFRESH MATERIALIZED VIEW public.analytics_summary_daily;

