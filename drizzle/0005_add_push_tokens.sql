-- Migration: Add push_tokens table for Expo Push Notifications
-- Created: 2026-01-03

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by user
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(user_id, is_active);

-- Add comments
COMMENT ON TABLE push_tokens IS 'Stores Expo Push Notification tokens for users';
COMMENT ON COLUMN push_tokens.expo_push_token IS 'Expo Push Token (ExponentPushToken[xxx])';