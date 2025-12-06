-- Migration 015: In-App Notification System
-- Purpose: In-app notification system for user alerts and updates
-- This migration creates a table to store notifications for users

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User relationship
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Notification content
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Action link (optional)
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    
    -- Read/dismissed status
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    
    -- Related entities (optional)
    related_job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    related_client_id VARCHAR(100) REFERENCES public.clients(client_id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create composite index for unread notifications (common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications(user_id, is_read, created_at DESC) 
    WHERE is_read = FALSE AND is_dismissed = FALSE;

-- Create index for related entities
CREATE INDEX IF NOT EXISTS idx_notifications_related_job ON public.notifications(related_job_id) 
    WHERE related_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_related_client ON public.notifications(related_client_id) 
    WHERE related_client_id IS NOT NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own notifications (for testing, etc.)
CREATE POLICY "Users can insert their own notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications (mark as read/dismissed)
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create trigger to set read_at timestamp when is_read changes to TRUE
CREATE OR REPLACE FUNCTION public.set_notification_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = NOW();
    ELSIF NEW.is_read = FALSE THEN
        NEW.read_at = NULL;
    END IF;
    
    IF NEW.is_dismissed = TRUE AND OLD.is_dismissed = FALSE THEN
        NEW.dismissed_at = NOW();
    ELSIF NEW.is_dismissed = FALSE THEN
        NEW.dismissed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_notification_read_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_notification_read_at();

-- Add comments
COMMENT ON TABLE public.notifications IS 'In-app notification system for user alerts and updates';
COMMENT ON COLUMN public.notifications.type IS 'Notification type: info, success, warning, error';
COMMENT ON COLUMN public.notifications.action_url IS 'Optional URL to navigate when user clicks notification';
COMMENT ON COLUMN public.notifications.action_label IS 'Button text for action (e.g., "View Job", "Open Settings")';
COMMENT ON COLUMN public.notifications.related_job_id IS 'Related job ID if notification is about a job';
COMMENT ON COLUMN public.notifications.related_client_id IS 'Related client ID if notification is about a client';

