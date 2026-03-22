-- Migration 0034: Therapist commission configuration and payouts

CREATE TABLE IF NOT EXISTS therapist_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  therapist_id TEXT NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapist_commissions_org ON therapist_commissions (organization_id);
CREATE INDEX IF NOT EXISTS idx_therapist_commissions_therapist ON therapist_commissions (therapist_id);

CREATE TABLE IF NOT EXISTS commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  therapist_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_org ON commission_payouts (organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_payouts_therapist ON commission_payouts (therapist_id);
