-- ============================================================
-- MIGRATION: Fix Function search_path Security Issues
-- ============================================================
-- This migration fixes functions with mutable search_path.
--
-- Problem: Functions without SET search_path can have their behavior
-- modified by attackers, leading to security vulnerabilities.
--
-- Solution: Set search_path to 'public', 'pg_temp' for all functions.
-- ============================================================

-- ============================================================
-- Function: refresh_daily_quests
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_daily_quests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _today DATE := CURRENT_DATE;
  _user_id UUID;
BEGIN
  -- Insert or update daily quests for all active users
  FOR _user_id IN
    SELECT DISTINCT user_id
    FROM patient_gamification
    WHERE active = true
  LOOP
    INSERT INTO daily_quests (user_id, quest_date, quest_id, status, created_at)
    SELECT
      _user_id,
      _today,
      qd.id,
      'active',
      now()
    FROM quest_definitions qd
    WHERE qd.active = true
      AND qd.daily = true
    ON CONFLICT (user_id, quest_date, quest_id) DO NOTHING;
  END LOOP;
END;
$function$;

-- ============================================================
-- Function: update_strategic_index_statistics
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_strategic_index_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Update strategic insights index statistics
  ANALYZE strategic_insights;

  -- Log the operation
  INSERT INTO audit_logs (table_name, record_id, action, user_id, created_at)
  VALUES (
    'strategic_insights',
    gen_random_uuid(),
    'ANALYZE',
    auth.uid(),
    now()
  );
END;
$function$;

-- ============================================================
-- Additional functions that may need search_path fixed
-- ============================================================

-- Check for other functions with auth calls that might need fixing:
-- SELECT
--   n.nspname AS schema,
--   p.proname AS function_name,
--   p.prokind AS kind,
--   pg_get_functiondef(p.oid) AS definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prosrc LIKE '%auth%'
--   AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Verify functions have fixed search_path:

-- SELECT
--   proname as function_name,
--   prosecdef as security_definer,
--   proconfig as search_path
-- FROM pg_proc
-- WHERE proname IN ('refresh_daily_quests', 'update_strategic_index_statistics')
--   AND pronamespace = 'public'::regnamespace;

-- Expected: proconfig should show {search_path=public,pg_temp}
