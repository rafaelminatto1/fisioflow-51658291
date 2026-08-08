-- 0168_patient_portal_rls.sql
-- Create Data API role for Patient Portal

DO $$ BEGIN
    CREATE ROLE patient_portal;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Basic grants for the role
GRANT USAGE ON SCHEMA public TO patient_portal;

-- Grant only SELECT (Read-Only) to the relevant tables
GRANT SELECT ON patients TO patient_portal;
GRANT SELECT ON appointments TO patient_portal;
GRANT SELECT ON sessions TO patient_portal;
GRANT SELECT ON exercises TO patient_portal;
GRANT SELECT ON payments TO patient_portal;
GRANT SELECT ON financial_accounts TO patient_portal;

-- 1. Patients: patient can read their own profile
CREATE POLICY policy_patients_portal_read ON patients
  FOR SELECT
  TO patient_portal
  USING (id = (NULLIF(current_setting('app.patient_id', true), '')::uuid));

-- 2. Appointments: patient can read their own appointments
CREATE POLICY policy_appointments_portal_read ON appointments
  FOR SELECT
  TO patient_portal
  USING (patient_id = (NULLIF(current_setting('app.patient_id', true), '')::uuid));

-- 3. Sessions: patient can read their own sessions and progress
CREATE POLICY policy_sessions_portal_read ON sessions
  FOR SELECT
  TO patient_portal
  USING (patient_id = (NULLIF(current_setting('app.patient_id', true), '')::uuid));

-- 4. Exercises: patient can read exercises that belong to their clinic or public ones
CREATE POLICY policy_exercises_portal_read ON exercises
  FOR SELECT
  TO patient_portal
  USING (
    is_public = true OR 
    organization_id = (
      SELECT organization_id FROM patients 
      WHERE id = (NULLIF(current_setting('app.patient_id', true), '')::uuid)
    )
  );

-- 5. Financial/Billing: patient can read their own payments and accounts
CREATE POLICY policy_payments_portal_read ON payments
  FOR SELECT
  TO patient_portal
  USING (patient_id = (NULLIF(current_setting('app.patient_id', true), '')::uuid));

CREATE POLICY policy_financial_accounts_portal_read ON financial_accounts
  FOR SELECT
  TO patient_portal
  USING (patient_id = (NULLIF(current_setting('app.patient_id', true), '')::uuid));

-- No INSERT, UPDATE, or DELETE grants are provided, ensuring read-only access via Data API.
