-- ============================================================
-- MIGRATION: Create Missing Utility Tables
-- ============================================================
-- This migration creates utility tables that were identified
-- as missing during the database analysis.
-- ============================================================

-- ============================================================
-- Table: webhooks
-- Tracks webhook deliveries and retries
-- ============================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_code INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',  -- pending, success, failed, retrying
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for webhooks
CREATE INDEX idx_webhooks_status ON webhooks(status);
CREATE INDEX idx_webhooks_next_attempt ON webhooks(next_attempt_at) WHERE status = 'retrying';
CREATE INDEX idx_webhooks_event_type ON webhooks(event_type);

-- RLS for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhooks"
ON webhooks FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- ============================================================
-- Table: feature_flags
-- Manages feature rollouts
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  allowed_users UUID[],
  allowed_organizations UUID[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for feature flags
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;
CREATE INDEX idx_feature_flags_name ON feature_flags(name);

-- RLS for feature flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature flags"
ON feature_flags FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

CREATE POLICY "Authenticated users can view enabled feature flags"
ON feature_flags FOR SELECT
USING (enabled = true);

-- Function to check if feature is enabled for user
CREATE OR REPLACE FUNCTION check_feature_flag(feature_name TEXT, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  flag feature_flags%ROWTYPE;
  user_org_id UUID;
BEGIN
  SELECT * INTO flag FROM feature_flags WHERE name = feature_name;

  IF NOT FOUND OR NOT flag.enabled THEN
    RETURN false;
  END IF;

  -- Check rollout percentage
  IF flag.rollout_percentage < 100 THEN
    -- Simple hash-based rollout
    IF (substring(user_id::text, 1, 8)::bit(32)::int % 100) >= flag.rollout_percentage THEN
      RETURN false;
    END IF;
  END IF;

  -- Check allowed users
  IF flag.allowed_users IS NOT NULL AND user_id = ANY(flag.allowed_users) THEN
    RETURN true;
  END IF;

  -- Check allowed organizations
  IF flag.allowed_organizations IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM organization_members
    WHERE user_id = user_id
    LIMIT 1;

    IF user_org_id = ANY(flag.allowed_organizations) THEN
      RETURN true;
    END IF;
  END IF;

  -- If no specific restrictions and rollout passed, allow
  RETURN flag.rollout_percentage > 0 OR flag.allowed_users IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- ============================================================
-- Table: error_logs
-- Centralized error logging
-- ============================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID,
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  request_data JSONB,
  user_agent TEXT,
  ip_address INET,
  route TEXT,
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for error_logs
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_error_code ON error_logs(error_code);

-- RLS for error_logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error logs"
ON error_logs FOR SELECT
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

CREATE POLICY "Users can view their own error logs"
ON error_logs FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "System can insert error logs"
ON error_logs FOR INSERT
WITH CHECK (true);

-- ============================================================
-- Table: api_rate_limits
-- Rate limiting tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_duration INTERVAL DEFAULT '1 minute',
  blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for api_rate_limits
CREATE INDEX idx_api_rate_limits_user_endpoint ON api_rate_limits(user_id, endpoint);
CREATE INDEX idx_api_rate_limits_ip_endpoint ON api_rate_limits(ip_address, endpoint);
CREATE INDEX idx_api_rate_limits_window_start ON api_rate_limits(window_start);

-- RLS for api_rate_limits
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limits"
ON api_rate_limits FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- ============================================================
-- Table: background_jobs
-- Track background job status
-- ============================================================

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, running, completed, failed
  payload JSONB,
  result JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for background_jobs
CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_created_at ON background_jobs(created_at DESC);

-- RLS for background_jobs
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all background jobs"
ON background_jobs FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- ============================================================
-- Table: notification_queue
-- Queue for sending notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,  -- email, sms, push, whatsapp
  status TEXT DEFAULT 'pending',  -- pending, sent, failed, cancelled
  priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
  title TEXT,
  body TEXT,
  data JSONB,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for notification_queue
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_scheduled_for ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_priority ON notification_queue(priority, created_at) WHERE status = 'pending';

-- RLS for notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
ON notification_queue FOR SELECT
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

CREATE POLICY "Users can view their own notifications"
ON notification_queue FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify all tables were created:
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('webhooks', 'feature_flags', 'error_logs', 'api_rate_limits', 'background_jobs', 'notification_queue')
ORDER BY tablename;

-- Expected: All 6 tables should exist

-- ============================================================
-- FUNCTIONS TO BE CREATED
-- ============================================================

-- Function: check_feature_flag (already created above)
-- Usage: SELECT check_feature_flag('new_feature', user_id)

-- Function: enqueue_notification
CREATE OR REPLACE FUNCTION enqueue_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_scheduled_for TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notification_queue (user_id, type, title, body, data, scheduled_for)
  VALUES (p_user_id, p_type, p_title, p_body, p_data, p_scheduled_for)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- ============================================================
-- NOTES
-- ============================================================

-- 1. These tables provide infrastructure for:
--    - Webhook management and retry logic
--    - Feature flag system for gradual rollouts
--    - Centralized error tracking
--    - API rate limiting
--    - Background job processing
--    - Notification queue and delivery
--
-- 2. Set up appropriate monitoring:
--    - Alert on failed webhooks
--    - Monitor error_logs volume
--    - Track background_job failures
--    - Monitor notification_queue backlog
--
-- 3. Consider pg_cron jobs for:
--    - Webhook retry processing
--    - Background job execution
--    - Notification queue processing
--    - Cleanup of old records
