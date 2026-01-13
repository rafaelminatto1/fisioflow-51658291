-- Migration: Enriquecer templates com informações clínicas baseadas em evidências
-- Data: 2025-01-13
-- Descrição: Adiciona campos para observações clínicas, contraindicações e referências bibliográficas

-- Adicionar campos à tabela exercise_templates
ALTER TABLE public.exercise_templates
  ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
  ADD COLUMN IF NOT EXISTS contraindications TEXT,
  ADD COLUMN IF NOT EXISTS precautions TEXT,
  ADD COLUMN IF NOT EXISTS progression_notes TEXT,
  ADD COLUMN IF NOT EXISTS evidence_level TEXT,
  ADD COLUMN IF NOT EXISTS bibliographic_references TEXT[];

-- Adicionar comentários aos novos campos
COMMENT ON COLUMN public.exercise_templates.clinical_notes IS 'Observações clínicas detalhadas sobre o protocolo, incluindo foco muscular e objetivos específicos';
COMMENT ON COLUMN public.exercise_templates.contraindications IS 'Contraindicações absolutas e relativas para este protocolo';
COMMENT ON COLUMN public.exercise_templates.precautions IS 'Precauções e cuidados especiais durante a execução';
COMMENT ON COLUMN public.exercise_templates.progression_notes IS 'Notas sobre progressão e critérios para avançar de fase';
COMMENT ON COLUMN public.exercise_templates.evidence_level IS 'Nível de evidência: A (alta), B (moderada), C (baixa) ou D (opinião de especialistas)';
COMMENT ON COLUMN public.exercise_templates.bibliographic_references IS 'Referências bibliográficas que fundamentam o protocolo';

-- Adicionar campo de observações clínicas específicas por exercício no template
ALTER TABLE public.exercise_template_items
  ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
  ADD COLUMN IF NOT EXISTS focus_muscles TEXT[],
  ADD COLUMN IF NOT EXISTS purpose TEXT;

COMMENT ON COLUMN public.exercise_template_items.clinical_notes IS 'Observações clínicas específicas deste exercício no contexto do template';
COMMENT ON COLUMN public.exercise_template_items.focus_muscles IS 'Músculos alvo específicos a serem fortalecidos nesta fase';
COMMENT ON COLUMN public.exercise_template_items.purpose IS 'Objetivo específico deste exercício no protocolo';
