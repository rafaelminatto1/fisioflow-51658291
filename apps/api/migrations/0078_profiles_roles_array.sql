-- Migration 0078: Add roles TEXT[] to profiles for multi-role support
-- Allows a user to have multiple roles (e.g., admin + fisioterapeuta)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- Back-fill: copy existing role into roles array for all non-empty rows
UPDATE profiles SET roles = ARRAY[role] WHERE role IS NOT NULL AND role != '' AND (roles IS NULL OR array_length(roles, 1) IS NULL);

-- Index for fast membership queries: 'fisioterapeuta' = ANY(roles)
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN (roles);
