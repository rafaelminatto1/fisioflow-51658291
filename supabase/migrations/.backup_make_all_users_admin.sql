-- Migration: Make all authenticated users admin
-- This migration updates RLS policies to give all authenticated users admin-level access
-- and updates existing user roles to admin

-- ===== UPDATE PROFILES TABLE =====

-- Ensure all existing profiles have admin role
UPDATE public.profiles
SET role = 'admin'
WHERE role IS NULL OR role != 'admin';

-- Ensure the profile table defaults to admin for new users
ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'admin';

-- ===== UPDATE USER_ROLES TABLE =====

-- Add admin role to all existing users in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT
    id as user_id,
    'admin' as role
FROM auth.users
WHERE id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
);

-- ===== UPDATE RLS POLICIES FOR PRESCRIBED_EXERCISES =====

-- Drop existing policies including the one that might exist
DROP POLICY IF EXISTS "Users can view their prescribed exercises" ON public.prescribed_exercises;
DROP POLICY IF EXISTS "Therapists can manage prescriptions" ON public.prescribed_exercises;
DROP POLICY IF EXISTS "Authenticated users can view all prescribed exercises" ON public.prescribed_exercises;
DROP POLICY IF EXISTS "Authenticated users can insert prescribed exercises" ON public.prescribed_exercises;
DROP POLICY IF EXISTS "Authenticated users can update prescribed exercises" ON public.prescribed_exercises;
DROP POLICY IF EXISTS "Authenticated users can delete prescribed exercises" ON public.prescribed_exercises;

-- Create new admin-level policies for all authenticated users
CREATE POLICY "Authenticated users can view all prescribed exercises"
    ON public.prescribed_exercises FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert prescribed exercises"
    ON public.prescribed_exercises FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update prescribed exercises"
    ON public.prescribed_exercises FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete prescribed exercises"
    ON public.prescribed_exercises FOR DELETE
    TO authenticated
    USING (true);

-- ===== UPDATE RLS POLICIES FOR SESSION_ATTACHMENTS =====

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view session attachments" ON public.session_attachments;
DROP POLICY IF EXISTS "Authenticated users can create session attachments" ON public.session_attachments;
DROP POLICY IF EXISTS "Authenticated users can update session attachments" ON public.session_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete session attachments" ON public.session_attachments;
DROP POLICY IF EXISTS "Authenticated users can manage session attachments" ON public.session_attachments;

-- Create admin-level policies
CREATE POLICY "Authenticated users can manage session attachments"
    ON public.session_attachments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ===== UPDATE OTHER POLICIES TO BE MORE PERMISSIVE =====

-- Update patient_pain_records policies
DROP POLICY IF EXISTS "Users can insert their own pain records" ON public.patient_pain_records;
DROP POLICY IF EXISTS "Users can view their own pain records" ON public.patient_pain_records;
DROP POLICY IF EXISTS "Authenticated users can manage pain records" ON public.patient_pain_records;

CREATE POLICY "Authenticated users can manage pain records"
    ON public.patient_pain_records FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Update exercise_logs policies
DROP POLICY IF EXISTS "Users can log their own exercises" ON public.exercise_logs;
DROP POLICY IF EXISTS "Users can view their own exercise logs" ON public.exercise_logs;
DROP POLICY IF EXISTS "Therapists can view exercise logs" ON public.exercise_logs;
DROP POLICY IF EXISTS "Authenticated users can manage exercise logs" ON public.exercise_logs;

CREATE POLICY "Authenticated users can manage exercise logs"
    ON public.exercise_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ===== UPDATE TRIGGER FUNCTION TO DEFAULT TO ADMIN =====

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    role_exists BOOLEAN;
BEGIN
    -- Check if role column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'role'
    ) INTO role_exists;

    -- Insert profile with admin role
    IF role_exists THEN
        INSERT INTO public.profiles (user_id, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
            'admin'
        )
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        INSERT INTO public.profiles (user_id, full_name)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- ===== COMMENTS =====

COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function to create profile for new users with admin role by default';
