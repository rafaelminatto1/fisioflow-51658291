-- Rollback 0058
DROP INDEX IF EXISTS idx_appointments_checkin_token;
DROP INDEX IF EXISTS idx_profiles_is_public;
DROP INDEX IF EXISTS idx_profiles_slug;
ALTER TABLE appointments DROP COLUMN IF EXISTS checked_in_via;
ALTER TABLE appointments DROP COLUMN IF EXISTS checked_in_at;
ALTER TABLE appointments DROP COLUMN IF EXISTS checkin_token_expires_at;
ALTER TABLE appointments DROP COLUMN IF EXISTS checkin_token;
ALTER TABLE profiles DROP COLUMN IF EXISTS public_services;
ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE profiles DROP COLUMN IF EXISTS bio;
ALTER TABLE profiles DROP COLUMN IF EXISTS specialty;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_public;
ALTER TABLE profiles DROP COLUMN IF EXISTS slug;
