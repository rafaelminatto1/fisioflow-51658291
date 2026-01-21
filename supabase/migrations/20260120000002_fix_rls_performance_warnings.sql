-- Fix RLS Performance Warnings
-- This migration addresses two types of performance warnings:
-- 1. auth_rls_initplan - Wrap auth.uid() calls in (select ...)
-- 2. multiple_permissive_policies - Consolidate duplicate policies

-- ============================================================================
-- PART 1: Fix auth_rls_initplan warnings
-- ============================================================================

-- Drop and recreate policies for waitlist_offers with optimized auth.uid()
DROP POLICY IF EXISTS "Sistema gerencia ofertas_delete_gen" ON public.waitlist_offers;
DROP POLICY IF EXISTS "Sistema gerencia ofertas_insert_gen" ON public.waitlist_offers;

CREATE POLICY "Sistema gerencia ofertas_delete_gen" ON public.waitlist_offers
  FOR DELETE
  TO public
  USING ((( SELECT auth.role() AS role) = 'service_role'::text) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role)))));

CREATE POLICY "Sistema gerencia ofertas_insert_gen" ON public.waitlist_offers
  FOR INSERT
  TO public
  WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role)))));

-- Fix gamification_notifications policies
DROP POLICY IF EXISTS "Users can update own notifications" ON public.gamification_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.gamification_notifications;

CREATE POLICY "Users can update own notifications" ON public.gamification_notifications
  FOR UPDATE
  TO public
  USING (( SELECT auth.uid() AS uid) = patient_id);

CREATE POLICY "Users can view own notifications" ON public.gamification_notifications
  FOR SELECT
  TO public
  USING (( SELECT auth.uid() AS uid) = patient_id);

-- Fix user_inventory policies
DROP POLICY IF EXISTS "Users can update own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;

CREATE POLICY "Users can update own inventory" ON public.user_inventory
  FOR UPDATE
  TO public
  USING (( SELECT auth.uid() AS uid) = user_id);

CREATE POLICY "Users can view own inventory" ON public.user_inventory
  FOR SELECT
  TO public
  USING (( SELECT auth.uid() AS uid) = user_id);

-- Fix vouchers_purchases policy
DROP POLICY IF EXISTS "Allow users to see their own voucher purchases" ON public.vouchers_purchases;

CREATE POLICY "Allow users to see their own voucher purchases" ON public.vouchers_purchases
  FOR SELECT
  TO public
  USING (( SELECT auth.uid() AS uid) = user_id);

-- Fix strategic_insights policies
DROP POLICY IF EXISTS "Users can update insights" ON public.strategic_insights;
DROP POLICY IF EXISTS "Users can view insights for their organization" ON public.strategic_insights;

CREATE POLICY "Users can update insights" ON public.strategic_insights
  FOR UPDATE
  TO public
  USING (organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Users can view insights for their organization" ON public.strategic_insights
  FOR SELECT
  TO public
  USING (organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))));

-- Fix smart_alert_configurations policy
DROP POLICY IF EXISTS "Users can view alert configs" ON public.smart_alert_configurations;

CREATE POLICY "Users can view alert configs" ON public.smart_alert_configurations
  FOR SELECT
  TO public
  USING (organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))));

-- Fix smart_alert_history policy
DROP POLICY IF EXISTS "Users can view alert history" ON public.smart_alert_history;

CREATE POLICY "Users can view alert history" ON public.smart_alert_history
  FOR SELECT
  TO public
  USING (organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))));

-- Fix quest_definitions policy
DROP POLICY IF EXISTS "Therapists can manage quests" ON public.quest_definitions;

CREATE POLICY "Therapists can manage quests" ON public.quest_definitions
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'fisioterapeuta'::user_role))));

-- Fix patient_quests policy
DROP POLICY IF EXISTS "consolidated_SELECT_patient_quests_public" ON public.patient_quests;

CREATE POLICY "consolidated_SELECT_patient_quests_public" ON public.patient_quests
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'fisioterapeuta'::user_role)))) OR (( SELECT auth.uid() AS uid) = patient_id));

-- Fix shop_items policy
DROP POLICY IF EXISTS "Admins can manage shop items" ON public.shop_items;

CREATE POLICY "Admins can manage shop items" ON public.shop_items
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))));

-- ============================================================================
-- PART 2: Fix multiple_permissive_policies warnings
-- ============================================================================

-- Fix clinical_benchmarks - consolidate SELECT policies for anon/authenticated/authenticator
DROP POLICY IF EXISTS "Everyone can view benchmarks" ON public.clinical_benchmarks;
DROP POLICY IF EXISTS "Admin can manage benchmarks" ON public.clinical_benchmarks;

CREATE POLICY "consolidated_benchmarks_policy" ON public.clinical_benchmarks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "admin_manage_benchmarks" ON public.clinical_benchmarks
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (profiles.role = 'admin'::user_role))));

-- Fix gamification_settings - consolidate SELECT policies
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.gamification_settings;
DROP POLICY IF EXISTS "Admins and Therapists can manage settings" ON public.gamification_settings;

CREATE POLICY "consolidated_gamification_settings_select" ON public.gamification_settings
  FOR SELECT
  TO public
  USING ((auth.role() = 'authenticated'::text) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role))))));

CREATE POLICY "admins_therapists_manage_settings" ON public.gamification_settings
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))));

-- Fix packages - consolidate SELECT policies
DROP POLICY IF EXISTS "Users can manage packages of their organization" ON public.packages;
DROP POLICY IF EXISTS "Users can view packages of their organization" ON public.packages;

CREATE POLICY "users_manage_packages" ON public.packages
  FOR ALL
  TO public
  USING (organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))));

-- Fix patient_challenges - consolidate SELECT policies
DROP POLICY IF EXISTS "Patients see own challenge progress" ON public.patient_challenges;
DROP POLICY IF EXISTS "System can update challenge progress" ON public.patient_challenges;

CREATE POLICY "consolidated_patient_challenges_policy" ON public.patient_challenges
  FOR SELECT
  TO public
  USING (((patient_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))))));

CREATE POLICY "system_manage_challenges" ON public.patient_challenges
  FOR ALL
  TO public
  USING (true);

-- Fix patient_goal_tracking - consolidate SELECT policies
DROP POLICY IF EXISTS "Staff can manage goals" ON public.patient_goal_tracking;
DROP POLICY IF EXISTS "Staff can view goals" ON public.patient_goal_tracking;

CREATE POLICY "staff_manage_goals" ON public.patient_goal_tracking
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'fisioterapeuta'::user_role])))));

-- Fix patient_outcome_measures - consolidate SELECT policies
DROP POLICY IF EXISTS "Staff can manage outcome measures" ON public.patient_outcome_measures;
DROP POLICY IF EXISTS "Staff can view outcome measures" ON public.patient_outcome_measures;

CREATE POLICY "staff_manage_outcome_measures" ON public.patient_outcome_measures
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'fisioterapeuta'::user_role])))));

-- Fix patient_packages - consolidate policies
DROP POLICY IF EXISTS "Enable all for authenticated users on patient_packages" ON public.patient_packages;
DROP POLICY IF EXISTS "Users can manage patient packages of their organization" ON public.patient_packages;
DROP POLICY IF EXISTS "Users can access their organization's patient_packages_delete_g" ON public.patient_packages;
DROP POLICY IF EXISTS "Users can access their organization's patient_packages_insert_g" ON public.patient_packages;
DROP POLICY IF EXISTS "consolidated_SELECT_patient_package_public" ON public.patient_packages;
DROP POLICY IF EXISTS "Users can access their organization's patient_packages_update_g" ON public.patient_packages;

CREATE POLICY "consolidated_patient_packages_all" ON public.patient_packages
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "consolidated_patient_packages_public" ON public.patient_packages
  FOR ALL
  TO public
  USING (((organization_id IS NULL) OR user_belongs_to_organization(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), organization_id) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));

-- Fix patient_predictions - consolidate SELECT policies
DROP POLICY IF EXISTS "System can manage predictions" ON public.patient_predictions;
DROP POLICY IF EXISTS "Staff can view predictions" ON public.patient_predictions;

CREATE POLICY "consolidated_patient_predictions_select" ON public.patient_predictions
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'fisioterapeuta'::user_role]))))));

CREATE POLICY "system_manage_predictions" ON public.patient_predictions
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (profiles.role = 'admin'::user_role))));

-- Fix quest_definitions - consolidate SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view active quests" ON public.quest_definitions;
DROP POLICY IF EXISTS "Therapists can manage quests" ON public.quest_definitions;

CREATE POLICY "consolidated_quest_definitions_select" ON public.quest_definitions
  FOR SELECT
  TO public
  USING (((auth.role() = 'authenticated'::text) AND (is_active = true)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'fisioterapeuta'::user_role)))));

CREATE POLICY "therapists_manage_quests" ON public.quest_definitions
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'fisioterapeuta'::user_role))));

-- Fix recurring_appointment_occurrences - consolidate policies
DROP POLICY IF EXISTS "Users can manage occurrences of their series" ON public.recurring_appointment_occurrences;
DROP POLICY IF EXISTS "Users can view occurrences of their series" ON public.recurring_appointment_occurrences;

CREATE POLICY "users_manage_occurrences" ON public.recurring_appointment_occurrences
  FOR ALL
  TO public
  USING (series_id IN ( SELECT recurring_appointment_series.id
   FROM recurring_appointment_series
  WHERE (recurring_appointment_series.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))))));

-- Fix reward_redemptions - consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Patients see own redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Patients can claim rewards" ON public.reward_redemptions;

CREATE POLICY "consolidated_reward_redemptions_select" ON public.reward_redemptions
  FOR SELECT
  TO public
  USING (((patient_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))))));

CREATE POLICY "admins_manage_redemptions" ON public.reward_redemptions
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))));

CREATE POLICY "patients_claim_rewards" ON public.reward_redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix rewards - consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.rewards;
DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.rewards;

CREATE POLICY "consolidated_rewards_select" ON public.rewards
  FOR SELECT
  TO public
  USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))))));

CREATE POLICY "admins_manage_rewards" ON public.rewards
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))));

-- Fix shop_items - consolidate SELECT policies
DROP POLICY IF EXISTS "Everyone can view active shop items" ON public.shop_items;
DROP POLICY IF EXISTS "Admins can manage shop items" ON public.shop_items;

CREATE POLICY "consolidated_shop_items_select" ON public.shop_items
  FOR SELECT
  TO public
  USING ((is_active = true) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role))))));

CREATE POLICY "admins_manage_shop_items" ON public.shop_items
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))));

-- Fix user_inventory - consolidate policies
DROP POLICY IF EXISTS "System can manage inventory" ON public.user_inventory;

CREATE POLICY "consolidated_user_inventory_select" ON public.user_inventory
  FOR SELECT
  TO public
  USING ((true) OR (( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "consolidated_user_inventory_update" ON public.user_inventory
  FOR UPDATE
  TO public
  USING ((true) OR (( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "system_manage_inventory" ON public.user_inventory
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Fix weekly_challenges - consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can manage challenges" ON public.weekly_challenges;
DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.weekly_challenges;

CREATE POLICY "consolidated_weekly_challenges_select" ON public.weekly_challenges
  FOR SELECT
  TO public
  USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))))));

CREATE POLICY "admins_manage_challenges" ON public.weekly_challenges
  FOR ALL
  TO public
  USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.role = 'fisioterapeuta'::user_role) OR (profiles.role = 'admin'::user_role)))));

-- Fix appointments - consolidate multiple policies for authenticated role
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
DROP POLICY IF EXISTS "consolidated_delete_appointments_policy" ON public.appointments;
DROP POLICY IF EXISTS "consolidated_INSERT_appointments_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "consolidated_insert_appointments_policy" ON public.appointments;
DROP POLICY IF EXISTS "consolated_SELECT_appointments_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "consolidated_UPDATE_appointments_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "consolidated_update_appointments_policy" ON public.appointments;

CREATE POLICY "consolidated_appointments_all" ON public.appointments
  FOR ALL
  TO public
  USING (((true AND ((get_user_role() = ANY (ARRAY['admin'::text, 'therapist'::text])) AND ((organization_id IS NULL) OR (organization_id = get_current_user_org_id())))) OR (true AND (user_is_admin(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid)) AND ((organization_id IS NULL) OR user_belongs_to_organization(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), organization_id)))) OR ((CURRENT_USER = ANY (ARRAY['{authenticated}'::name])) AND (organization_id = ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.user_id = ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))
 LIMIT 1)))));

CREATE POLICY "authenticated_appointments_select" ON public.appointments
  FOR SELECT
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT auth.uid() AS uid)))) OR (( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))) OR private.is_admin_secure() OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['fisioterapeuta'::app_role, 'estagiario'::app_role]))))));

CREATE POLICY "authenticated_appointments_update" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING ((private.is_admin_secure() OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['fisioterapeuta'::app_role, 'estagiario'::app_role]))))) OR (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE (((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.expires_at IS NULL)) OR (user_roles.expires_at > now()))))));

CREATE POLICY "authenticated_appointments_insert" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_appointments_delete" ON public.appointments
  FOR DELETE
  TO authenticated
  USING (private.is_admin_secure());

-- Fix evaluation_templates - consolidate policies
DROP POLICY IF EXISTS "Enable all for authenticated users on evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.evaluation_templates;

CREATE POLICY "evaluation_templates_all" ON public.evaluation_templates
  FOR ALL
  TO authenticated
  USING (true);

-- Fix exercise_categories - consolidate SELECT policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.exercise_categories;
DROP POLICY IF EXISTS "Allow public read access" ON public.exercise_categories;

CREATE POLICY "consolidated_exercise_categories_select" ON public.exercise_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "admin_full_access" ON public.exercise_categories
  FOR ALL
  TO authenticated
  USING (((( SELECT ( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) AS jwt) ->> 'email'::text) IN ( SELECT users.email
   FROM auth.users
  WHERE (users.is_super_admin = true))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND ((profiles.specialties @> ARRAY['admin'::text]) OR (profiles.email ~~ '%@admin.com'::text))))));

-- Fix exercise_videos - consolidate SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Public can view exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Authenticated users can upload exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Users can delete their own exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Users can update their own exercise videos" ON public.exercise_videos;

CREATE POLICY "consolidated_exercise_videos_select" ON public.exercise_videos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "users_manage_exercise_videos" ON public.exercise_videos
  FOR ALL
  TO authenticated
  USING (( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) = uploaded_by);

CREATE POLICY "authenticated_upload_videos" ON public.exercise_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix medical_records - consolidate policies
DROP POLICY IF EXISTS "medical_records_upsert_therapist" ON public.medical_records;
DROP POLICY IF EXISTS "consolidated_delete_medical_records_policy" ON public.medical_records;
DROP POLICY IF EXISTS "consolidated_insert_medical_records_policy" ON public.medical_records;
DROP POLICY IF EXISTS "consolidated_select_medical_records_policy" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_select_own" ON public.medical_records;
DROP POLICY IF EXISTS "consolidated_update_medical_records_policy" ON public.medical_records;

CREATE POLICY "consolidated_medical_records_select" ON public.medical_records
  FOR SELECT
  TO public
  USING (((true AND user_has_any_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])) OR (true AND (user_has_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), 'estagiario'::app_role) AND estagiario_pode_acessar_paciente(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), patient_id))) OR (true AND (patient_id IN ( SELECT p.id
   FROM (patients p
     JOIN profiles pr ON ((pr.id = p.profile_id)))
  WHERE (pr.user_id = ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))))) OR (true AND ((organization_id IS NULL) OR user_belongs_to_organization(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), organization_id)))));

CREATE POLICY "medical_records_upsert" ON public.medical_records
  FOR ALL
  TO authenticated
  USING (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE (((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.expires_at IS NULL)) OR (user_roles.expires_at > now()))));

CREATE POLICY "medical_records_all" ON public.medical_records
  FOR ALL
  TO public
  USING ((true AND user_has_any_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])) OR (true AND ((organization_id IS NULL) OR user_belongs_to_organization(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), organization_id))));

-- Fix notification_history - consolidate policies
DROP POLICY IF EXISTS "admins_can_manage_history" ON public.notification_history;
DROP POLICY IF EXISTS "Users can view their own notification history" ON public.notification_history;

CREATE POLICY "consolidated_notification_history_select" ON public.notification_history
  FOR SELECT
  TO public
  USING (((true AND (( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid) = user_id)) OR (true AND (get_user_role() = 'admin'::text))));

CREATE POLICY "admins_manage_history" ON public.notification_history
  FOR ALL
  TO authenticated
  USING ((get_user_role() = 'admin'::text));

-- Fix notification_queue - consolidate INSERT policies
DROP POLICY IF EXISTS "Organization members can see notifications" ON public.notification_queue;
DROP POLICY IF EXISTS "Anyone can insert to queue_insert_gen" ON public.notification_queue;

CREATE POLICY "notification_queue_all" ON public.notification_queue
  FOR ALL
  TO authenticated
  USING (organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))));

CREATE POLICY "anyone_insert_queue" ON public.notification_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix notification_templates - consolidate policies
DROP POLICY IF EXISTS "staff_can_manage_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "consolidated_delete_notification_templates_policy" ON public.notification_templates;
DROP POLICY IF EXISTS "consolidated_insert_notification_templates_policy" ON public.notification_templates;
DROP POLICY IF EXISTS "consolidated_select_notification_templates_policy" ON public.notification_templates;
DROP POLICY IF EXISTS "consolidated_update_notification_templates_policy" ON public.notification_templates;

CREATE POLICY "consolidated_notification_templates_all" ON public.notification_templates
  FOR ALL
  TO public
  USING ((true AND user_is_admin(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))) OR (true AND (( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid) IS NOT NULL)) OR (true AND true) OR (true AND true));

CREATE POLICY "staff_manage_templates" ON public.notification_templates
  FOR ALL
  TO authenticated
  USING ((get_user_role() = ANY (ARRAY['admin'::text, 'therapist'::text])));

-- Fix notifications - consolidate policies
DROP POLICY IF EXISTS "notifications_user_all_delete_gen" ON public.notifications;
DROP POLICY IF EXISTS "consolidated_INSERT_notifications_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "consolidated_insert_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "consolidated_select_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "consolidated_update_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "consolidated_notifications_all" ON public.notifications
  FOR ALL
  TO public
  USING ((true AND true) OR (true AND ((( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid) = user_id) OR user_is_admin(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid)))) OR ((CURRENT_USER = ANY (ARRAY['{authenticated}'::name])) AND (user_id = ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))));

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE
  TO authenticated
  USING ((user_id = ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid) AS uid)));

-- Fix patient_achievements - consolidate policies
DROP POLICY IF EXISTS "patient_achievements_upsert_system" ON public.patient_achievements;
DROP POLICY IF EXISTS "patient_achievements_select_own" ON public.patient_achievements;

CREATE POLICY "consolidated_patient_achievements_select" ON public.patient_achievements
  FOR SELECT
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

CREATE POLICY "patient_achievements_upsert" ON public.patient_achievements
  FOR ALL
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix patient_documents - consolidate policies
DROP POLICY IF EXISTS "consolidated_DELETE_patient_documen_authenticated" ON public.patient_documents;
DROP POLICY IF EXISTS "consolidated_delete_patient_documents_policy" ON public.patient_documents;
DROP POLICY IF EXISTS "consolidated_insert_patient_documents_policy" ON public.patient_documents;
DROP POLICY IF EXISTS "patient_documents_insert_therapist" ON public.patient_documents;
DROP POLICY IF EXISTS "consolidated_select_patient_documents_policy" ON public.patient_documents;
DROP POLICY IF EXISTS "patient_documents_select_own" ON public.patient_documents;
DROP POLICY IF EXISTS "consolidated_UPDATE_patient_documen_authenticated" ON public.patient_documents;
DROP POLICY IF EXISTS "consolidated_update_patient_documents_policy" ON public.patient_documents;

CREATE POLICY "consolidated_patient_documents_all" ON public.patient_documents
  FOR ALL
  TO public
  USING (((CURRENT_USER = ANY (ARRAY['{authenticated}'::name])) AND true) OR ((CURRENT_USER = ANY (ARRAY['{authenticated}'::name])) AND user_has_any_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])));

CREATE POLICY "patient_documents_authenticated" ON public.patient_documents
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'fisioterapeuta'::user_role]))))) OR ((uploaded_by = ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) OR (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now())))))));

-- Fix patient_exercise_logs - consolidate policies
DROP POLICY IF EXISTS "patient_exercise_logs_upsert_all" ON public.patient_exercise_logs;
DROP POLICY IF EXISTS "patient_exercise_logs_select_own" ON public.patient_exercise_logs;

CREATE POLICY "consolidated_patient_exercise_logs_select" ON public.patient_exercise_logs
  FOR SELECT
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

CREATE POLICY "patient_exercise_logs_upsert" ON public.patient_exercise_logs
  FOR ALL
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix patient_gamification - consolidate policies
DROP POLICY IF EXISTS "consolidated_delete_patient_gamification_policy" ON public.patient_gamification;
DROP POLICY IF EXISTS "consolidated_INSERT_patient_gamific_public" ON public.patient_gamification;
DROP POLICY IF EXISTS "consolidated_SELECT_patient_gamific_public" ON public.patient_gamification;
DROP POLICY IF EXISTS "patient_gamification_select_own" ON public.patient_gamification;
DROP POLICY IF EXISTS "consolidated_UPDATE_patient_gamific_public" ON public.patient_gamification;
DROP POLICY IF EXISTS "patient_gamification_update_system" ON public.patient_gamification;

CREATE POLICY "consolidated_patient_gamification_all" ON public.patient_gamification
  FOR ALL
  TO public
  USING ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) = patient_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (profiles.role = 'fisioterapeuta'::user_role)))) OR ((true AND user_has_any_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])) OR (true AND true) OR (true AND user_is_fisio_or_admin(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))) OR (true AND (patient_id IN ( SELECT p.id
   FROM (patients p
     JOIN profiles pr ON ((pr.id = p.profile_id)))
  WHERE (pr.user_id = ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))))) OR (true AND true)));

CREATE POLICY "patient_gamification_select_own" ON public.patient_gamification
  FOR SELECT
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE (((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.expires_at IS NULL)) OR (user_roles.expires_at > now()))))));

-- Fix patient_goals - consolidate policies
DROP POLICY IF EXISTS "patient_goals_upsert_therapist" ON public.patient_goals;
DROP POLICY IF EXISTS "Admins e fisios gerenciam objetivos_delete_gen" ON public.patient_goals;
DROP POLICY IF EXISTS "consolidated_select_patient_goals_policy" ON public.patient_goals;
DROP POLICY IF EXISTS "patient_goals_select_own" ON public.patient_goals;
DROP POLICY IF EXISTS "Admins e fisios gerenciam objetivos_update_gen" ON public.patient_goals;

CREATE POLICY "consolidated_patient_goals_select" ON public.patient_goals
  FOR SELECT
  TO public
  USING ((true AND user_has_any_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])) OR (true AND (user_has_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), 'estagiario'::app_role) AND estagiario_pode_acessar_paciente(( SELECT ( SELECT ( SELECT (SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), patient_id))));

CREATE POLICY "patient_goals_upsert" ON public.patient_goals
  FOR ALL
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

CREATE POLICY "admins_fisios_manage_goals" ON public.patient_goals
  FOR ALL
  TO public
  USING (user_has_any_role(( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Fix patient_scheduling_preferences - consolidate policies
DROP POLICY IF EXISTS "patient_scheduling_preferences_upsert_own" ON public.patient_scheduling_preferences;
DROP POLICY IF EXISTS "patient_scheduling_preferences_select_own" ON public.patient_scheduling_preferences;

CREATE POLICY "consolidated_patient_scheduling_preferences_select" ON public.patient_scheduling_preferences
  FOR SELECT
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

CREATE POLICY "patient_scheduling_preferences_upsert" ON public.patient_scheduling_preferences
  FOR ALL
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
   WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix patient_self_assessments - consolidate policies
DROP POLICY IF EXISTS "patient_self_assessments_upsert_own" ON public.patient_self_assessments;
DROP POLICY IF EXISTS "patient_self_assessments_select_own" ON public.patient_self_assessments;

CREATE POLICY "consolidated_patient_self_assessments_select" ON public.patient_self_assessments
  FOR SELECT
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
   WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

CREATE POLICY "patient_self_assessments_upsert" ON public.patient_self_assessments
  FOR ALL
  TO authenticated
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
   WHERE (patients.user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)))) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix patients - consolidate SELECT policies
DROP POLICY IF EXISTS "consolidated_SELECT_patients_authenticated" ON public.patients;
DROP POLICY IF EXISTS "consolidated_select_patients_policy" ON public.patients;

CREATE POLICY "consolidated_patients_select" ON public.patients
  FOR SELECT
  TO authenticated
  USING (((organization_id IS NOT NULL) AND user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id)) OR can_view_patient(( SELECT auth.uid() AS uid), id) OR (profile_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id = ( SELECT auth.uid() AS uid)))));

-- Fix payments - consolidate policies
DROP POLICY IF EXISTS "payments_manage_admin" ON public.payments;
DROP POLICY IF EXISTS "Admin and therapist can delete org payments" ON public.payments;
DROP POLICY IF EXISTS "Admin and therapist can create org payments" ON public.payments;
DROP POLICY IF EXISTS "consolidated_select_payments_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "Admin and therapist can update org payments" ON public.payments;

CREATE POLICY "consolidated_payments_select" ON public.payments
  FOR SELECT
  TO public
  USING ((true AND ((get_user_role() = ANY (ARRAY['admin'::text, 'therapist'::text])) AND (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = payments.appointment_id) AND ((a.organization_id IS NULL) OR (a.organization_id = get_current_user_org_id()))))))) OR (true AND ((get_user_role() = 'patient'::text) AND (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = payments.appointment_id) AND is_patient_owner(a.patient_id)))))));

CREATE POLICY "payments_admin_manage" ON public.payments
  FOR ALL
  TO authenticated
  USING (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE (((user_roles.role = 'admin'::app_role) AND (user_roles.expires_at IS NULL)) OR (user_roles.expires_at > now()))));

CREATE POLICY "payments_org_manage" ON public.payments
  FOR ALL
  TO public
  USING ((get_user_role() = ANY (ARRAY['admin'::text, 'therapist'::text])) AND (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = payments.appointment_id) AND ((a.organization_id IS NULL) OR (a.organization_id = get_current_user_org_id()))))));

-- Fix permissions - consolidate policies
DROP POLICY IF EXISTS "permissions_manage_admin" ON public.permissions;
DROP POLICY IF EXISTS "permissions_read_all" ON public.permissions;

CREATE POLICY "consolidated_permissions_select" ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "permissions_admin_manage" ON public.permissions
  FOR ALL
  TO authenticated
  USING (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = 'admin'::app_role) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix profiles - consolidate policies
DROP POLICY IF EXISTS "consolidated_insert_profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "consolidated_select_profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "consolidated_update_profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "consolidated_profiles_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) OR private.is_admin_secure() OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['fisioterapeuta'::app_role, 'estagiario'::app_role]))))));

CREATE POLICY "consolidated_profiles_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((user_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) OR private.is_admin_secure());

CREATE POLICY "consolidated_profiles_insert" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix role_permissions - consolidate policies
DROP POLICY IF EXISTS "role_permissions_manage_admin" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_read_all" ON public.role_permissions;

CREATE POLICY "consolidated_role_permissions_select" ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

CREATE POLICY "role_permissions_admin_manage" ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = 'admin'::app_role) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix schedule_blocks - consolidate policies
DROP POLICY IF EXISTS "schedule_blocks_upsert_own" ON public.schedule_blocks;
DROP POLICY IF EXISTS "schedule_blocks_select_own" ON public.schedule_blocks;

CREATE POLICY "consolidated_schedule_blocks_select" ON public.schedule_blocks
  FOR SELECT
  TO authenticated
  USING ((therapist_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = 'admin'::app_role) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

CREATE POLICY "schedule_blocks_upsert" ON public.schedule_blocks
  FOR ALL
  TO authenticated
  USING ((therapist_id = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = 'admin'::app_role) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix session_attachments - consolidate policies
DROP POLICY IF EXISTS "Authenticated users can manage session attachments" ON public.session_attachments;
DROP POLICY IF EXISTS "session_attachments_delete_admin" ON public.session_attachments;
DROP POLICY IF EXISTS "session_attachments_insert_therapist" ON public.session_attachments;
DROP POLICY IF EXISTS "session_attachments_select_own" ON public.session_attachments;
DROP POLICY IF EXISTS "session_attachments_update_therapist" ON public.session_attachments;

CREATE POLICY "consolidated_session_attachments_all" ON public.session_attachments
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "session_attachments_manage" ON public.session_attachments
  FOR ALL
  TO authenticated
  USING ((uploaded_by = ( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid)) OR (( SELECT ( SELECT ( SELECT (SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
   WHERE ((user_roles.role = ANY (ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])) AND (user_roles.revoked_at IS NULL) AND ((user_roles.expires_at IS NULL) OR (user_roles.expires_at > now()))))));

-- Fix transacoes - consolidate policies
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Apenas admins inserem transações" ON public.transacoes;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Usuários veem suas transações" ON public.transacoes;
DROP POLICY IF EXISTS "Apenas admins atualizam transações" ON public.transacoes;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transacoes;

CREATE POLICY "consolidated_transacoes_select" ON public.transacoes
  FOR SELECT
  TO public
  USING ((user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) OR user_is_admin(( SELECT ( SELECT ( SELECT (SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid)));

CREATE POLICY "consolidated_transacoes_all" ON public.transacoes
  FOR ALL
  TO public
  USING ((user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) OR user_is_admin(( SELECT ( SELECT ( SELECT (SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid)));

CREATE POLICY "authenticated_transacoes" ON public.transacoes
  FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Fix waitlist - consolidate policies
DROP POLICY IF EXISTS "consolidated_delete_waitlist_policy" ON public.waitlist;
DROP POLICY IF EXISTS "consolidated_insert_waitlist_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_insert_authenticated" ON public.waitlist;
DROP POLICY IF EXISTS "consolidated_select_waitlist_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_select_authenticated" ON public.waitlist;
DROP POLICY IF EXISTS "consolidated_update_waitlist_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_update_authenticated" ON public.waitlist;

CREATE POLICY "consolidated_waitlist_all" ON public.waitlist
  FOR ALL
  TO public
  USING ((true AND ((organization_id IS NULL) OR user_belongs_to_organization(( SELECT ( SELECT ( SELECT (SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), organization_id))) OR (true AND (user_has_any_role(( SELECT ( SELECT ( SELECT (SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]) AND ((organization_id IS NULL) OR user_belongs_to_organization(( SELECT ( SELECT ( SELECT (SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid), organization_id)))) OR ((CURRENT_USER = ANY (ARRAY['{authenticated}'::name])) AND (organization_id = ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.user_id = ( SELECT ( SELECT ( SELECT (SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))
 LIMIT 1))));

CREATE POLICY "authenticated_waitlist_insert" ON public.waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON POLICY "Sistema gerencia ofertas_delete_gen" ON public.waitlist_offers IS 'Optimized with (select auth.uid())';
COMMENT ON POLICY "Sistema gerencia ofertas_insert_gen" ON public.waitlist_offers IS 'Optimized with (select auth.uid())';
COMMENT ON POLICY "Users can update own notifications" ON public.gamification_notifications IS 'Optimized with (select auth.uid())';
COMMENT ON POLICY "Users can view own notifications" ON public.gamification_notifications IS 'Optimized with (select auth.uid())';
COMMENT ON POLICY "Users can update own inventory" ON public.user_inventory IS 'Optimized with (select auth.uid())';
COMMENT ON POLICY "Users can view own inventory" ON public.user_inventory IS 'Optimized with (select auth.uid())';
COMMENT ON POLICY "Allow users to see their own voucher purchases" ON public.vouchers_purchases IS 'Optimized with (select auth.uid())';
