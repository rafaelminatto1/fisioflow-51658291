-- 0131_nfse_schema_compat.sql
-- Garante que endpoints de /api/nfse tenham as colunas esperadas em produção.
-- Idempotente para ambientes que passaram por schemas distintos (Focus NFe, PMSP direta e schema financeiro alinhado).

BEGIN;

ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS cnpj_prestador TEXT;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS municipio_codigo TEXT DEFAULT '3550308';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS regime_tributario TEXT DEFAULT 'simples_nacional';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS optante_simples BOOLEAN DEFAULT true;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS tp_opcao_simples INTEGER DEFAULT 4;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS incentivo_fiscal BOOLEAN DEFAULT false;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS aliquota_iss NUMERIC(5,4) DEFAULT 0.02;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS codigo_servico_padrao TEXT DEFAULT '04391';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS cnae TEXT DEFAULT '8650-0/04';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS discriminacao_padrao TEXT DEFAULT 'Serviços de Fisioterapia';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS ambiente TEXT DEFAULT 'homologacao';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS contabilidade_email TEXT;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS contabilidade_automacao_ativa BOOLEAN DEFAULT false;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE
  set_parts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'nfse_config' AND column_name = 'provider_tax_id'
  ) THEN
    set_parts := array_append(set_parts, 'cnpj_prestador = COALESCE(cnpj_prestador, provider_tax_id)');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'nfse_config' AND column_name = 'city_code'
  ) THEN
    set_parts := array_append(set_parts, 'municipio_codigo = COALESCE(municipio_codigo, city_code)');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'nfse_config' AND column_name = 'city_registration'
  ) THEN
    set_parts := array_append(set_parts, 'inscricao_municipal = COALESCE(inscricao_municipal, city_registration)');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'nfse_config' AND column_name = 'iss_rate'
  ) THEN
    set_parts := array_append(set_parts, 'aliquota_iss = COALESCE(aliquota_iss, iss_rate)');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'nfse_config' AND column_name = 'environment'
  ) THEN
    set_parts := array_append(set_parts, 'ambiente = COALESCE(ambiente, environment)');
  END IF;

  IF array_length(set_parts, 1) IS NOT NULL THEN
    EXECUTE 'UPDATE public.nfse_config SET ' || array_to_string(set_parts || ARRAY['updated_at = NOW()'], ', ');
  END IF;
END $$;

ALTER TABLE public.nfse_records ADD COLUMN IF NOT EXISTS link_danfse TEXT;
ALTER TABLE public.nfse_records ADD COLUMN IF NOT EXISTS sp_lote_numero TEXT;
ALTER TABLE public.nfse_records ADD COLUMN IF NOT EXISTS enviado_contabilidade_at TIMESTAMPTZ;
ALTER TABLE public.nfse_records ADD COLUMN IF NOT EXISTS tentativas_envio INTEGER DEFAULT 0;
ALTER TABLE public.nfse_records ADD COLUMN IF NOT EXISTS ultimo_erro TEXT;
ALTER TABLE public.nfse_records ADD COLUMN IF NOT EXISTS workflow_id TEXT;

COMMIT;
