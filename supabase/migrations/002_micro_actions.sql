-- Micro Actions Table
-- Visual Recording Approach:
-- This recorder captures WHAT THE USER SEES (screenshots, text, positions) instead of fragile DOM selectors.
-- This makes automation robust against UI changes. The params JSONB column stores visual data as the primary
-- method, with backup_selector as a fallback option.
--
-- params JSONB structure:
-- {
--   "visual": {
--     "screenshot": "base64_encoded_image_or_url",  -- Full page or element screenshot
--     "text": "visible_text_content",                -- Text visible to user at target location
--     "position": {"x": 100, "y": 200},             -- Click/action coordinates
--     "boundingBox": {"x": 50, "y": 150, "width": 200, "height": 50},  -- Element bounding box
--     "surroundingText": "contextual text around target"  -- Text near target for context
--   },
--   "backup_selector": "css_selector_or_xpath",     -- Fallback selector (optional, for legacy support)
--   "execution_method": "visual_first"               -- "selector_first" | "visual_first" | "visual_only"
-- }
-- Legacy format (still supported):
-- {
--   "selector": "css_selector",
--   "text": "value",
--   "duration": 1000
-- }
CREATE TABLE IF NOT EXISTS micro_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- click, type, wait, navigate, upload, extract, scroll, screenshot
  platform VARCHAR(50) NOT NULL, -- instagram, facebook, twitter, all
  params JSONB NOT NULL, -- Visual data (screenshot, text, position, boundingBox) + backup_selector + execution_method
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE
);

-- Workflows Table (combines micro-actions)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  platform VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL, -- auth, post, story, comment, etc.
  steps JSONB NOT NULL, -- array of {micro_action_id, params_override}
  requires_auth BOOLEAN DEFAULT FALSE,
  auth_workflow_id UUID REFERENCES workflows(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version VARCHAR(20) DEFAULT '1.0.0'
);

-- Recording Sessions (stores user interactions during recording)
-- Visual Recording Approach:
-- recorded_actions is a JSONB array storing each interaction with full visual context.
-- Each item in the array contains:
-- {
--   "type": "click" | "type" | "wait" | "navigate" | "upload" | "extract" | "scroll" | "screenshot",
--   "timestamp": "ISO_8601_timestamp",
--   "visual": {
--     "screenshot": "base64_encoded_image_or_url",
--     "text": "visible_text_content",
--     "position": {"x": 100, "y": 200},
--     "boundingBox": {"x": 50, "y": 150, "width": 200, "height": 50},
--     "surroundingText": "contextual text around target"
--   },
--   "backup_selector": "css_selector_or_xpath"  -- Optional fallback
-- }
CREATE TABLE IF NOT EXISTS recording_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  url VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'recording', -- recording, completed, cancelled
  recorded_actions JSONB DEFAULT '[]', -- array of captured interactions with visual data
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_micro_actions_platform ON micro_actions(platform);
CREATE INDEX IF NOT EXISTS idx_micro_actions_type ON micro_actions(type);
CREATE INDEX IF NOT EXISTS idx_micro_actions_created_by ON micro_actions(created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_platform ON workflows(platform);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user ON recording_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_status ON recording_sessions(status);