-- Migration: Create notification security and compliance tables
-- Description: Tables for LGPD compliance, consent management, and audit logging

-- Notification consent table for LGPD compliance
CREATE TABLE IF NOT EXISTS notification_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  data_processing_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Notification audit log for tracking access and operations
CREATE TABLE IF NOT EXISTS notification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_audit_user_id ON notification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_audit_timestamp ON notification_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_notification_audit_action ON notification_audit_log(action);

-- Data retention policy table
CREATE TABLE IF NOT EXISTS notification_data_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  last_cleanup TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(table_name)
);

-- Insert default retention policies
INSERT INTO notification_data_retention (table_name, retention_days) VALUES
  ('notification_history', 365),
  ('notification_audit_log', 1095), -- 3 years for audit logs
  ('push_subscriptions', 730) -- 2 years for inactive subscriptions
ON CONFLICT (table_name) DO NOTHING;

-- Add encryption metadata to notification history
ALTER TABLE notification_history 
ADD COLUMN IF NOT EXISTS encrypted_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_version TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_consent_user_id ON notification_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_consent_updated_at ON notification_consent(updated_at);

-- Row Level Security policies for consent table
ALTER TABLE notification_consent ENABLE ROW LEVEL SECURITY;

-- Users can only access their own consent records
CREATE POLICY "Users can view own consent" ON notification_consent
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own consent" ON notification_consent
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent" ON notification_consent
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all consent records for compliance
CREATE POLICY "Admins can view all consent" ON notification_consent
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Row Level Security for audit log
ALTER TABLE notification_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON notification_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON notification_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON notification_audit_log
  FOR INSERT WITH CHECK (true);

-- Row Level Security for data retention table
ALTER TABLE notification_data_retention ENABLE ROW LEVEL SECURITY;

-- Only admins can manage retention policies
CREATE POLICY "Admins can manage retention policies" ON notification_data_retention
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_consent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_consent
CREATE TRIGGER update_notification_consent_updated_at
  BEFORE UPDATE ON notification_consent
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_consent_updated_at();

-- Function to cleanup expired notification data
CREATE OR REPLACE FUNCTION cleanup_expired_notification_data()
RETURNS void AS $$
DECLARE
  retention_record RECORD;
  cutoff_date TIMESTAMPTZ;
  deleted_count INTEGER;
BEGIN
  -- Loop through retention policies
  FOR retention_record IN 
    SELECT table_name, retention_days 
    FROM notification_data_retention 
  LOOP
    cutoff_date := NOW() - (retention_record.retention_days || ' days')::INTERVAL;
    
    -- Cleanup based on table
    CASE retention_record.table_name
      WHEN 'notification_history' THEN
        DELETE FROM notification_history 
        WHERE sent_at < cutoff_date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
      WHEN 'notification_audit_log' THEN
        DELETE FROM notification_audit_log 
        WHERE timestamp < cutoff_date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
      WHEN 'push_subscriptions' THEN
        -- Delete inactive subscriptions
        DELETE FROM push_subscriptions 
        WHERE updated_at < cutoff_date 
        AND NOT EXISTS (
          SELECT 1 FROM notification_history 
          WHERE user_id = push_subscriptions.user_id 
          AND sent_at > cutoff_date
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END CASE;
    
    -- Update last cleanup timestamp
    UPDATE notification_data_retention 
    SET last_cleanup = NOW() 
    WHERE table_name = retention_record.table_name;
    
    -- Log cleanup activity
    INSERT INTO notification_audit_log (action, details)
    VALUES (
      'data_cleanup',
      jsonb_build_object(
        'table_name', retention_record.table_name,
        'cutoff_date', cutoff_date,
        'deleted_count', deleted_count
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export user notification data (LGPD compliance)
CREATE OR REPLACE FUNCTION export_user_notification_data(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user can access this data (themselves or admin)
  IF auth.uid() != target_user_id AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT jsonb_build_object(
    'user_id', target_user_id,
    'export_date', NOW(),
    'subscriptions', (
      SELECT COALESCE(jsonb_agg(to_jsonb(ps)), '[]'::jsonb)
      FROM push_subscriptions ps
      WHERE ps.user_id = target_user_id
    ),
    'preferences', (
      SELECT COALESCE(jsonb_agg(to_jsonb(np)), '[]'::jsonb)
      FROM notification_preferences np
      WHERE np.user_id = target_user_id
    ),
    'history', (
      SELECT COALESCE(jsonb_agg(to_jsonb(nh)), '[]'::jsonb)
      FROM notification_history nh
      WHERE nh.user_id = target_user_id
    ),
    'consent', (
      SELECT COALESCE(jsonb_agg(to_jsonb(nc)), '[]'::jsonb)
      FROM notification_consent nc
      WHERE nc.user_id = target_user_id
    )
  ) INTO result;
  
  -- Log the export
  INSERT INTO notification_audit_log (user_id, action, details)
  VALUES (
    target_user_id,
    'data_export',
    jsonb_build_object('exported_by', auth.uid())
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user notification data (right to be forgotten)
CREATE OR REPLACE FUNCTION delete_user_notification_data(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user can delete this data (themselves or admin)
  IF auth.uid() != target_user_id AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Log the deletion request
  INSERT INTO notification_audit_log (user_id, action, details)
  VALUES (
    target_user_id,
    'data_deletion_request',
    jsonb_build_object('requested_by', auth.uid())
  );
  
  -- Delete all notification data
  DELETE FROM notification_history WHERE user_id = target_user_id;
  DELETE FROM push_subscriptions WHERE user_id = target_user_id;
  DELETE FROM notification_preferences WHERE user_id = target_user_id;
  DELETE FROM notification_consent WHERE user_id = target_user_id;
  
  -- Log the completion
  INSERT INTO notification_audit_log (user_id, action, details)
  VALUES (
    target_user_id,
    'data_deletion_completed',
    jsonb_build_object('deleted_by', auth.uid())
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;