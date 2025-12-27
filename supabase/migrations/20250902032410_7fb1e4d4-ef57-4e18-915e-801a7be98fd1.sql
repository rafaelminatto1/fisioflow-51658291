-- Create profiles table for user management (se não existir)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'fisioterapeuta' CHECK (role IN ('admin', 'fisioterapeuta', 'recepcionista')),
  phone TEXT,
  crefito TEXT,
  specialties TEXT[],
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patients table (se não existir)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('masculino', 'feminino', 'outro')),
  address TEXT,
  emergency_contact TEXT,
  medical_history TEXT,
  main_condition TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Inicial' CHECK (status IN ('Em Tratamento', 'Recuperação', 'Inicial', 'Concluído')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table (se não existir)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  type TEXT NOT NULL CHECK (type IN ('Consulta Inicial', 'Fisioterapia', 'Reavaliação', 'Consulta de Retorno')),
  status TEXT NOT NULL DEFAULT 'Confirmado' CHECK (status IN ('Confirmado', 'Pendente', 'Reagendado', 'Cancelado', 'Realizado')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fortalecimento', 'alongamento', 'mobilidade', 'cardio', 'equilibrio', 'respiratorio')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('iniciante', 'intermediario', 'avancado')),
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  target_muscles TEXT[] NOT NULL,
  equipment TEXT[],
  contraindications TEXT,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_plans table
CREATE TABLE IF NOT EXISTS public.exercise_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Concluído')),
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_plan_items table
CREATE TABLE IF NOT EXISTS public.exercise_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_plan_id UUID NOT NULL REFERENCES public.exercise_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 1,
  rest_time INTEGER NOT NULL DEFAULT 60,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Anamnese', 'Evolução', 'Avaliação', 'Exame', 'Receituário')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatment_sessions table
CREATE TABLE IF NOT EXISTS public.treatment_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  exercise_plan_id UUID REFERENCES public.exercise_plans(id) ON DELETE SET NULL,
  observations TEXT NOT NULL,
  pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
  evolution_notes TEXT NOT NULL,
  next_session_goals TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_progress table
CREATE TABLE IF NOT EXISTS public.patient_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
  functional_score INTEGER NOT NULL CHECK (functional_score >= 0 AND functional_score <= 100),
  exercise_compliance INTEGER NOT NULL CHECK (exercise_compliance >= 0 AND exercise_compliance <= 100),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for patients (authenticated users can manage)
CREATE POLICY "Authenticated users can view patients" ON public.patients
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create patients" ON public.patients
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients" ON public.patients
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete patients" ON public.patients
FOR DELETE TO authenticated USING (true);

-- Create RLS policies for appointments
CREATE POLICY "Authenticated users can view appointments" ON public.appointments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create appointments" ON public.appointments
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments" ON public.appointments
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete appointments" ON public.appointments
FOR DELETE TO authenticated USING (true);

-- Create RLS policies for exercises
CREATE POLICY "Authenticated users can view exercises" ON public.exercises
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create exercises" ON public.exercises
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercises" ON public.exercises
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete exercises" ON public.exercises
FOR DELETE TO authenticated USING (true);

-- Create RLS policies for exercise_plans
CREATE POLICY "Authenticated users can view exercise plans" ON public.exercise_plans
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create exercise plans" ON public.exercise_plans
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercise plans" ON public.exercise_plans
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete exercise plans" ON public.exercise_plans
FOR DELETE TO authenticated USING (true);

-- Create RLS policies for exercise_plan_items
CREATE POLICY "Authenticated users can view exercise plan items" ON public.exercise_plan_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create exercise plan items" ON public.exercise_plan_items
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercise plan items" ON public.exercise_plan_items
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete exercise plan items" ON public.exercise_plan_items
FOR DELETE TO authenticated USING (true);

-- Create RLS policies for medical_records
CREATE POLICY "Authenticated users can view medical records" ON public.medical_records
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create medical records" ON public.medical_records
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update medical records" ON public.medical_records
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete medical records" ON public.medical_records
FOR DELETE TO authenticated USING (true);

-- Create RLS policies for treatment_sessions
CREATE POLICY "Authenticated users can view treatment sessions" ON public.treatment_sessions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create treatment sessions" ON public.treatment_sessions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update treatment sessions" ON public.treatment_sessions
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete treatment sessions" ON public.treatment_sessions
FOR DELETE TO authenticated USING (true);

-- Create RLS policies for patient_progress
CREATE POLICY "Authenticated users can view patient progress" ON public.patient_progress
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create patient progress" ON public.patient_progress
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient progress" ON public.patient_progress
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete patient progress" ON public.patient_progress
FOR DELETE TO authenticated USING (true);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'fisioterapeuta')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercises_updated_at ON public.exercises;
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercise_plans_updated_at ON public.exercise_plans;
CREATE TRIGGER update_exercise_plans_updated_at
  BEFORE UPDATE ON public.exercise_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_records_updated_at ON public.medical_records;
CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_treatment_sessions_updated_at ON public.treatment_sessions;
CREATE TRIGGER update_treatment_sessions_updated_at
  BEFORE UPDATE ON public.treatment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();