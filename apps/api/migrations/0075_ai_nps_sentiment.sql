-- Migration: AI NPS Sentiment Analysis
-- Description: Adds columns to store AI-driven sentiment analysis for satisfaction surveys.

ALTER TABLE satisfaction_surveys ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(20); -- 'positive', 'neutral', 'negative'
ALTER TABLE satisfaction_surveys ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE satisfaction_surveys ADD COLUMN IF NOT EXISTS ai_urgency_alert BOOLEAN DEFAULT false;

-- Index for identifying detracting comments quickly
CREATE INDEX IF NOT EXISTS idx_surveys_sentiment ON satisfaction_surveys(ai_sentiment) WHERE ai_sentiment = 'negative';
