-- Migration 0167: Partnerships & Patient Sub-tags

CREATE TABLE IF NOT EXISTS partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(150) NOT NULL,
  description text,
  student_session_fee numeric(10, 2) NOT NULL DEFAULT 160.00,
  professor_pays boolean NOT NULL DEFAULT false,
  professor_session_fee numeric(10, 2) NOT NULL DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partnerships_org ON partnerships(organization_id);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS partnership_id uuid REFERENCES partnerships(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS partnership_role varchar(50); -- 'professor' | 'aluno_cliente'
