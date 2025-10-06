-- ================================
-- FISIOFLOW DATABASE SCHEMA
-- ================================

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'paciente' CHECK (role IN ('admin', 'fisioterapeuta', 'estagiario', 'paciente', 'parceiro')),
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  health_insurance TEXT,
  insurance_number TEXT,
  observations TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER DEFAULT 60,
  type TEXT NOT NULL DEFAULT 'consulta',
  status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'falta')),
  room TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  record_date DATE DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  medical_history TEXT,
  current_medications TEXT,
  allergies TEXT,
  previous_surgeries TEXT,
  family_history TEXT,
  lifestyle_habits TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create soap_records table (SOAP: Subjective, Objective, Assessment, Plan)
CREATE TABLE IF NOT EXISTS public.soap_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  record_date DATE DEFAULT CURRENT_DATE,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('facil', 'moderado', 'dificil')),
  duration INTEGER,
  repetitions INTEGER,
  sets INTEGER,
  video_url TEXT,
  image_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create exercise_plans table
CREATE TABLE IF NOT EXISTS public.exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create exercise_plan_items table (many-to-many between plans and exercises)
CREATE TABLE IF NOT EXISTS public.exercise_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.exercise_plans(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER DEFAULT 0,
  repetitions INTEGER,
  sets INTEGER,
  duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create treatment_sessions table
CREATE TABLE IF NOT EXISTS public.treatment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  session_date DATE DEFAULT CURRENT_DATE,
  duration INTEGER,
  techniques_used TEXT,
  patient_response TEXT,
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create patient_progress table
CREATE TABLE IF NOT EXISTS public.patient_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  progress_date DATE DEFAULT CURRENT_DATE,
  functional_score INTEGER CHECK (functional_score BETWEEN 0 AND 100),
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  mobility_score INTEGER CHECK (mobility_score BETWEEN 0 AND 100),
  strength_score INTEGER CHECK (strength_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  period_start DATE,
  period_end DATE,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON public.patients(profile_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON public.appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_records_patient_id ON public.soap_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_plans_patient_id ON public.exercise_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_progress_patient_id ON public.patient_progress(patient_id);

-- ================================
-- ENABLE ROW LEVEL SECURITY
-- ================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soap_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================

-- Profiles: users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Patients: therapists can view all, patients can view their own
CREATE POLICY "Therapists can view all patients" ON public.patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

CREATE POLICY "Patients can view own data" ON public.patients
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can create patients" ON public.patients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta')
    )
  );

CREATE POLICY "Therapists can update patients" ON public.patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

-- Appointments: therapists and patients can view their own
CREATE POLICY "Users can view own appointments" ON public.appointments
  FOR SELECT USING (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can manage appointments" ON public.appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

-- Medical records, SOAP, exercises, etc: therapists can manage, patients can view their own
CREATE POLICY "Therapists can manage medical records" ON public.medical_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

CREATE POLICY "Patients can view own medical records" ON public.medical_records
  FOR SELECT USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );

-- Exercises: all authenticated users can view
CREATE POLICY "All users can view exercises" ON public.exercises
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Therapists can manage exercises" ON public.exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta')
    )
  );

-- Exercise plans
CREATE POLICY "Therapists can manage exercise plans" ON public.exercise_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

CREATE POLICY "Patients can view own exercise plans" ON public.exercise_plans
  FOR SELECT USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );

-- Exercise plan items inherit from exercise plans
CREATE POLICY "Users can view exercise plan items" ON public.exercise_plan_items
  FOR SELECT USING (
    plan_id IN (SELECT id FROM public.exercise_plans)
  );

CREATE POLICY "Therapists can manage exercise plan items" ON public.exercise_plan_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

-- Treatment sessions, progress, reports: similar pattern
CREATE POLICY "Therapists can manage treatment sessions" ON public.treatment_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

CREATE POLICY "Therapists can manage patient progress" ON public.patient_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

CREATE POLICY "Therapists can manage reports" ON public.reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
    )
  );

-- ================================
-- TRIGGERS FOR UPDATED_AT
-- ================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_soap_records_updated_at BEFORE UPDATE ON public.soap_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercise_plans_updated_at BEFORE UPDATE ON public.exercise_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_sessions_updated_at BEFORE UPDATE ON public.treatment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'paciente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();