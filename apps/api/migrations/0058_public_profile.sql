-- Migration 0058: Public profile for FisioLink (self-scheduling page)
-- Adds slug + public fields to profiles table
-- Also adds QR check-in token support to appointments

-- Public profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_services JSONB NOT NULL DEFAULT '[]';
-- public_services schema: [{id, name, duration_minutes, price, color}]

-- Unique index on slug (only for public profiles to allow NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public, organization_id) WHERE is_public = true;

-- QR check-in token for appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checkin_token TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checkin_token_expires_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_via TEXT; -- 'qr' | 'reception' | 'patient_app'

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_checkin_token ON appointments(checkin_token) WHERE checkin_token IS NOT NULL;
