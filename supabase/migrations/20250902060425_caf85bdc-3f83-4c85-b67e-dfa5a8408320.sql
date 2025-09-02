-- Adicionar campos faltantes na tabela appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Configurações de horário por profissional
CREATE TABLE schedule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES profiles(id),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=domingo, 6=sábado
  start_time TIME,
  end_time TIME,
  break_start TIME,
  break_end TIME,
  consultation_duration INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule_settings
CREATE POLICY "Authenticated users can view schedule settings" 
ON schedule_settings FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create schedule settings" 
ON schedule_settings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule settings" 
ON schedule_settings FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete schedule settings" 
ON schedule_settings FOR DELETE 
USING (true);

-- Bloqueios de agenda
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES profiles(id),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT,
  block_type TEXT CHECK (block_type IN ('vacation', 'holiday', 'personal', 'maintenance')) DEFAULT 'personal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule_blocks
CREATE POLICY "Authenticated users can view schedule blocks" 
ON schedule_blocks FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create schedule blocks" 
ON schedule_blocks FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule blocks" 
ON schedule_blocks FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete schedule blocks" 
ON schedule_blocks FOR DELETE 
USING (true);

-- Lista de espera
CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  preferred_therapist_id UUID REFERENCES profiles(id),
  preferred_times JSONB, -- horários preferidos
  urgency_level INTEGER DEFAULT 3 CHECK (urgency_level >= 1 AND urgency_level <= 5), -- 1=baixa, 5=alta
  notes TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'scheduled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

-- Create policies for waiting_list
CREATE POLICY "Authenticated users can view waiting list" 
ON waiting_list FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create waiting list entries" 
ON waiting_list FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update waiting list entries" 
ON waiting_list FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete waiting list entries" 
ON waiting_list FOR DELETE 
USING (true);

-- Recorrência de agendamentos
CREATE TABLE appointment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  therapist_id UUID REFERENCES profiles(id),
  recurrence_pattern JSONB NOT NULL, -- configuração da recorrência
  total_sessions INTEGER,
  sessions_completed INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE appointment_series ENABLE ROW LEVEL SECURITY;

-- Create policies for appointment_series
CREATE POLICY "Authenticated users can view appointment series" 
ON appointment_series FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create appointment series" 
ON appointment_series FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointment series" 
ON appointment_series FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete appointment series" 
ON appointment_series FOR DELETE 
USING (true);

-- Create trigger for updated_at columns
CREATE TRIGGER update_schedule_settings_updated_at
BEFORE UPDATE ON schedule_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_blocks_updated_at
BEFORE UPDATE ON schedule_blocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waiting_list_updated_at
BEFORE UPDATE ON waiting_list
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_series_updated_at
BEFORE UPDATE ON appointment_series
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();