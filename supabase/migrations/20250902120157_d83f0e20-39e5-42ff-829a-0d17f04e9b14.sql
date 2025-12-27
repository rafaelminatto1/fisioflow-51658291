-- Adicionar campos para mídia nos exercícios
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_duration INTEGER;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Tabela para favoritos pessoais
CREATE TABLE IF NOT EXISTS exercise_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Tabela para templates de protocolos
CREATE TABLE IF NOT EXISTS exercise_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para progresso de execução dos pacientes
CREATE TABLE IF NOT EXISTS patient_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_plan_id UUID REFERENCES exercise_plans(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  sets_completed INTEGER,
  reps_completed INTEGER,
  duration_minutes INTEGER,
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para prescrições de exercícios detalhadas
CREATE TABLE IF NOT EXISTS patient_exercise_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_plan_id UUID REFERENCES exercise_plans(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 1,
  weight_kg DECIMAL(5,2),
  rest_time_seconds INTEGER DEFAULT 60,
  frequency_per_week INTEGER DEFAULT 3,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  special_instructions TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE exercise_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exercise_prescriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para exercise_favorites
CREATE POLICY "Users can view their own favorites" ON exercise_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" ON exercise_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON exercise_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para exercise_protocols
CREATE POLICY "Authenticated users can view protocols" ON exercise_protocols
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create protocols" ON exercise_protocols
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can update their protocols" ON exercise_protocols
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their protocols" ON exercise_protocols
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas RLS para patient_exercise_logs
CREATE POLICY "Authenticated users can view exercise logs" ON patient_exercise_logs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create exercise logs" ON patient_exercise_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercise logs" ON patient_exercise_logs
  FOR UPDATE USING (true);

-- Políticas RLS para patient_exercise_prescriptions
CREATE POLICY "Authenticated users can view prescriptions" ON patient_exercise_prescriptions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create prescriptions" ON patient_exercise_prescriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update prescriptions" ON patient_exercise_prescriptions
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete prescriptions" ON patient_exercise_prescriptions
  FOR DELETE USING (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_exercise_protocols_updated_at ON exercise_protocols;
CREATE TRIGGER update_exercise_protocols_updated_at
  BEFORE UPDATE ON exercise_protocols
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_exercise_prescriptions_updated_at
  BEFORE UPDATE ON patient_exercise_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar bucket para vídeos de exercícios se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para thumbnails se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercise-thumbnails', 'exercise-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para exercise-videos
CREATE POLICY "Exercise videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'exercise-videos');

CREATE POLICY "Authenticated users can upload exercise videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exercise-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update exercise videos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'exercise-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete exercise videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'exercise-videos' AND auth.role() = 'authenticated');

-- Políticas de storage para exercise-thumbnails
CREATE POLICY "Exercise thumbnails are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'exercise-thumbnails');

CREATE POLICY "Authenticated users can upload exercise thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exercise-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update exercise thumbnails" ON storage.objects
  FOR UPDATE USING (bucket_id = 'exercise-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete exercise thumbnails" ON storage.objects
  FOR DELETE USING (bucket_id = 'exercise-thumbnails' AND auth.role() = 'authenticated');