CREATE TABLE IF NOT EXISTS marketing_consents (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  social_media boolean NOT NULL DEFAULT false,
  educational_material boolean NOT NULL DEFAULT false,
  website boolean NOT NULL DEFAULT false,
  signed_at timestamptz NOT NULL DEFAULT NOW(),
  signed_by text NOT NULL,
  signature_ip text,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_consents_org ON marketing_consents (organization_id);

CREATE TABLE IF NOT EXISTS marketing_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  export_type text NOT NULL DEFAULT 'video_comparison',
  file_path text NOT NULL,
  file_url text NOT NULL,
  is_anonymized boolean NOT NULL DEFAULT true,
  metrics_overlay jsonb NOT NULL DEFAULT '[]'::jsonb,
  asset_a_id text,
  asset_b_id text,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_exports_org_created ON marketing_exports (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_exports_patient ON marketing_exports (patient_id);

CREATE TABLE IF NOT EXISTS marketing_review_configs (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  trigger_status jsonb NOT NULL DEFAULT '["alta","concluido"]'::jsonb,
  message_template text NOT NULL DEFAULT '',
  delay_hours integer NOT NULL DEFAULT 24,
  google_place_id text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_birthday_configs (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  message_template text NOT NULL DEFAULT '',
  send_whatsapp boolean NOT NULL DEFAULT true,
  send_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_recall_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  days_without_visit integer NOT NULL DEFAULT 180,
  message_template text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_recall_campaigns_org ON marketing_recall_campaigns (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  reward_type text NOT NULL,
  reward_value numeric(12,2) NOT NULL DEFAULT 0,
  referrer_reward jsonb,
  uses integer NOT NULL DEFAULT 0,
  max_uses integer,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_org ON referral_codes (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_codes_patient ON referral_codes (patient_id);

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  new_patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_org ON referral_redemptions (organization_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referrer ON referral_redemptions (referrer_patient_id);

CREATE TABLE IF NOT EXISTS fisio_links (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  whatsapp_number text,
  google_maps_url text,
  phone text,
  show_before_after boolean NOT NULL DEFAULT true,
  show_reviews boolean NOT NULL DEFAULT true,
  custom_message text,
  theme text NOT NULL DEFAULT 'clinical',
  primary_color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fisio_link_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  button text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fisio_link_analytics_slug_clicked ON fisio_link_analytics (slug, clicked_at DESC);

CREATE TABLE IF NOT EXISTS content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL,
  status text NOT NULL DEFAULT 'idea',
  date date,
  hashtags text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_org_date ON content_calendar (organization_id, date, created_at DESC);
