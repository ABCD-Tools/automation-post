-- Migration 004: Proper Permissions Fix with RLS
-- This migration sets up proper Row Level Security (RLS) policies
-- for micro_actions, workflows, and recording_sessions tables.

-- ============================================================================
-- SCHEMA PERMISSIONS
-- ============================================================================

-- Grant schema usage to authenticated and service_role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant all permissions to service_role (bypasses RLS for admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- MICRO_ACTIONS TABLE PERMISSIONS
-- ============================================================================

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE micro_actions TO authenticated;

-- Grant sequence permissions (for auto-increment IDs if using serial)
-- Note: micro_actions uses UUID, but grant anyway for future compatibility
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable Row Level Security
ALTER TABLE micro_actions ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view all micro_actions
CREATE POLICY "Users can view all micro_actions"
ON micro_actions
FOR SELECT
TO authenticated
USING (true);

-- REMOVED MVP POLICY: "Authenticated users can manage micro_actions"

-- Alternative (for production): Restrict to premium users only
-- Policy: Premium users can insert micro_actions
CREATE POLICY "Premium users can insert micro_actions"
ON micro_actions
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE tier = 'premium')
);

-- Policy: Premium users can update micro_actions
CREATE POLICY "Premium users can update micro_actions"
ON micro_actions
FOR UPDATE
TO authenticated
USING (
    auth.uid() IN (SELECT id FROM users WHERE tier = 'premium')
)
WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE tier = 'premium')
);

-- Policy: Premium users can delete micro_actions
CREATE POLICY "Premium users can delete micro_actions"
ON micro_actions
FOR DELETE
TO authenticated
USING (
    auth.uid() IN (SELECT id FROM users WHERE tier = 'premium')
);

-- ============================================================================
-- WORKFLOWS TABLE PERMISSIONS
-- ============================================================================

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workflows TO authenticated;

-- Enable Row Level Security
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view all workflows
CREATE POLICY "Users can view all workflows"
ON workflows
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can manage workflows (MVP - can restrict later)
CREATE POLICY "Authenticated users can manage workflows"
ON workflows
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- RECORDING_SESSIONS TABLE PERMISSIONS
-- ============================================================================

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE recording_sessions TO authenticated;

-- Enable Row Level Security
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own recording sessions
CREATE POLICY "Users can view their own recording sessions"
ON recording_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own recording sessions
CREATE POLICY "Users can insert their own recording sessions"
ON recording_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recording sessions
CREATE POLICY "Users can update their own recording sessions"
ON recording_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own recording sessions
CREATE POLICY "Users can delete their own recording sessions"
ON recording_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE micro_actions IS 'Micro actions table with RLS enabled - READ access for all authenticated, MANAGEMENT restricted to premium users.';
COMMENT ON TABLE workflows IS 'Workflows table with RLS enabled - all authenticated users can read/manage (MVP: can be restricted later).';
COMMENT ON TABLE recording_sessions IS 'Recording sessions table with RLS enabled - users can only access their own sessions.';