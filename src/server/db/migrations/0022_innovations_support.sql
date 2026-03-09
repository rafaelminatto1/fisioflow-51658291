CREATE TABLE IF NOT EXISTS clinic_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  item_name text NOT NULL,
  category text,
  current_quantity integer NOT NULL DEFAULT 0,
  minimum_quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidade',
  cost_per_unit numeric(12,2),
  supplier text,
  last_restock_date timestamptz,
  expiration_date timestamptz,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_inventory_org_active_name
  ON clinic_inventory (organization_id, is_active, item_name);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  reason text,
  related_appointment_id uuid,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_inventory_created
  ON inventory_movements (organization_id, inventory_id, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  therapist_id uuid NOT NULL,
  metric_date date NOT NULL,
  total_appointments integer NOT NULL DEFAULT 0,
  completed_appointments integer NOT NULL DEFAULT 0,
  cancelled_appointments integer NOT NULL DEFAULT 0,
  no_show_appointments integer NOT NULL DEFAULT 0,
  average_session_duration numeric(10,2),
  patient_satisfaction_avg numeric(10,2),
  revenue_generated numeric(12,2) NOT NULL DEFAULT 0,
  new_patients integer NOT NULL DEFAULT 0,
  returning_patients integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_performance_org_therapist_date
  ON staff_performance_metrics (organization_id, therapist_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  forecast_date date NOT NULL,
  predicted_revenue numeric(12,2) NOT NULL DEFAULT 0,
  actual_revenue numeric(12,2),
  predicted_appointments integer NOT NULL DEFAULT 0,
  actual_appointments integer,
  confidence_interval_low numeric(12,2) NOT NULL DEFAULT 0,
  confidence_interval_high numeric(12,2) NOT NULL DEFAULT 0,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_org_forecast_date
  ON revenue_forecasts (organization_id, forecast_date DESC);

CREATE TABLE IF NOT EXISTS whatsapp_exercise_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  exercise_plan_id uuid,
  phone_number text NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_exercise_queue_org_created
  ON whatsapp_exercise_queue (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  assessment_type text NOT NULL,
  question text NOT NULL,
  response text,
  numeric_value numeric(10,2),
  received_via text NOT NULL DEFAULT 'whatsapp',
  sent_at timestamptz,
  responded_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_self_assessments_org_patient_created
  ON patient_self_assessments (organization_id, patient_id, created_at DESC);
