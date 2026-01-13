-- Ensure admin access for rafael.minatto@yahoo.com.br
-- This migration ensures the user has full access to all resources

DO $$
DECLARE
  target_user_id UUID;
  target_org_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'rafael.minatto@yahoo.com.br'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User rafael.minatto@yahoo.com.br not found';
    RETURN;
  END IF;

  -- Get or create organization for the user
  SELECT organization_id INTO target_org_id
  FROM profiles
  WHERE user_id = target_user_id
  LIMIT 1;

  -- Ensure profile exists with admin role
  INSERT INTO profiles (user_id, full_name, role, organization_id, onboarding_completed)
  VALUES (target_user_id, 'Rafael Minatto', 'admin', target_org_id, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = 'admin',
    full_name = COALESCE(profiles.full_name, 'Rafael Minatto'),
    onboarding_completed = true;

  -- Ensure user_roles has admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure user is in organization_members with admin role
  IF target_org_id IS NOT NULL THEN
    INSERT INTO organization_members (user_id, organization_id, role, active)
    VALUES (target_user_id, target_org_id, 'admin', true)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET 
      role = 'admin',
      active = true;
  END IF;

  RAISE NOTICE 'Admin access ensured for user %', target_user_id;
END $$;
