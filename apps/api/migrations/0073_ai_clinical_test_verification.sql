-- Migration: AI Clinical Test Verification
-- Description: Adds columns to store AI-driven validation metadata for special tests.

ALTER TABLE standardized_test_results ADD COLUMN IF NOT EXISTS ai_validation_metadata JSONB;
ALTER TABLE standardized_test_results ADD COLUMN IF NOT EXISTS verification_media_id UUID;
ALTER TABLE standardized_test_results ADD COLUMN IF NOT EXISTS ai_quality_score NUMERIC(5, 2);

-- Index for analytics on test quality
CREATE INDEX IF NOT EXISTS idx_test_results_quality ON standardized_test_results(ai_quality_score) WHERE ai_quality_score IS NOT NULL;
