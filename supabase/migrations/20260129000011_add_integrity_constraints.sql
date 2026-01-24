-- ============================================================
-- MIGRATION: Add Data Integrity Constraints
-- ============================================================
-- This migration adds CHECK constraints and other integrity
-- rules to ensure data quality.
--
-- Impact: Improves data quality, prevents invalid data
-- ============================================================

-- ============================================================
-- Table: patients - Email and CPF validation
-- ============================================================

-- Email format validation
ALTER TABLE patients
ADD CONSTRAINT patients_email_format
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- CPF format validation (Brazilian ID)
ALTER TABLE patients
ADD CONSTRAINT patients_cpf_format
CHECK (cpf IS NULL OR cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$');

-- Phone format validation (Brazilian)
ALTER TABLE patients
ADD CONSTRAINT patients_phone_format
CHECK (phone IS NULL OR phone ~ '^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$');

-- Date of birth sanity check
ALTER TABLE patients
ADD CONSTRAINT patients_dob_reasonable
CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '1 year');

-- ============================================================
-- Table: appointments - Date and time validation
-- ============================================================

-- End time must be after start time
ALTER TABLE appointments
ADD CONSTRAINT appointments_end_after_start
CHECK (end_time > start_time);

-- Cannot schedule in the past (except for historical records)
ALTER TABLE appointments
ADD CONSTRAINT appointments_date_reasonable
CHECK (created_at IS NULL OR date >= CURRENT_DATE - INTERVAL '1 year' OR status = 'concluido');

-- ============================================================
-- Table: sessions - Duration validation
-- ============================================================

-- Session duration should be reasonable (5min to 8 hours)
ALTER TABLE sessions
ADD CONSTRAINT sessions_duration_reasonable
CHECK (
  duration_minutes IS NULL OR
  (duration_minutes >= 5 AND duration_minutes <= 480)
);

-- ============================================================
-- Table: payments - Amount validation
-- ============================================================

-- Payment amount must be positive
ALTER TABLE payments
ADD CONSTRAINT payments_amount_positive
CHECK (amount > 0);

-- Payment date cannot be in the future (for paid payments)
ALTER TABLE payments
ADD CONSTRAINT payments_payment_date_not_future
CHECK (
  payment_date IS NULL OR
  payment_date <= CURRENT_DATE OR
  status != 'paid'
);

-- ============================================================
-- Table: soap_records - Content validation
-- ============================================================

-- At least one SOAP section should be filled
ALTER TABLE soap_records
ADD CONSTRAINT soap_records_content_required
CHECK (
  subjective IS NOT NULL OR
  objective IS NOT NULL OR
  assessment IS NOT NULL OR
  plan IS NOT NULL
);

-- ============================================================
-- Table: organization_members - Role validation
-- ============================================================

-- Valid roles constraint
ALTER TABLE organization_members
ADD CONSTRAINT org_members_valid_role
CHECK (role IN ('admin', 'fisioterapeuta', 'estagiario', 'recepcao'));

-- ============================================================
-- Table: appointments - Status validation
-- ============================================================

-- Valid status values
ALTER TABLE appointments
ADD CONSTRAINT appointments_valid_status
CHECK (status IN (
  'agendado',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
  'nao_compareceu',
  'remarcado'
));

-- ============================================================
-- Table: payments - Status validation
-- ============================================================

-- Valid payment status
ALTER TABLE payments
ADD CONSTRAINT payments_valid_status
CHECK (status IN (
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'cancelled'
));

-- ============================================================
-- Table: patients - Status validation
-- ============================================================

-- Valid patient status
ALTER TABLE patients
ADD CONSTRAINT patients_valid_status
CHECK (status IN (
  'active',
  'inactive',
  'archived',
  'deceased'
));

-- ============================================================
-- Table: sessions - Status validation
-- ============================================================

-- Valid session status
ALTER TABLE sessions
ADD CONSTRAINT sessions_valid_status
CHECK (status IN (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
));

-- ============================================================
-- Additional NOT NULL constraints
-- ============================================================

-- Critical fields should not be null
ALTER TABLE appointments
ALTER COLUMN date SET NOT NULL,
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

ALTER TABLE sessions
ALTER COLUMN patient_id SET NOT NULL,
ALTER COLUMN therapist_id SET NOT NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check all constraints were added:
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conname LIKE '%_%_format'
  OR conname LIKE '%_%_reasonable'
  OR conname LIKE '%_%_valid'
  OR conname LIKE '%_%_positive'
ORDER BY conname;

-- ============================================================
-- TESTING
-- ============================================================

-- Test constraint violations (should fail):
-- INSERT INTO patients (id, full_name, email, cpf, created_at)
-- VALUES (gen_random_uuid(), 'Test', 'invalid-email', '123', now());
-- Expected: ERROR: patients_email_format constraint violated

-- ============================================================
-- NOTES
-- ============================================================

-- 1. These constraints may reject existing invalid data
-- 2. Run data cleanup before applying:
--    UPDATE patients SET email = NULL WHERE email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
-- 3. Test in staging environment first
-- 4. Monitor constraint violations in logs
-- 5. Add appropriate error messages in the application
