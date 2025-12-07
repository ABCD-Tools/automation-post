-- Migration 010: Centralized Client Logging
-- Purpose: Centralized logging from client agents for debugging and monitoring
-- This migration creates a table to store logs from client agents

-- Create client_logs table
CREATE TABLE IF NOT EXISTS public.client_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    client_id VARCHAR(100) NOT NULL REFERENCES public.clients(client_id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    
    -- Log data
    level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_client_logs_client_id ON public.client_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_logs_job_id ON public.client_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_client_logs_level ON public.client_logs(level);
CREATE INDEX IF NOT EXISTS idx_client_logs_created_at ON public.client_logs(created_at DESC);

-- Create composite index for common queries (client + level + time)
CREATE INDEX IF NOT EXISTS idx_client_logs_client_level_time 
    ON public.client_logs(client_id, level, created_at DESC);

-- Create GIN index for full-text search on message
CREATE INDEX IF NOT EXISTS idx_client_logs_message_gin 
    ON public.client_logs USING gin(to_tsvector('english', message));

-- Grant permissions
GRANT SELECT, INSERT ON TABLE public.client_logs TO authenticated;
GRANT ALL ON TABLE public.client_logs TO service_role;

-- Enable Row Level Security
ALTER TABLE public.client_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view logs from their own clients
DROP POLICY IF EXISTS "Users can view logs from their own clients" ON public.client_logs;
CREATE POLICY "Users can view logs from their own clients"
    ON public.client_logs
    FOR SELECT
    TO authenticated
    USING (
        client_id IN (
            SELECT client_id FROM public.clients WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Service role can insert logs (client agents use service role API key)
-- Note: This allows client agents to write logs without user authentication

-- Add comments
COMMENT ON TABLE public.client_logs IS 'Centralized logging from client agents for debugging and monitoring';
COMMENT ON COLUMN public.client_logs.level IS 'Log level: error, warn, info, debug';
COMMENT ON COLUMN public.client_logs.message IS 'Log message text';
COMMENT ON COLUMN public.client_logs.context IS 'Additional log context: stack traces, error details, etc.';

-- Optional: Create a function to automatically clean up old logs (older than 30 days)
-- This can be called by a cron job or scheduled task
CREATE OR REPLACE FUNCTION public.cleanup_old_client_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.client_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_client_logs IS 'Deletes client logs older than 30 days. Should be called by a cron job.';

