-- ============================================================================
-- PITR (Point-in-Time Recovery) Configuration Migration
-- ============================================================================
--
-- This migration enables and configures Point-in-Time Recovery for FisioFlow.
--
-- IMPORTANT: PITR must be enabled via Supabase Dashboard or CLI:
-- 1. Go to Database > Backups
-- 2. Enable PITR with retention period (7-30 days recommended)
-- 3. This migration creates supporting structures
--
-- Benefits:
-- - Restore database to any point in time within retention period
-- - Essential for HIPAA compliance
-- - Protection against accidental deletes/updates
-- - Audit trail capabilities
--
-- @see https://supabase.com/docs/guides/platform/backups#pitr
-- ============================================================================

-- ============================================================================
-- 1. AUDIT LOG TABLE FOR PITR-RELATED ACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pitr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'restore_initiated', 'restore_completed', 'data_loss_prevented'
  initiated_by UUID REFERENCES auth.users(id),
  target_table TEXT,
  target_records TEXT[], -- Array of record IDs affected
  restore_point TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX (event_type, created_at DESC)
);

-- RLS for audit log
ALTER TABLE pitr_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all PITR audit logs"
  ON pitr_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "System can insert PITR audit logs"
  ON pitr_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 2. CRITICAL DATA SNAPSHOT TABLES (Manual Restore Points)
-- ============================================================================

-- Snapshot of critical patient data before major changes
CREATE TABLE IF NOT EXISTS data_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_name TEXT NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'manual', 'automated', 'before_migration', 'before_deletion'
  tables_included TEXT[] NOT NULL, -- ['patients', 'appointments', 'soap_notes']
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- When snapshot data can be archived
  metadata JSONB DEFAULT '{}'::jsonb,
  INDEX (snapshot_type, created_at DESC)
);

-- Actual snapshot data (JSONB format)
CREATE TABLE IF NOT EXISTS data_snapshot_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES data_snapshots(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX (snapshot_id, table_name),
  UNIQUE (snapshot_id, table_name, record_id)
);

-- RLS for snapshots
ALTER TABLE data_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_snapshot_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage snapshots"
  ON data_snapshots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can manage snapshot records"
  ON data_snapshot_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_snapshots
      WHERE data_snapshots.id = data_snapshot_records.snapshot_id
      AND EXISTS (
        SELECT 1 FROM clinic_users
        WHERE clinic_users.user_id = auth.uid()
        AND clinic_users.role IN ('admin', 'owner')
      )
    )
  );

-- ============================================================================
-- 3. AUTOMATED SNAPSHOT FUNCTIONS
-- ============================================================================

-- Function to create a data snapshot
CREATE OR REPLACE FUNCTION create_data_snapshot(
  p_snapshot_name TEXT,
  p_tables TEXT[],
  p_snapshot_type TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Create snapshot record
  INSERT INTO data_snapshots (snapshot_name, snapshot_type, tables_included, created_by)
  VALUES (p_snapshot_name, p_snapshot_type, p_tables, v_user_id)
  RETURNING id INTO v_snapshot_id;

  -- Snapshot each table's data
  FOREACH v_table_name IN ARRAY p_tables
  LOOP
    EXECUTE format(
      'INSERT INTO data_snapshot_records (snapshot_id, table_name, record_id, record_data)
      SELECT $1, %L, id::text, to_jsonb(t)
      FROM %I AS t',
      v_table_name, v_table_name
    ) USING v_snapshot_id;
  END LOOP;

  -- Log the snapshot creation
  INSERT INTO pitr_audit_log (event_type, initiated_by, target_table, metadata)
  VALUES (
    'snapshot_created',
    v_user_id,
    NULL,
    jsonb_build_object(
      'snapshot_id', v_snapshot_id,
      'snapshot_name', p_snapshot_name,
      'tables', p_tables,
      'type', p_snapshot_type
    )
  );

  RETURN v_snapshot_id;
END;
$$;

-- Grant execute on snapshot function
GRANT EXECUTE ON FUNCTION create_data_snapshot TO authenticated;

-- ============================================================================
-- 4. TRIGGER FOR AUTOMATIC SNAPSHOTS BEFORE DELETIONS
-- ============================================================================

-- Function to log critical deletions
CREATE OR REPLACE FUNCTION log_critical_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log before deletion for potential recovery
  INSERT INTO data_snapshot_records (snapshot_id, table_name, record_id, record_data)
  VALUES (
    gen_random_uuid(), -- Use NULL snapshot_id for deletion protection
    TG_TABLE_NAME,
    OLD.id::text,
    to_jsonb(OLD)
  );

  -- Create audit log entry
  INSERT INTO pitr_audit_log (event_type, target_table, target_records, metadata)
  VALUES (
    'deletion_protected',
    TG_TABLE_NAME,
    ARRAY[OLD.id::text],
    jsonb_build_object(
      'triggered_by', current_user,
      'timestamp', NOW()
    )
  );

  RETURN OLD;
END;
$$;

-- Add deletion protection triggers to critical tables
DROP TRIGGER IF EXISTS protect_patients_deletion ON patients;
CREATE TRIGGER protect_patients_deletion
  BEFORE DELETE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION log_critical_deletion();

DROP TRIGGER IF EXISTS protect_appointments_deletion ON appointments;
CREATE TRIGGER protect_appointments_deletion
  BEFORE DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_critical_deletion();

DROP TRIGGER IF EXISTS protect_soap_notes_deletion ON soap_notes;
CREATE TRIGGER protect_soap_notes_deletion
  BEFORE DELETE ON soap_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_critical_deletion();

-- ============================================================================
-- 5. HELPER FUNCTIONS FOR RESTORATION
-- ============================================================================

-- Function to get snapshot summary
CREATE OR REPLACE FUNCTION get_snapshot_summary(p_snapshot_id UUID)
RETURNS TABLE (
  table_name TEXT,
  record_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dsr.table_name,
    COUNT(*) as record_count
  FROM data_snapshot_records dsr
  WHERE dsr.snapshot_id = p_snapshot_id
  GROUP BY dsr.table_name;
END;
$$;

-- Grant execute on summary function
GRANT EXECUTE ON FUNCTION get_snapshot_summary TO authenticated;

-- Function to restore records from snapshot
CREATE OR REPLACE FUNCTION restore_from_snapshot(
  p_snapshot_id UUID,
  p_table_name TEXT,
  p_record_ids TEXT[] DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restored_count BIGINT := 0;
BEGIN
  -- Build dynamic insert statement
  IF p_record_ids IS NULL THEN
    -- Restore all records from snapshot for this table
    EXECUTE format(
      'INSERT INTO %I SELECT * FROM jsonb_to_recordset(record_data) AS t(%s)
      ON CONFLICT (id) DO NOTHING',
      p_table_name,
      get_table_columns(p_table_name)
    )
    USING (
      SELECT jsonb_agg(record_data)
      FROM data_snapshot_records
      WHERE snapshot_id = p_snapshot_id
      AND table_name = p_table_name
    );

    GET DIAGNOSTICS v_restored_count = ROW_COUNT;
  ELSE
    -- Restore specific records
    EXECUTE format(
      'INSERT INTO %I SELECT * FROM jsonb_to_recordset(record_data) AS t(%s)
      WHERE record_id = ANY($1)
      ON CONFLICT (id) DO NOTHING',
      p_table_name,
      get_table_columns(p_table_name)
    )
    USING (
      SELECT jsonb_agg(record_data)
      FROM data_snapshot_records
      WHERE snapshot_id = p_snapshot_id
      AND table_name = p_table_name
      AND record_id = ANY(p_record_ids)
    );

    GET DIAGNOSTICS v_restored_count = ROW_COUNT;
  END IF;

  -- Log restoration
  INSERT INTO pitr_audit_log (event_type, target_table, target_records, metadata)
  VALUES (
    'restore_completed',
    NULL,
    p_record_ids,
    jsonb_build_object(
      'snapshot_id', p_snapshot_id,
      'table', p_table_name,
      'records_restored', v_restored_count
    )
  );

  RETURN v_restored_count;
END;
$$;

-- Helper function to get table columns (simplified)
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ')
  INTO v_columns
  FROM information_schema.columns
  WHERE table_name = p_table_name
  AND table_schema = 'public';

  RETURN COALESCE(v_columns, '*');
END;
$$;

-- Grant execute on restore function
GRANT EXECUTE ON FUNCTION restore_from_snapshot TO authenticated;

-- ============================================================================
-- 6. VIEWS FOR MONITORING
-- ============================================================================

-- View for recent PITR activity
CREATE OR REPLACE VIEW pitr_activity_log AS
SELECT
  event_type,
  initiated_by,
  target_table,
  array_length(target_records, 1) as records_affected,
  reason,
  created_at
FROM pitr_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- View for available snapshots
CREATE OR REPLACE VIEW available_snapshots AS
SELECT
  ds.id,
  ds.snapshot_name,
  ds.snapshot_type,
  ds.tables_included,
  ds.created_at,
  ds.expires_at,
  ds.created_by,
  p.full_name as created_by_name,
  -- Calculate record counts per table
  (
    SELECT jsonb_object_agg(table_name, record_count)
    FROM get_snapshot_summary(ds.id)
  ) as record_counts
FROM data_snapshots ds
LEFT JOIN profiles p ON p.id = ds.created_by
WHERE ds.expires_at IS NULL OR ds.expires_at > NOW()
ORDER BY ds.created_at DESC;

-- Grant select on views
GRANT SELECT ON pitr_activity_log TO authenticated;
GRANT SELECT ON available_snapshots TO authenticated;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON TABLE pitr_audit_log IS 'Audit log for PITR-related actions and restorations';
COMMENT ON TABLE data_snapshots IS 'Manual restore points for critical data';
COMMENT ON TABLE data_snapshot_records IS 'Actual snapshot data in JSONB format';
COMMENT ON FUNCTION create_data_snapshot IS 'Creates a manual snapshot of specified tables';
COMMENT ON FUNCTION restore_from_snapshot IS 'Restores records from a snapshot';

-- ============================================================================
-- NOTIFICATION: Enable PITR in Supabase Dashboard
-- ============================================================================

-- This migration provides the supporting structure for PITR.
-- To actually enable Point-in-Time Recovery:
--
-- 1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/database/backups
-- 2. Click "Enable PITR"
-- 3. Choose retention period (7-30 days recommended for HIPAA)
-- 4. Confirm enablement
--
-- Once enabled, you can restore to any point within retention period:
-- supabase db restore --timestamp "2025-01-20 14:30:00"
