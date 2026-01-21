-- ============================================================================
-- Fix RLS Performance Warnings
-- ============================================================================
--
-- This migration fixes all auth_rls_initplan warnings by wrapping auth.uid()
-- and other auth functions in SELECT subqueries to prevent re-evaluation
-- for each row in RLS policies.
--
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATION_TEMPLATES (global table, no organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_notification_templates_all" ON notification_templates;
CREATE POLICY "consolidated_notification_templates_all"
  ON notification_templates
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 2. PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_profiles_select" ON profiles;
CREATE POLICY "consolidated_profiles_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.organization_id = profiles.organization_id
    )
  );

DROP POLICY IF EXISTS "consolidated_profiles_update" ON profiles;
CREATE POLICY "consolidated_profiles_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
  )
  WITH CHECK (
    id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "profiles_insert_authenticated_secure" ON profiles;
CREATE POLICY "profiles_insert_authenticated_secure"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
  );

-- ============================================================================
-- 3. ORGANIZATIONS
-- ============================================================================

DROP POLICY IF EXISTS "organizations_insert_system_secure" ON organizations;
CREATE POLICY "organizations_insert_system_secure"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 4. TRANSACOES (uses user_id, not organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_transacoes_all" ON transacoes;
CREATE POLICY "consolidated_transacoes_all"
  ON transacoes
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

DROP POLICY IF EXISTS "consolidated_transacoes_select" ON transacoes;
CREATE POLICY "consolidated_transacoes_select"
  ON transacoes
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 5. NOTIFICATION_QUEUE (has organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "notification_queue_all" ON notification_queue;
CREATE POLICY "notification_queue_all"
  ON notification_queue
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 6. SESSION_ATTACHMENTS (uses patient_id, join via patients table)
-- ============================================================================

DROP POLICY IF EXISTS "session_attachments_manage" ON session_attachments;
CREATE POLICY "session_attachments_manage"
  ON session_attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = session_attachments.patient_id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.organization_id = patients.organization_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = session_attachments.patient_id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.organization_id = patients.organization_id
      )
    )
  );

-- ============================================================================
-- 7. APPOINTMENTS (has organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_appointments_insert_secure" ON appointments;
CREATE POLICY "authenticated_appointments_insert_secure"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = appointments.organization_id
    )
  );

-- ============================================================================
-- 8. PATIENTS (has organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "patients_insert_authenticated_secure" ON patients;
CREATE POLICY "patients_insert_authenticated_secure"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = patients.organization_id
    )
  );

DROP POLICY IF EXISTS "patients_update_authenticated_secure" ON patients;
CREATE POLICY "patients_update_authenticated_secure"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = patients.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = patients.organization_id
    )
  );

-- ============================================================================
-- 9. MEDICAL_RECORDS (has organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_medical_records_select" ON medical_records;
CREATE POLICY "consolidated_medical_records_select"
  ON medical_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = medical_records.organization_id
    )
  );

DROP POLICY IF EXISTS "medical_records_all" ON medical_records;
CREATE POLICY "medical_records_all"
  ON medical_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = medical_records.organization_id
    )
  );

DROP POLICY IF EXISTS "medical_records_upsert" ON medical_records;
CREATE POLICY "medical_records_upsert"
  ON medical_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = medical_records.organization_id
    )
  );

-- ============================================================================
-- 10. QUEST_DEFINITIONS (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_quest_definitions_select" ON quest_definitions;
CREATE POLICY "consolidated_quest_definitions_select"
  ON quest_definitions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

DROP POLICY IF EXISTS "therapists_manage_quests" ON quest_definitions;
CREATE POLICY "therapists_manage_quests"
  ON quest_definitions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text IN ('admin', 'fisioterapeuta')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text IN ('admin', 'fisioterapeuta')
    )
  );

-- ============================================================================
-- 11. PAYMENTS (uses patient_id)
-- ============================================================================

DROP POLICY IF EXISTS "payments_admin_manage" ON payments;
CREATE POLICY "payments_admin_manage"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.organization_id = p.organization_id
      WHERE p.id = payments.patient_id
      AND pr.id = (SELECT auth.uid())
      AND pr.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.organization_id = p.organization_id
      WHERE p.id = payments.patient_id
      AND pr.id = (SELECT auth.uid())
      AND pr.role::text = 'admin'
    )
  );

-- ============================================================================
-- 12. NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_notifications_all" ON notifications;
CREATE POLICY "consolidated_notifications_all"
  ON notifications
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- ============================================================================
-- 13. NOTIFICATION_HISTORY
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_notification_history_select" ON notification_history;
CREATE POLICY "consolidated_notification_history_select"
  ON notification_history
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 14. SCHEDULE_BLOCKS (uses therapist_id)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_schedule_blocks_select" ON schedule_blocks;
CREATE POLICY "consolidated_schedule_blocks_select"
  ON schedule_blocks
  FOR SELECT
  TO authenticated
  USING (
    therapist_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

DROP POLICY IF EXISTS "schedule_blocks_upsert" ON schedule_blocks;
CREATE POLICY "schedule_blocks_upsert"
  ON schedule_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    therapist_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 15. EXERCISE_CATEGORIES (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "admin_full_access" ON exercise_categories;
CREATE POLICY "admin_full_access"
  ON exercise_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 16. WAITLIST (has organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_waitlist_all" ON waitlist;
CREATE POLICY "consolidated_waitlist_all"
  ON waitlist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = waitlist.organization_id
    )
  );

-- ============================================================================
-- 17. SHOP_ITEMS (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "admins_manage_shop_items" ON shop_items;
CREATE POLICY "admins_manage_shop_items"
  ON shop_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

DROP POLICY IF EXISTS "consolidated_shop_items_select" ON shop_items;
CREATE POLICY "consolidated_shop_items_select"
  ON shop_items
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 18. USER_INVENTORY (uses user_id)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_user_inventory_select" ON user_inventory;
CREATE POLICY "consolidated_user_inventory_select"
  ON user_inventory
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "consolidated_user_inventory_update" ON user_inventory;
CREATE POLICY "consolidated_user_inventory_update"
  ON user_inventory
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- ============================================================================
-- 19. RECURRING_APPOINTMENT_OCCURRENCES
-- ============================================================================

DROP POLICY IF EXISTS "users_manage_occurrences" ON recurring_appointment_occurrences;
CREATE POLICY "users_manage_occurrences"
  ON recurring_appointment_occurrences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text IN ('admin', 'fisioterapeuta')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text IN ('admin', 'fisioterapeuta')
    )
  );

-- ============================================================================
-- 20. EXERCISE_VIDEOS (uses uploaded_by)
-- ============================================================================

DROP POLICY IF EXISTS "users_manage_exercise_videos" ON exercise_videos;
CREATE POLICY "users_manage_exercise_videos"
  ON exercise_videos
  FOR ALL
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text IN ('admin', 'fisioterapeuta')
    )
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 21. PERMISSIONS (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "permissions_admin_manage" ON permissions;
CREATE POLICY "permissions_admin_manage"
  ON permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 22. ROLE_PERMISSIONS (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "consolidated_role_permissions_select" ON role_permissions;
CREATE POLICY "consolidated_role_permissions_select"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

DROP POLICY IF EXISTS "role_permissions_admin_manage" ON role_permissions;
CREATE POLICY "role_permissions_admin_manage"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 23. ACHIEVEMENTS (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view achievements" ON achievements;
CREATE POLICY "Authenticated users can view achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 24. GAMIFICATION_SETTINGS (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read settings" ON gamification_settings;
CREATE POLICY "Authenticated users can read settings"
  ON gamification_settings
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 25. REWARDS (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "admins_manage_rewards" ON rewards;
CREATE POLICY "admins_manage_rewards"
  ON rewards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

DROP POLICY IF EXISTS "consolidated_rewards_select" ON rewards;
CREATE POLICY "consolidated_rewards_select"
  ON rewards
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 26. REWARD_REDEMPTIONS (uses patient_id)
-- ============================================================================

DROP POLICY IF EXISTS "admins_manage_redemptions" ON reward_redemptions;
CREATE POLICY "admins_manage_redemptions"
  ON reward_redemptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.organization_id = p.organization_id
      WHERE p.id = reward_redemptions.patient_id
      AND pr.id = (SELECT auth.uid())
      AND pr.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.organization_id = p.organization_id
      WHERE p.id = reward_redemptions.patient_id
      AND pr.id = (SELECT auth.uid())
      AND pr.role::text = 'admin'
    )
  );

DROP POLICY IF EXISTS "consolidated_reward_redemptions_select" ON reward_redemptions;
CREATE POLICY "consolidated_reward_redemptions_select"
  ON reward_redemptions
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- 27. WEEKLY_CHALLENGES (global system table)
-- ============================================================================

DROP POLICY IF EXISTS "admins_manage_challenges" ON weekly_challenges;
CREATE POLICY "admins_manage_challenges"
  ON weekly_challenges
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
    )
  );

DROP POLICY IF EXISTS "consolidated_weekly_challenges_select" ON weekly_challenges;
CREATE POLICY "consolidated_weekly_challenges_select"
  ON weekly_challenges
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- 28. STRATEGIC_INSIGHTS (has organization_id)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert insights" ON strategic_insights;
CREATE POLICY "Admins can insert insights"
  ON strategic_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.organization_id = strategic_insights.organization_id
      AND profiles.role::text = 'admin'
    )
  );

-- ============================================================================
-- COMMENTS AND VERIFICATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'RLS policies optimized - auth.uid() wrapped in SELECT subqueries';
