-- ================================
-- FISIOFLOW SUPABASE RLS POLICIES
-- ================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ================================
-- PROFILES TABLE POLICIES
-- ================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Therapists can view patient profiles
CREATE POLICY "Therapists can view patient profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
  AND role = 'paciente'
);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- ================================
-- PATIENTS TABLE POLICIES  
-- ================================

-- Patients can view their own data
CREATE POLICY "Patients can view own data" 
ON patients FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = patients.profile_id
  )
);

-- Therapists can view their assigned patients
CREATE POLICY "Therapists can view assigned patients" 
ON patients FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('fisioterapeuta', 'estagiario')
  )
);

-- Therapists can create patient records
CREATE POLICY "Therapists can create patients" 
ON patients FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta')
  )
);

-- Therapists can update patient records
CREATE POLICY "Therapists can update patients" 
ON patients FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- ================================
-- APPOINTMENTS TABLE POLICIES
-- ================================

-- Patients can view their own appointments
CREATE POLICY "Patients can view own appointments" 
ON appointments FOR SELECT 
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id  
    WHERE pr.user_id = auth.uid()
  )
);

-- Therapists can view their appointments
CREATE POLICY "Therapists can view own appointments" 
ON appointments FOR SELECT 
USING (
  therapist_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Therapists can create appointments
CREATE POLICY "Therapists can create appointments" 
ON appointments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can update appointments
CREATE POLICY "Therapists can update appointments" 
ON appointments FOR UPDATE 
USING (
  therapist_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- ================================
-- MEDICAL RECORDS POLICIES
-- ================================

-- Patients can view their own medical records
CREATE POLICY "Patients can view own medical records" 
ON medical_records FOR SELECT 
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id  
    WHERE pr.user_id = auth.uid()
  )
);

-- Therapists can view patient medical records
CREATE POLICY "Therapists can view patient medical records" 
ON medical_records FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can create medical records
CREATE POLICY "Therapists can create medical records" 
ON medical_records FOR INSERT 
WITH CHECK (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can update their own medical records
CREATE POLICY "Therapists can update own medical records" 
ON medical_records FOR UPDATE 
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ================================
-- SOAP RECORDS POLICIES
-- ================================

-- Patients can view their own SOAP records
CREATE POLICY "Patients can view own SOAP records" 
ON soap_records FOR SELECT 
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id  
    WHERE pr.user_id = auth.uid()
  )
);

-- Therapists can view SOAP records
CREATE POLICY "Therapists can view SOAP records" 
ON soap_records FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can create SOAP records
CREATE POLICY "Therapists can create SOAP records" 
ON soap_records FOR INSERT 
WITH CHECK (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can update their own SOAP records (if not signed)
CREATE POLICY "Therapists can update own SOAP records" 
ON soap_records FOR UPDATE 
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) AND 
  signed_at IS NULL -- Only unsigned records can be updated
);

-- ================================
-- EXERCISES POLICIES
-- ================================

-- All authenticated users can view exercises
CREATE POLICY "All users can view exercises" 
ON exercises FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Therapists can create exercises
CREATE POLICY "Therapists can create exercises" 
ON exercises FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta')
  )
);

-- Therapists can update exercises
CREATE POLICY "Therapists can update exercises" 
ON exercises FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta')
  )
);

-- ================================
-- EXERCISE PLANS POLICIES
-- ================================

-- Patients can view their own exercise plans
CREATE POLICY "Patients can view own exercise plans" 
ON exercise_plans FOR SELECT 
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id  
    WHERE pr.user_id = auth.uid()
  )
);

-- Therapists can view exercise plans
CREATE POLICY "Therapists can view exercise plans" 
ON exercise_plans FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can create exercise plans
CREATE POLICY "Therapists can create exercise plans" 
ON exercise_plans FOR INSERT 
WITH CHECK (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can update their own exercise plans
CREATE POLICY "Therapists can update own exercise plans" 
ON exercise_plans FOR UPDATE 
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ================================
-- TREATMENT SESSIONS POLICIES
-- ================================

-- Patients can view their own treatment sessions
CREATE POLICY "Patients can view own treatment sessions" 
ON treatment_sessions FOR SELECT 
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id  
    WHERE pr.user_id = auth.uid()
  )
);

-- Therapists can view treatment sessions
CREATE POLICY "Therapists can view treatment sessions" 
ON treatment_sessions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can create treatment sessions
CREATE POLICY "Therapists can create treatment sessions" 
ON treatment_sessions FOR INSERT 
WITH CHECK (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can update their own treatment sessions
CREATE POLICY "Therapists can update own treatment sessions" 
ON treatment_sessions FOR UPDATE 
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ================================
-- REPORTS POLICIES
-- ================================

-- Therapists can view reports
CREATE POLICY "Therapists can view reports" 
ON reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can create reports
CREATE POLICY "Therapists can create reports" 
ON reports FOR INSERT 
WITH CHECK (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Therapists can update their own reports
CREATE POLICY "Therapists can update own reports" 
ON reports FOR UPDATE 
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ================================
-- UTILITY FUNCTIONS
-- ================================

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION check_user_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION check_user_roles(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ================================
-- TRIGGERS FOR AUTOMATIC PROFILE CREATION
-- ================================

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, onboarding_completed)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'paciente'),
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Index on profiles.user_id for faster role checks
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Index on common foreign keys
CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON patients(profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_created_by ON medical_records(created_by);
CREATE INDEX IF NOT EXISTS idx_soap_records_patient_id ON soap_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_plans_patient_id ON exercise_plans(patient_id);

-- ================================
-- COMMENTS FOR DOCUMENTATION
-- ================================

COMMENT ON POLICY "Users can view own profile" ON profiles IS 
'Allows users to view their own profile information';

COMMENT ON POLICY "Therapists can view patient profiles" ON profiles IS 
'Allows therapists and students to view patient profiles for treatment purposes';

COMMENT ON FUNCTION check_user_role(text) IS 
'Utility function to check if the current user has a specific role';

COMMENT ON FUNCTION handle_new_user() IS 
'Automatically creates a profile record when a new user signs up';

-- ================================
-- GRANT PERMISSIONS
-- ================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION check_user_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_roles(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_profile() TO authenticated;