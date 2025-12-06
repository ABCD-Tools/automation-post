-- Migration 009: Workflow Cache for Client Agents
-- Purpose: Add workflow caching for client agents to reduce API calls
-- This migration creates a table to cache workflows locally on client agents

-- Create workflow_cache table
CREATE TABLE IF NOT EXISTS public.workflow_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    client_id VARCHAR(100) NOT NULL REFERENCES public.clients(client_id) ON DELETE CASCADE,
    
    -- Cached workflow data (full workflow with micro-actions embedded)
    cached_workflow JSONB NOT NULL,
    
    -- Version tracking
    version VARCHAR(20),
    
    -- Usage tracking
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_workflow_cache_workflow_id ON public.workflow_cache(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_cache_client_id ON public.workflow_cache(client_id);
CREATE INDEX IF NOT EXISTS idx_workflow_cache_last_used ON public.workflow_cache(last_used_at DESC);

-- Create unique index to prevent duplicate cache entries
CREATE UNIQUE INDEX IF NOT EXISTS unique_workflow_client 
    ON public.workflow_cache(workflow_id, client_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workflow_cache TO authenticated;
GRANT ALL ON TABLE public.workflow_cache TO service_role;

-- Enable Row Level Security
ALTER TABLE public.workflow_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view cache for their own clients
CREATE POLICY "Users can view cache for their own clients"
    ON public.workflow_cache
    FOR SELECT
    TO authenticated
    USING (
        client_id IN (
            SELECT client_id FROM public.clients WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Service role can manage all cache (for client agents)
-- Note: Client agents use service role API key, so they can insert/update cache

-- Add comments
COMMENT ON TABLE public.workflow_cache IS 'Caches workflows locally on client agents to reduce API calls';
COMMENT ON COLUMN public.workflow_cache.cached_workflow IS 'Full workflow JSON with micro-actions embedded for offline use';
COMMENT ON COLUMN public.workflow_cache.version IS 'Workflow version when cached, used to check if cache needs update';
COMMENT ON COLUMN public.workflow_cache.use_count IS 'Number of times this cached workflow has been used';

