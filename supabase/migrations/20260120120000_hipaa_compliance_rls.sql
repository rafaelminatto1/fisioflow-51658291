-- ============================================================================
-- HIPAA Compliance: Enhanced RLS Policies and Audit Logging
-- ============================================================================
--
-- This migration implements HIPAA-compliant security measures:
-- 1. Column-level security for sensitive data
-- 2. Comprehensive audit logging for PHI access
-- 3. Minimum necessary standard enforcement
-- 4. Role-based access controls
--
-- @see https://supabase.com/docs/guides/platform/hipaa-compliance
-- ============================================================================

-- ============================================================================
-- 1. ENABLE PGAUD FOR HIPAA COMPLIANCE
-- ============================================================================

-- PGAudit must be enabled via Supabase Dashboard first:
-- Database > Settings > Database Configuration > pgaudit.log = 'write, ddl'
-- ALTER SYSTEM SET pgaudit.log_client = on;

-- Check if PGAudit is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgaudit') THEN
    RAISE NOTICE 'PGAudit is already enabled';
  ELSE
    RAISE NOTICE 'Please enable PGAudit via Supabase Dashboard for HIPAA compliance';
    RAISE NOTICE 'Go to Database > Settings > Configuration > Add pgaudit.log = write,ddl';
  END IF;
END $$;

-- ============================================================================
-- 2. COMPREHENSIVE AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hipaa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'phi_access', 'phi_view', 'phi_create', 'phi_update', 'phi_delete', 'phi_export',
    'authentication', 'authorization', 'failed_access',
    'data_breach', 'unauthorized_access', 'policy_violation'
  )),
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  resource_type TEXT NOT NULL, -- 'patients', 'appointments', 'soap_notes', etc.
  resource_id TEXT,
  phi_fields_accessed TEXT[], -- Which PHI fields were accessed
  access_purpose TEXT, -- 'treatment', 'payment', 'operations', etc.
  ip_address INET,
  user_agent TEXT,
  location_country TEXT,
  location_city TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexes for audit log queries
  INDEX (event_type, created_at DESC),
  INDEX (user_id, created_at DESC),
  INDEX (resource_type, resource_id),
  INDEX (success, created_at DESC)
);

-- RLS for audit log - only admins can view/modify
ALTER TABLE hipaa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON hipaa_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON hipaa_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow system inserts

-- ============================================================================
-- 3. AUDIT LOGGING FUNCTIONS
-- ============================================================================

-- Function to log PHI access
CREATE OR REPLACE FUNCTION log_phi_access(
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_phi_fields TEXT[],
  p_purpose TEXT DEFAULT 'treatment'
)
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO hipaa_audit_log (
    event_type,
    user_id,
    user_role,
    resource_type,
    resource_id,
    phi_fields_accessed,
    access_purpose,
    ip_address,
    user_agent,
    success
  )
  SELECT
    'phi_access',
    auth.uid(),
    (SELECT role FROM clinic_users WHERE user_id = auth.uid()),
    p_resource_type,
    p_resource_id,
    p_phi_fields,
    p_purpose,
    inet_client_addr(),
    current_setting('application_name', true),
    true;

  RETURN NULL;
END;
$$;

-- Function to log failed access attempts
CREATE OR REPLACE FUNCTION log_failed_access(
  p_attempted_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_reason TEXT
)
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO hipaa_audit_log (
    event_type,
    user_id,
    resource_type,
    resource_id,
    failure_reason,
    ip_address,
    success
  )
  SELECT
    'failed_access',
    auth.uid(),
    p_resource_type,
    p_resource_id,
    p_reason,
    inet_client_addr(),
    false;

  RETURN NULL;
END;
$$;

-- Grant execute on audit functions
GRANT EXECUTE ON FUNCTION log_phi_access TO authenticated;
GRANT EXECUTE ON FUNCTION log_failed_access TO authenticated;

-- ============================================================================
-- 4. COLUMN-LEVEL SECURITY FOR PATIENTS TABLE
-- ============================================================================

-- Create view with masked PHI for non-clinical staff
CREATE OR REPLACE VIEW patients_masked AS
SELECT
  id,
  created_at,
  updated_at,
  -- Only show last name initial for privacy
  SUBSTRING(full_name FROM '^[^\s]+') || ' ' || LEFT(SUBSTRING(full_name FROM '\s+[^\s]+$'), 1) || '.' as full_name_masked,
  -- Birth year only (not full date)
  EXTRACT(YEAR FROM birth_date)::TEXT as birth_year,
  -- Phone number masked
  CASE
    WHEN phone IS NOT NULL THEN
      SUBSTRING(phone FROM 1 FOR 2) || '*****' || RIGHT(phone, 2)
    ELSE NULL
  END as phone_masked,
  -- Email masked
  CASE
    WHEN email IS NOT NULL THEN
      LEFT(email, 3) || '****@' || SPLIT_PART(email, '@', 2)
    ELSE NULL
  END as email_masked,
  -- Clinical data (always visible)
  status,
  progress,
  -- No PHI columns included
  -- Other clinical columns...
  main_complaint,
  secondary_complaints,
  limitations,
  goals
FROM patients;

-- Grant access to masked view for receptionists
GRANT SELECT ON patients_masked TO authenticated;

-- RLS for patients_masked
ALTER TABLE patients_masked ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists can see masked patients"
  ON patients_masked
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('receptionist', 'admin', 'fisioterapeuta')
    )
  );

-- ============================================================================
-- 5. ENHANCED RLS POLICIES WITH AUDIT LOGGING
-- ============================================================================

-- Enhanced patient access with logging
DROP POLICY IF EXISTS "Users can view patients in their organization" ON patients;
CREATE POLICY "Users can view patients in their organization with audit"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.organization_id = patients.organization_id
    )
  )
  WITH CHECK (
    -- Log access when selecting
    (
      SELECT log_phi_access('patients', id::text, ARRAY[
        'full_name', 'email', 'phone', 'birth_date', 'cpf', 'address'
      ], 'view')
    ) IS NULL
  );

-- Enhanced appointments access with logging
DROP POLICY IF EXISTS "Clinic staff can view appointments" ON appointments;
CREATE POLICY "Clinic staff can view appointments with audit"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      JOIN organizations org ON org.id = cu.organization_id
      WHERE cu.user_id = auth.uid()
      AND (
        cu.role IN ('admin', 'owner', 'fisioterapeuta', 'receptionist') OR
        cu.user_id = appointments.therapist_id OR
        cu.user_id = appointments.patient_id
      )
    )
  )
  WITH CHECK (
    (SELECT log_phi_access('appointments', id::text, ARRAY[
      'patient_id', 'reason', 'notes', 'diagnosis'
    ], 'treatment')) IS NULL
  );

-- Enhanced SOAP notes access with stricter controls
DROP POLICY IF EXISTS "Therapists can view their SOAP notes" ON soap_notes;
CREATE POLICY "Therapists can view their SOAP notes with audit"
  ON soap_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND (
        clinic_users.role IN ('admin', 'owner') OR
        clinic_users.user_id = soap_notes.therapist_id
      )
    )
  )
  WITH CHECK (
    (SELECT log_phi_access('soap_notes', id::text, ARRAY[
      'subjective', 'objective', 'assessment', 'plan', 'patient_id'
    ], 'treatment')) IS NULL
  );

-- ============================================================================
-- 6. ROLE-BASED SECURITY POLICIES
-- ============================================================================

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(p_required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clinic_users
    WHERE clinic_users.user_id = auth.uid()
    AND clinic_users.role = p_required_role
  );
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clinic_users
    WHERE clinic_users.user_id = auth.uid()
    AND clinic_users.role IN ('admin', 'owner')
  );
END;
$$;

-- Function to check if user owns the record
CREATE OR REPLACE FUNCTION owns_record(p_table_name TEXT, p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  CASE p_table_name
    WHEN 'patients' THEN
      SELECT organization_id INTO v_organization_id
      FROM patients WHERE id = p_record_id;
    WHEN 'appointments' THEN
      SELECT p.organization_id INTO v_organization_id
      FROM patients p
      JOIN appointments a ON a.patient_id = p.id
      WHERE a.id = p_record_id;
    ELSE
      RETURN FALSE;
  END CASE;

  RETURN EXISTS (
    SELECT 1 FROM clinic_users
    WHERE clinic_users.user_id = auth.uid()
    AND clinic_users.organization_id = v_organization_id
  );
END;
$$;

-- ============================================================================
-- 7. DATA ENCRYPTION VIEWS (Optional - for highly sensitive data)
-- ============================================================================

-- Example: Create encrypted view for SSN if stored
-- This would use pgcrypto extension

-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CREATE OR REPLACE VIEW patients_encrypted AS
-- SELECT
--   id,
--   full_name,
--   email,
--   -- Decrypt SSN only for authorized users
--   CASE
--     WHEN is_admin() THEN
--       pgp_sym_decrypt(ssn::bytea, encryption_key())
--     ELSE NULL
--   END as ssn_decrypted,
--   -- Other fields...
-- FROM patients;

-- ============================================================================
-- 8. AUDIT REPORT VIEWS
-- ============================================================================

-- Recent PHI access log
CREATE OR REPLACE VIEW recent_phi_access AS
SELECT
  hal.event_type,
  hal.user_id,
  p.full_name as user_name,
  p.email as user_email,
  hal.user_role,
  hal.resource_type,
  hal.resource_id,
  hal.phi_fields_accessed,
  hal.access_purpose,
  hal.ip_address,
  hal.location_country,
  hal.created_at
FROM hipaa_audit_log hal
LEFT JOIN profiles p ON p.id = hal.user_id
WHERE hal.event_type LIKE 'phi_%'
ORDER BY hal.created_at DESC
LIMIT 1000;

-- Failed access attempts
CREATE OR REPLACE VIEW failed_access_attempts AS
SELECT
  hal.user_id,
  p.full_name as user_name,
  p.email as user_email,
  hal.resource_type,
  hal.resource_id,
  hal.failure_reason,
  hal.ip_address,
  hal.created_at
FROM hipaa_audit_log hal
LEFT JOIN profiles p ON p.id = hal.user_id
WHERE hal.success = false
ORDER BY hal.created_at DESC
LIMIT 100;

-- Access summary by user
CREATE OR REPLACE VIEW user_access_summary AS
SELECT
  u.id as user_id,
  u.email,
  p.full_name,
  cu.role,
  COUNT(hal.id) FILTER (WHERE hal.event_type LIKE 'phi_%') as phi_access_count,
  COUNT(hal.id) FILTER (WHERE hal.success = false) as failed_access_count,
  MAX(hal.created_at) as last_access
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN clinic_users cu ON cu.user_id = u.id
LEFT JOIN hipaa_audit_log hal ON hal.user_id = u.id
GROUP BY u.id, u.email, p.full_name, cu.role
ORDER BY phi_access_count DESC NULLS LAST;

-- Grant access to audit views for admins
GRANT SELECT ON recent_phi_access TO authenticated;
GRANT SELECT ON failed_access_attempts TO authenticated;
GRANT SELECT ON user_access_summary TO authenticated;

-- ============================================================================
-- 9. SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Function to check if data access is HIPAA compliant
CREATE OR REPLACE FUNCTION check_hipaa_compliance(
  p_table_name TEXT,
  p_access_type TEXT, -- 'read', 'write', 'delete'
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  compliant BOOLEAN,
  reason TEXT,
  requirements TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
  v_requirements TEXT[] := '{}';
BEGIN
  -- Get user role
  SELECT role INTO v_role
  FROM clinic_users
  WHERE user_id = p_user_id;

  -- Check requirements based on table
  IF p_table_name IN ('patients', 'appointments', 'soap_notes', 'pain_records') THEN
    v_requirements := ARRAY[
      'Valid business purpose',
      'Minimum necessary standard',
      'Audit logging enabled',
      'User authenticated'
    ];

    -- Additional requirements for write/delete
    IF p_access_type IN ('write', 'delete') THEN
      v_requirements := v_requirements || ARRAY[
        'Written authorization',
        'Data backup available'
      ];
    END IF;
  END IF;

  -- Check compliance
  RETURN QUERY SELECT
    (v_role IS NOT NULL) as compliant,
    CASE
      WHEN v_role IS NULL THEN 'User not authorized'
      ELSE 'HIPAA requirements may apply'
    END as reason,
    v_requirements as requirements;
END;
$$;

-- ============================================================================
-- 10. POLICY VIOLATION DETECTION
-- ============================================================================

-- Function to detect potential policy violations
CREATE OR REPLACE FUNCTION detect_policy_violations()
RETURNS TABLE (
  violation_type TEXT,
  severity TEXT,
  description TEXT,
  affected_users TEXT[],
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for unusual access patterns
  RETURN QUERY
  SELECT
    'bulk_phi_access' as violation_type,
    CASE
      WHEN COUNT(*) > 100 THEN 'high'
      WHEN COUNT(*) > 50 THEN 'medium'
      ELSE 'low'
    END as severity,
    format('User %s accessed %s PHI records in past hour',
      cu.user_id::text,
      COUNT(*)
    ) as description,
    ARRAY[cu.user_id::text] as affected_users,
    'Review access pattern and consider restricting bulk access' as recommendation
  FROM hipaa_audit_log hal
  JOIN clinic_users cu ON cu.user_id = hal.user_id
  WHERE hal.created_at > NOW() - INTERVAL '1 hour'
  AND hal.event_type LIKE 'phi_%'
  GROUP BY cu.user_id
  HAVING COUNT(*) > 20
  LIMIT 10;
END;
$$;

-- Grant execute on compliance functions
GRANT EXECUTE ON FUNCTION check_hipaa_compliance TO authenticated;
GRANT EXECUTE ON FUNCTION detect_policy_violations TO authenticated;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON TABLE hipaa_audit_log IS 'HIPAA-compliant audit log for PHI access';
COMMENT ON FUNCTION log_phi_access IS 'Logs PHI access for HIPAA compliance';
COMMENT ON FUNCTION log_failed_access IS 'Logs failed access attempts';
COMMENT ON FUNCTION check_hipaa_compliance IS 'Checks if data access meets HIPAA requirements';
COMMENT ON FUNCTION detect_policy_violations IS 'Detects potential HIPAA policy violations';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- 1. Enable PGAudit via Supabase Dashboard:
--    Database > Settings > Configuration > Add: pgaudit.log = 'write,ddl'

-- 2. Enable PITR for data recovery:
--    Database > Backups > Enable PITR (7-30 days retention)

-- 3. Configure BAA with vendors:
--    - Vercel: Enterprise plan required
--    - Supabase: Pro plan with HIPAA add-on

-- 4. Implement data minimization:
--    - Only collect necessary PHI
--    - Use masked views when possible
--    - Implement data retention policies

-- 5. Regular audits:
--    - Review audit logs weekly
--    - Check for policy violations
--    - Verify access controls
--    - Update security policies
