-- Create pain_maps table for tracking patient pain evolution
CREATE TABLE IF NOT EXISTS public.pain_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.soap_records(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  global_pain_level INTEGER NOT NULL CHECK (global_pain_level >= 0 AND global_pain_level <= 10),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_pain_maps_patient_id ON public.pain_maps(patient_id);
CREATE INDEX idx_pain_maps_recorded_at ON public.pain_maps(recorded_at DESC);
CREATE INDEX idx_pain_maps_session_id ON public.pain_maps(session_id);

-- Enable RLS
ALTER TABLE public.pain_maps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins e fisios gerenciam mapas de dor"
  ON public.pain_maps
  FOR ALL
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários gerenciam mapas de pacientes atribuídos"
  ON public.pain_maps
  FOR ALL
  USING (
    user_has_role(auth.uid(), 'estagiario'::app_role) 
    AND estagiario_pode_acessar_paciente(auth.uid(), patient_id)
  );

CREATE POLICY "Pacientes visualizam seus mapas de dor"
  ON public.pain_maps
  FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id 
      FROM patients p 
      JOIN profiles pr ON pr.id = p.profile_id 
      WHERE pr.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_pain_maps_updated_at
  BEFORE UPDATE ON public.pain_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.pain_maps IS 'Mapas de dor dos pacientes para acompanhamento de evolução';