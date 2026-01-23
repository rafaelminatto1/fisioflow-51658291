-- Add template statistics and favorite tracking to evaluation_forms
-- Migration: 20250123000000_add_template_stats

-- Add new columns for statistics and favorites
ALTER TABLE evaluation_forms
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Add index for favorite queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_evaluation_forms_favorite
ON evaluation_forms(is_favorite, ativo)
WHERE is_favorite = true;

-- Add index for usage-based sorting
CREATE INDEX IF NOT EXISTS idx_evaluation_forms_usage_count
ON evaluation_forms(usage_count DESC, ativo)
WHERE ativo = true;

-- Add index for recently used sorting
CREATE INDEX IF NOT EXISTS idx_evaluation_forms_last_used
ON evaluation_forms(last_used_at DESC NULLS LAST, ativo)
WHERE ativo = true AND last_used_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN evaluation_forms.is_favorite IS 'Whether this template is marked as favorite by the user';
COMMENT ON COLUMN evaluation_forms.usage_count IS 'Total number of times this template has been used in evaluations';
COMMENT ON COLUMN evaluation_forms.last_used_at IS 'Timestamp of the last time this template was used';

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE evaluation_forms
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically increment usage when a response is created
-- Note: This would be called from the application layer when creating patient_evaluation_responses
-- or via a trigger if we want automatic tracking

COMMENT ON FUNCTION increment_template_usage IS 'Increments the usage count and updates last_used_at timestamp for a template';
