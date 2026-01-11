-- Add MFA support to profiles table

-- Add mfa_enabled column to track if user has MFA enabled
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false;

-- Add mfa_enforced_at timestamp
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mfa_enforced_at timestamptz;

-- Create index for MFA-enabled users
CREATE INDEX IF NOT EXISTS profiles_mfa_enabled_idx
ON profiles(mfa_enabled)
WHERE mfa_enabled = true;

-- Add comment
COMMENT ON COLUMN profiles.mfa_enabled IS 'Whether the user has Multi-Factor Authentication enabled';
COMMENT ON COLUMN profiles.mfa_enforced_at IS 'Timestamp when MFA was enforced for this user';

-- Create function to enforce MFA for admin users
CREATE OR REPLACE FUNCTION enforce_mfa_for_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is admin and MFA is not enabled, set it to required
  IF NEW.role = 'admin' AND NOT NEW.mfa_enabled THEN
    -- This doesn't force MFA to be enabled, but marks it as required
    -- Application logic should enforce this
    NEW.mfa_required := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add mfa_required column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_mfa_required_idx
ON profiles(mfa_required)
WHERE mfa_required = true;

COMMENT ON COLUMN profiles.mfa_required IS 'Whether MFA is required for this user (based on role)';
