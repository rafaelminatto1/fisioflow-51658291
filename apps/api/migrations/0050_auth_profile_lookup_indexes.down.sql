-- Rollback 0050: Remove auth profile lookup indexes
DROP INDEX IF EXISTS idx_profiles_email_not_null;
DROP INDEX IF EXISTS idx_profiles_user_id;
DROP INDEX IF EXISTS idx_profiles_organization_id;
