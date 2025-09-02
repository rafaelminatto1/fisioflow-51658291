-- AI Economic System Tables
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('protocolo', 'exercicio', 'caso_clinico', 'diagnostico', 'tecnica')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES public.profiles(id),
  usage_count INTEGER DEFAULT 0,
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  response TEXT NOT NULL,
  source TEXT NOT NULL,
  cache_type TEXT NOT NULL DEFAULT 'semantic',
  confidence_score FLOAT DEFAULT 0.5,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  patient_id UUID REFERENCES public.patients(id),
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  source TEXT NOT NULL,
  processing_time_ms INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0.5,
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.ai_provider_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('chatgpt', 'claude', 'gemini', 'perplexity')),
  account_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  daily_usage_count INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 50,
  last_used_at TIMESTAMP WITH TIME ZONE,
  reset_time TIME DEFAULT '00:00:00',
  credentials_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view knowledge base" ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY "Staff can manage knowledge base" ON public.knowledge_base FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta'))
);

CREATE POLICY "System can manage AI cache" ON public.ai_cache FOR ALL USING (true);

CREATE POLICY "Users can view their queries" ON public.ai_queries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create queries" ON public.ai_queries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their queries" ON public.ai_queries FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Staff can manage prompts" ON public.ai_prompts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta'))
);

CREATE POLICY "Admins can manage provider accounts" ON public.ai_provider_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Indexes for performance
CREATE INDEX idx_knowledge_base_type ON public.knowledge_base(type);
CREATE INDEX idx_knowledge_base_tags ON public.knowledge_base USING GIN(tags);
CREATE INDEX idx_ai_cache_query_hash ON public.ai_cache(query_hash);
CREATE INDEX idx_ai_cache_expires ON public.ai_cache(expires_at);
CREATE INDEX idx_ai_queries_user_id ON public.ai_queries(user_id);
CREATE INDEX idx_ai_queries_patient_id ON public.ai_queries(patient_id);
CREATE INDEX idx_ai_provider_accounts_provider ON public.ai_provider_accounts(provider, is_active);

-- Triggers
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts
INSERT INTO public.ai_prompts (name, category, template, variables) VALUES
('protocol_generation', 'protocolo', 
'Paciente: {{age}} anos, {{gender}}
Diagnóstico: {{diagnosis}}
Limitações: {{limitations}}
Objetivo: {{goal}}

Sugira protocolo de fisioterapia com:
1. Exercícios específicos por fase
2. Progressão temporal
3. Critérios de evolução
4. Sinais de alerta

Formato: JSON estruturado com fases, exercícios e observações.',
'{"age": "integer", "gender": "string", "diagnosis": "string", "limitations": "string", "goal": "string"}'),

('differential_diagnosis', 'diagnostico',
'Sintomas apresentados: {{symptoms}}
Exame físico: {{physical_exam}}
História clínica: {{history}}

Forneça diagnóstico diferencial para fisioterapia considerando:
1. Principais hipóteses diagnósticas
2. Testes específicos recomendados
3. Sinais de alerta (red flags)
4. Encaminhamentos necessários

Formato: Lista estruturada com probabilidades.',
'{"symptoms": "string", "physical_exam": "string", "history": "string"}'),

('exercise_progression', 'exercicio',
'Exercício atual: {{current_exercise}}
Nível do paciente: {{patient_level}}
Evolução até agora: {{progress}}
Limitações: {{limitations}}

Sugira progressão do exercício considerando:
1. Próximo nível de dificuldade
2. Variações possíveis
3. Critérios para progressão
4. Adaptações se necessário

Formato: Descrição detalhada com parâmetros.',
'{"current_exercise": "string", "patient_level": "string", "progress": "string", "limitations": "string"}');

-- Insert sample knowledge base entries
INSERT INTO public.knowledge_base (type, title, content, tags, confidence_score) VALUES
('protocolo', 'Protocolo Lombalgia Aguda', 
'Fase 1 (0-2 semanas): Repouso relativo, crioterapia, exercícios respiratórios.
Fase 2 (2-4 semanas): Mobilização precoce, exercícios de estabilização.
Fase 3 (4-8 semanas): Fortalecimento progressivo, exercícios funcionais.
Critérios de evolução: Redução da dor, melhora da mobilidade, retorno funcional.',
ARRAY['lombalgia', 'dor_lombar', 'protocolo', 'fisioterapia'], 0.9),

('tecnica', 'Mobilização Neural Ciático',
'Técnica: Paciente em decúbito dorsal, flexão de quadril 90°, extensão progressiva do joelho.
Indicações: Dor ciática, tensão neural positiva.
Contraindicações: Dor radicular severa, sinais neurológicos graves.
Progressão: 3 séries de 10 repetições, 2x ao dia.',
ARRAY['mobilizacao_neural', 'ciatico', 'dor_radicular'], 0.85);