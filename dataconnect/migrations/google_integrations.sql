-- Tabela para armazenar integrações OAuth (Google, etc)
CREATE TABLE "public"."user_integrations" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL, -- 'google_calendar', 'google_business', etc
  "access_token" text,
  "refresh_token" text,
  "scope" text,
  "expiry_date" bigint,
  "metadata" jsonb DEFAULT '{}'::jsonb, -- Configurações extras (ex: qual calendário sincronizar)
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Tabela para dados de saúde (Health Connect / Apple Health)
CREATE TABLE "public"."patient_health_data" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "patient_id" uuid NOT NULL,
  "data_type" text NOT NULL, -- 'steps', 'heart_rate', 'sleep'
  "value" numeric,
  "unit" text,
  "measured_at" timestamptz NOT NULL,
  "source" text, -- 'google_fit', 'apple_health'
  "created_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Index para performance
CREATE INDEX idx_integrations_user ON "public"."user_integrations" ("user_id");
CREATE INDEX idx_health_patient ON "public"."patient_health_data" ("patient_id");
