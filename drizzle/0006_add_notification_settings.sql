-- Migration: Add notification_settings table
-- Created: 2026-03-11

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start VARCHAR(5) DEFAULT '22:00',
    quiet_hours_end VARCHAR(5) DEFAULT '08:00',
    channels JSONB DEFAULT '{"push": true, "email": true, "inApp": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_category UNIQUE (user_id, category)
);

-- Index for quick lookup
CREATE INDEX idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX idx_notification_settings_category ON notification_settings(user_id, category);

-- Add comments
COMMENT ON TABLE notification_settings IS 'User notification preferences by category';
COMMENT ON COLUMN notification_settings.category IS 'Category: appointments, patients, system, marketing';
COMMENT ON COLUMN notification_settings.channels IS 'JSON object with enabled channels: push, email, inApp';