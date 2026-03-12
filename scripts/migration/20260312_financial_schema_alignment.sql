-- Migration: Align financial schema with Workers financial routes
-- Date: 2026-03-12
-- Notes:
-- - Replaces the old transacoes view workaround with concrete tables.
-- - Adds the missing financial tables expected by workers/src/routes/financial.ts.
-- - Patches patient_packages to the current route contract.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'transacoes'
          AND c.relkind = 'v'
    ) THEN
        EXECUTE 'DROP VIEW public.transacoes';
    END IF;
END $$;

-- Existing patient_packages uses package_status; consume route also needs 'depleted'.
ALTER TYPE public.package_status ADD VALUE IF NOT EXISTS 'depleted';

CREATE TABLE IF NOT EXISTS public.transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id TEXT,
    tipo TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    categoria TEXT,
    stripe_payment_intent_id TEXT,
    stripe_refund_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transacoes_org_created_at
    ON public.transacoes (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transacoes_org_tipo_status
    ON public.transacoes (organization_id, tipo, status);

CREATE TABLE IF NOT EXISTS public.centros_custo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    codigo TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_centros_custo_org_nome
    ON public.centros_custo (organization_id, nome);

CREATE TABLE IF NOT EXISTS public.empresas_parceiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    contato TEXT,
    email TEXT,
    telefone TEXT,
    contrapartidas TEXT,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresas_parceiras_org_nome
    ON public.empresas_parceiras (organization_id, nome);

CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    tipo_pessoa TEXT NOT NULL DEFAULT 'pj',
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cpf_cnpj TEXT,
    inscricao_estadual TEXT,
    email TEXT,
    telefone TEXT,
    celular TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    observacoes TEXT,
    categoria TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_org_razao_social
    ON public.fornecedores (organization_id, razao_social);

CREATE TABLE IF NOT EXISTS public.formas_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'geral',
    taxa_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    dias_recebimento INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_org_nome
    ON public.formas_pagamento (organization_id, nome);

CREATE TABLE IF NOT EXISTS public.convenios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnpj TEXT,
    telefone TEXT,
    email TEXT,
    contato_responsavel TEXT,
    valor_repasse NUMERIC(12,2),
    prazo_pagamento_dias INTEGER,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_convenios_org_nome
    ON public.convenios (organization_id, nome);

CREATE TABLE IF NOT EXISTS public.contas_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    descricao TEXT,
    data_vencimento DATE,
    pago_em DATE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    categoria TEXT,
    forma_pagamento TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_financeiras_org_status_vencimento
    ON public.contas_financeiras (organization_id, status, data_vencimento);

CREATE INDEX IF NOT EXISTS idx_contas_financeiras_org_tipo
    ON public.contas_financeiras (organization_id, tipo);

CREATE TABLE IF NOT EXISTS public.pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    evento_id UUID,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    valor NUMERIC(12,2) NOT NULL,
    forma_pagamento TEXT,
    status TEXT NOT NULL DEFAULT 'paid',
    pago_em DATE,
    observacoes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_org_pago_em
    ON public.pagamentos (organization_id, pago_em DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pagamentos_org_patient
    ON public.pagamentos (organization_id, patient_id);

CREATE TABLE IF NOT EXISTS public.session_package_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sessions_count INTEGER NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    validity_days INTEGER NOT NULL DEFAULT 365,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_package_templates_org
    ON public.session_package_templates (organization_id, sessions_count, created_at DESC);

ALTER TABLE public.patient_packages
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS package_template_id UUID,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();

UPDATE public.patient_packages pp
SET organization_id = p.organization_id
FROM public.patients p
WHERE pp.organization_id IS NULL
  AND p.id = pp.patient_id;

CREATE INDEX IF NOT EXISTS idx_patient_packages_org_patient
    ON public.patient_packages (organization_id, patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.package_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_package_id UUID NOT NULL REFERENCES public.patient_packages(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_usage_package_used_at
    ON public.package_usage (patient_package_id, used_at DESC);

CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL,
    sessoes INTEGER,
    validade_dias INTEGER NOT NULL DEFAULT 30,
    preco NUMERIC(12,2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_org_ativo_preco
    ON public.vouchers (organization_id, ativo, preco);

CREATE TABLE IF NOT EXISTS public.user_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
    sessoes_restantes INTEGER NOT NULL,
    sessoes_totais INTEGER NOT NULL,
    data_compra TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_expiracao TIMESTAMPTZ NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    valor_pago NUMERIC(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_org
    ON public.user_vouchers (user_id, organization_id, data_compra DESC);

CREATE TABLE IF NOT EXISTS public.voucher_checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
    user_voucher_id UUID REFERENCES public.user_vouchers(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_checkout_sessions_user_org
    ON public.voucher_checkout_sessions (user_id, organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.nfse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    serie TEXT,
    tipo TEXT NOT NULL DEFAULT 'saida',
    valor NUMERIC(12,2) NOT NULL,
    data_emissao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_prestacao TIMESTAMPTZ,
    destinatario JSONB NOT NULL DEFAULT '{}'::jsonb,
    prestador JSONB NOT NULL DEFAULT '{}'::jsonb,
    servico JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'rascunho',
    chave_acesso TEXT,
    protocolo TEXT,
    verificacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfse_org_data_emissao
    ON public.nfse (organization_id, data_emissao DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.nfse_config (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    ambiente TEXT NOT NULL DEFAULT 'homologacao',
    municipio_codigo TEXT,
    cnpj_prestador TEXT,
    inscricao_municipal TEXT,
    aliquota_iss NUMERIC(5,2) NOT NULL DEFAULT 5,
    auto_emissao BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
