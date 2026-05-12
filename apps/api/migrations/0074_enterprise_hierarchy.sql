-- Migration: Enterprise Hierarchy and Regional Management
-- Description: Adds parent_id to organizations to support chains of clinics and regional management.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'clinic'; -- 'clinic' or 'enterprise'

-- Add index for hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);

-- Update RLS to allow parent organizations to see children data (Future task, keeping basic org isolation for now)
