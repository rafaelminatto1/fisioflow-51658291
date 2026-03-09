CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL,
  sessoes integer,
  validade_dias integer NOT NULL DEFAULT 30,
  preco numeric(12,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id text NOT NULL,
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  sessoes_restantes integer NOT NULL DEFAULT 0,
  sessoes_totais integer NOT NULL DEFAULT 0,
  data_compra timestamptz NOT NULL DEFAULT now(),
  data_expiracao timestamptz NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  valor_pago numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voucher_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id text NOT NULL,
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  user_voucher_id uuid REFERENCES user_vouchers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_org_active
  ON vouchers (organization_id, ativo, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_active
  ON user_vouchers (user_id, ativo, data_compra DESC);

CREATE INDEX IF NOT EXISTS idx_voucher_checkout_sessions_user_status
  ON voucher_checkout_sessions (user_id, status, created_at DESC);
