BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';

CREATE TEMP TABLE cleanup_log(table_name text, deleted_count bigint);

CREATE TEMP TABLE target_patients AS
  SELECT id FROM patients WHERE organization_id::text = '00000000-0000-0000-0000-000000000001';
CREATE TEMP TABLE target_appointments AS
  SELECT id FROM appointments
  WHERE organization_id::text = '00000000-0000-0000-0000-000000000001'
     OR patient_id IN (SELECT id FROM target_patients);
CREATE TEMP TABLE target_sessions AS
  SELECT id FROM sessions
  WHERE organization_id::text = '00000000-0000-0000-0000-000000000001'
     OR patient_id IN (SELECT id FROM target_patients)
     OR appointment_id IN (SELECT id FROM target_appointments);
CREATE TEMP TABLE target_medical_records AS
  SELECT id FROM medical_records
  WHERE organization_id::text = '00000000-0000-0000-0000-000000000001'
     OR patient_id IN (SELECT id FROM target_patients);
CREATE TEMP TABLE target_patient_packages AS
  SELECT id FROM patient_packages
  WHERE organization_id::text = '00000000-0000-0000-0000-000000000001'
     OR patient_id IN (SELECT id FROM target_patients);
CREATE TEMP TABLE target_pain_maps AS
  SELECT id FROM pain_maps
  WHERE organization_id::text = '00000000-0000-0000-0000-000000000001'
     OR patient_id IN (SELECT id FROM target_patients);
CREATE TEMP TABLE target_whatsapp_contacts AS
  SELECT id FROM whatsapp_contacts
  WHERE organization_id::text = '00000000-0000-0000-0000-000000000001'
     OR patient_id IN (SELECT id FROM target_patients);
CREATE TEMP TABLE target_wa_conversations AS
  SELECT id FROM wa_conversations
  WHERE organization_id::text = '00000000-0000-0000-0000-000000000001'
     OR patient_id IN (SELECT id FROM target_patients)
     OR contact_id IN (SELECT id FROM target_whatsapp_contacts);

CREATE OR REPLACE FUNCTION pg_temp.cleanup_delete(_table text, _where text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  IF to_regclass(_table) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('DELETE FROM %I WHERE ' || _where, _table);
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO cleanup_log VALUES (_table, n);
END $$;

SELECT pg_temp.cleanup_delete('wa_conversation_tags', 'conversation_id IN (SELECT id FROM target_wa_conversations)');
SELECT pg_temp.cleanup_delete('wa_internal_notes', 'conversation_id IN (SELECT id FROM target_wa_conversations)');
SELECT pg_temp.cleanup_delete('wa_assignments', 'conversation_id IN (SELECT id FROM target_wa_conversations)');
SELECT pg_temp.cleanup_delete('wa_sla_tracking', 'conversation_id IN (SELECT id FROM target_wa_conversations)');
SELECT pg_temp.cleanup_delete('wa_messages', 'conversation_id IN (SELECT id FROM target_wa_conversations) OR contact_id IN (SELECT id FROM target_whatsapp_contacts) OR organization_id::text = ''00000000-0000-0000-0000-000000000001''');
SELECT pg_temp.cleanup_delete('wa_opt_in_out', 'contact_id IN (SELECT id FROM target_whatsapp_contacts)');
SELECT pg_temp.cleanup_delete('identity_history', 'contact_id IN (SELECT id FROM target_whatsapp_contacts)');
SELECT pg_temp.cleanup_delete('wa_conversations', 'id IN (SELECT id FROM target_wa_conversations)');
SELECT pg_temp.cleanup_delete('whatsapp_messages', 'patient_id IN (SELECT id FROM target_patients) OR organization_id::text = ''00000000-0000-0000-0000-000000000001''');
SELECT pg_temp.cleanup_delete('whatsapp_contacts', 'id IN (SELECT id FROM target_whatsapp_contacts)');
SELECT pg_temp.cleanup_delete('wa_raw_events', 'organization_id::text = ''00000000-0000-0000-0000-000000000001''');

SELECT pg_temp.cleanup_delete('session_attachments', 'session_id IN (SELECT id FROM target_sessions) OR patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('pain_map_points', 'pain_map_id IN (SELECT id FROM target_pain_maps)');
SELECT pg_temp.cleanup_delete('goals', 'medical_record_id IN (SELECT id FROM target_medical_records)');
SELECT pg_temp.cleanup_delete('pathologies', 'medical_record_id IN (SELECT id FROM target_medical_records)');
SELECT pg_temp.cleanup_delete('surgeries', 'medical_record_id IN (SELECT id FROM target_medical_records)');
SELECT pg_temp.cleanup_delete('package_session_log', 'patient_package_id IN (SELECT id FROM target_patient_packages)');
SELECT pg_temp.cleanup_delete('package_usage', 'patient_package_id IN (SELECT id FROM target_patient_packages) OR patient_id IN (SELECT id FROM target_patients) OR appointment_id IN (SELECT id FROM target_appointments) OR organization_id::text = ''00000000-0000-0000-0000-000000000001''');

SELECT pg_temp.cleanup_delete('contas_financeiras', 'organization_id::text = ''00000000-0000-0000-0000-000000000001'' OR patient_id IN (SELECT id FROM target_patients) OR appointment_id IN (SELECT id FROM target_appointments)');
SELECT pg_temp.cleanup_delete('financial_accounts', 'organization_id::text = ''00000000-0000-0000-0000-000000000001'' OR patient_id IN (SELECT id FROM target_patients) OR appointment_id IN (SELECT id FROM target_appointments)');
SELECT pg_temp.cleanup_delete('nfse_records', 'organization_id::text = ''00000000-0000-0000-0000-000000000001'' OR patient_id IN (SELECT id FROM target_patients) OR appointment_id IN (SELECT id FROM target_appointments)');
SELECT pg_temp.cleanup_delete('nfse', 'organization_id::text = ''00000000-0000-0000-0000-000000000001''');
SELECT pg_temp.cleanup_delete('pagamentos', 'organization_id::text = ''00000000-0000-0000-0000-000000000001'' OR patient_id IN (SELECT id FROM target_patients) OR appointment_id IN (SELECT id FROM target_appointments)');
SELECT pg_temp.cleanup_delete('payments', 'organization_id::text = ''00000000-0000-0000-0000-000000000001'' OR patient_id IN (SELECT id FROM target_patients) OR appointment_id IN (SELECT id FROM target_appointments)');
SELECT pg_temp.cleanup_delete('recibos', 'organization_id::text = ''00000000-0000-0000-0000-000000000001''');
SELECT pg_temp.cleanup_delete('transacoes', 'organization_id::text = ''00000000-0000-0000-0000-000000000001''');
SELECT pg_temp.cleanup_delete('transactions', 'organization_id::text = ''00000000-0000-0000-0000-000000000001''');

SELECT pg_temp.cleanup_delete('achievements_log', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('activity_lab_sessions', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('biomechanics_assessments', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('clinical_scribe_logs', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('daily_quests', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('evolution_measurements', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('exercise_prescriptions', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('generated_reports', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('marketing_consents', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('marketing_exports', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('medical_attachments', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('medical_requests', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_documents', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_evaluation_responses', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_exams', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_exercise_logs', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_gamification', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_goal_tracking', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_goals', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_insights', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_lifecycle_events', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_medical_returns', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_objective_assignments', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_outcome_measures', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_pathologies', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_photos', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_portal_users', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_session_metrics', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_streaks', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_surgeries', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_videos', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('physical_examinations', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('prescribed_exercises', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('referral_codes', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('standardized_test_results', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('treatment_plans', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('treatment_sessions', 'patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('xp_transactions', 'patient_id IN (SELECT id FROM target_patients)');

SELECT pg_temp.cleanup_delete('sessions', 'id IN (SELECT id FROM target_sessions) OR patient_id IN (SELECT id FROM target_patients) OR appointment_id IN (SELECT id FROM target_appointments)');
SELECT pg_temp.cleanup_delete('medical_records', 'id IN (SELECT id FROM target_medical_records) OR patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patient_packages', 'id IN (SELECT id FROM target_patient_packages) OR patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('appointments', 'id IN (SELECT id FROM target_appointments) OR patient_id IN (SELECT id FROM target_patients)');
SELECT pg_temp.cleanup_delete('patients', 'id IN (SELECT id FROM target_patients)');

COMMIT;

SELECT table_name, SUM(deleted_count)::bigint AS deleted_count
FROM cleanup_log
WHERE deleted_count > 0
GROUP BY table_name
ORDER BY table_name;
