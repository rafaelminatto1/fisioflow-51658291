CREATE INDEX IF NOT EXISTS idx_profiles_email_not_null
ON public.profiles (email)
WHERE email IS NOT NULL;
