-- Migration 013: Job Scheduling
-- Purpose: Add scheduled job functionality for future and recurring posts
-- This migration adds columns to the jobs table for scheduling

-- Add scheduled_for column (when to execute, NULL = immediate)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Add recurring column (is this a recurring job)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT FALSE;

-- Add recurrence_rule column (cron expression or interval)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

-- Add last_run_at column (for recurring jobs)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Add next_run_at column (calculated next execution time)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

-- Add retry_count column (number of retry attempts)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add max_retries column (max retry attempts)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_for ON public.jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_next_run_at ON public.jobs(next_run_at);

-- Create composite index for scheduled jobs (status + scheduled time)
CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled 
    ON public.jobs(status, scheduled_for) 
    WHERE scheduled_for IS NOT NULL;

-- Create index for recurring jobs
CREATE INDEX IF NOT EXISTS idx_jobs_recurring 
    ON public.jobs(recurring, next_run_at) 
    WHERE recurring = TRUE;

-- Create index for jobs needing retry
CREATE INDEX IF NOT EXISTS idx_jobs_retry 
    ON public.jobs(status, retry_count, max_retries) 
    WHERE status = 'failed' AND retry_count < max_retries;

-- Add comments
COMMENT ON COLUMN public.jobs.scheduled_for IS 'When to execute the job (NULL = immediate execution)';
COMMENT ON COLUMN public.jobs.recurring IS 'Whether this is a recurring job that runs multiple times';
COMMENT ON COLUMN public.jobs.recurrence_rule IS 'Cron expression or interval (e.g., "0 9 * * *" for daily at 9 AM, or "1 day" for every day)';
COMMENT ON COLUMN public.jobs.last_run_at IS 'Last time this recurring job was executed';
COMMENT ON COLUMN public.jobs.next_run_at IS 'Calculated next execution time for recurring jobs';
COMMENT ON COLUMN public.jobs.retry_count IS 'Number of retry attempts made for failed jobs';
COMMENT ON COLUMN public.jobs.max_retries IS 'Maximum number of retry attempts before giving up';

