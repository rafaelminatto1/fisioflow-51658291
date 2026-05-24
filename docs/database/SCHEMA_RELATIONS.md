# Schema do Neon DB — Diagrama de Relações (FisioFlow 2026)

> **Auto-gerado em:** 24/05/2026
> **Tecnologia:** Neon PostgreSQL Serverless (sa-east-1) + Drizzle ORM

## 📐 Diagrama de Entidade-Relacionamento (ER)

```mermaid
erDiagram
    clinicalScribeLogs {
        string id PK
        string organizationId FK
    }
    aiUsage {
        string id PK
        string organizationId FK
    }
    businessMetrics {
        string id PK
        string organizationId FK
    }
    patientAdherencePredictions {
        string id PK
        string organizationId FK
    }
    announcements {
        string id PK
        string organizationId FK
    }
    announcementReads {
        string id PK
        string organizationId FK
    }
    appointments {
        string id PK
        string organizationId FK
    }
    appointmentStatusSettings {
        string id PK
        string organizationId FK
    }
    rooms {
        string id PK
        string organizationId FK
    }
    blockedSlots {
        string id PK
        string organizationId FK
    }
    auditLogs {
        string id PK
        string organizationId FK
    }
    biomechanicsAssessments {
        string id PK
        string organizationId FK
    }
    biomechanicsMetrics {
        string id PK
        string organizationId FK
    }
    patientGoals {
        string id PK
        string organizationId FK
    }
    patientPathologies {
        string id PK
        string organizationId FK
    }
    patientSessionMetrics {
        string id PK
        string organizationId FK
    }
    prescribedExercises {
        string id PK
        string organizationId FK
    }
    generatedReports {
        string id PK
        string organizationId FK
    }
    conductLibrary {
        string id PK
        string organizationId FK
    }
    clinicalTestTemplates {
        string id PK
        string organizationId FK
    }
    standardizedTestResults {
        string id PK
        string organizationId FK
    }
    painMaps {
        string id PK
        string organizationId FK
    }
    painMapPoints {
        string id PK
        string organizationId FK
    }
    evolutionTemplates {
        string id PK
        string organizationId FK
    }
    exercisePrescriptions {
        string id PK
        string organizationId FK
    }
    patientObjectives {
        string id PK
        string organizationId FK
    }
    patientObjectiveAssignments {
        string id PK
        string organizationId FK
    }
    clinicalEmbeddings {
        string id PK
        string organizationId FK
    }
    patientLongitudinalSummary {
        string id PK
        string organizationId FK
    }
    clinicalReasoningLogs {
        string id PK
        string organizationId FK
    }
    contacts {
        string id PK
        string organizationId FK
    }
    contactActivities {
        string id PK
        string organizationId FK
    }
    contactScores {
        string id PK
        string organizationId FK
    }
    evaluationTemplates {
        string id PK
        string organizationId FK
    }
    exerciseCategories {
        string id PK
        string organizationId FK
    }
    exercises {
        string id PK
        string organizationId FK
    }
    exerciseFavorites {
        string id PK
        string organizationId FK
    }
    transactions {
        string id PK
        string organizationId FK
    }
    financialAccounts {
        string id PK
        string organizationId FK
    }
    costCenters {
        string id PK
        string organizationId FK
    }
    healthInsurances {
        string id PK
        string organizationId FK
    }
    payments {
        string id PK
        string organizationId FK
    }
    partnerCompanies {
        string id PK
        string organizationId FK
    }
    suppliers {
        string id PK
        string organizationId FK
    }
    paymentMethods {
        string id PK
        string organizationId FK
    }
    sessionPackageTemplates {
        string id PK
        string organizationId FK
    }
    patientPackages {
        string id PK
        string organizationId FK
    }
    packageUsage {
        string id PK
        string organizationId FK
    }
    vouchers {
        string id PK
        string organizationId FK
    }
    userVouchers {
        string id PK
        string organizationId FK
    }
    voucherCheckoutSessions {
        string id PK
        string organizationId FK
    }
    nfse {
        string id PK
        string organizationId FK
    }
    nfseConfig {
        string id PK
        string organizationId FK
    }
    patientGamification {
        string id PK
        string organizationId FK
    }
    xpTransactions {
        string id PK
        string organizationId FK
    }
    achievements {
        string id PK
        string organizationId FK
    }
    achievementsLog {
        string id PK
        string organizationId FK
    }
    dailyQuests {
        string id PK
        string organizationId FK
    }
    groupClasses {
        string id PK
        string organizationId FK
    }
    groupEnrollments {
        string id PK
        string organizationId FK
    }
    groupCheckins {
        string id PK
        string organizationId FK
    }
    julesPrReviews {
        string id PK
        string organizationId FK
    }
    julesLearnings {
        string id PK
        string organizationId FK
    }
    mediaGallery {
        string id PK
        string organizationId FK
    }
    exerciseMediaAttachments {
        string id PK
        string organizationId FK
    }
    organizations {
        string id PK
        string organizationId FK
    }
    profiles {
        string id PK
        string organizationId FK
    }
    patients {
        string id PK
        string organizationId FK
    }
    medicalRecords {
        string id PK
        string organizationId FK
    }
    pathologies {
        string id PK
        string organizationId FK
    }
    surgeries {
        string id PK
        string organizationId FK
    }
    goals {
        string id PK
        string organizationId FK
    }
    patientPortalUsers {
        string id PK
        string organizationId FK
    }
    patientExerciseLogs {
        string id PK
        string organizationId FK
    }
    preRegistrationTokens {
        string id PK
        string organizationId FK
    }
    preRegistrations {
        string id PK
        string organizationId FK
    }
    exerciseProtocols {
        string id PK
        string organizationId FK
    }
    protocolExercises {
        string id PK
        string organizationId FK
    }
    sessions {
        string id PK
        string organizationId FK
    }
    sessionAttachments {
        string id PK
        string organizationId FK
    }
    sessionTemplates {
        string id PK
        string organizationId FK
    }
    taskBoards {
        string id PK
        string organizationId FK
    }
    taskColumns {
        string id PK
        string organizationId FK
    }
    tasks {
        string id PK
        string organizationId FK
    }
    taskAssignments {
        string id PK
        string organizationId FK
    }
    taskAcknowledgments {
        string id PK
        string organizationId FK
    }
    taskVisibility {
        string id PK
        string organizationId FK
    }
    taskAuditLogs {
        string id PK
        string organizationId FK
    }
    exerciseTemplateCategories {
        string id PK
        string organizationId FK
    }
    exerciseTemplates {
        string id PK
        string organizationId FK
    }
    exerciseTemplateItems {
        string id PK
        string organizationId FK
    }
    userAgendaAppearance {
        string id PK
        string organizationId FK
    }
    whatsappContacts {
        string id PK
        string organizationId FK
    }
    waConversations {
        string id PK
        string organizationId FK
    }
    waMessages {
        string id PK
        string organizationId FK
    }
    waRawEvents {
        string id PK
        string organizationId FK
    }
    waAssignments {
        string id PK
        string organizationId FK
    }
    waInternalNotes {
        string id PK
        string organizationId FK
    }
    waTags {
        string id PK
        string organizationId FK
    }
    waConversationTags {
        string id PK
        string organizationId FK
    }
    waQuickReplies {
        string id PK
        string organizationId FK
    }
    waAutomationRules {
        string id PK
        string organizationId FK
    }
    waSlaConfig {
        string id PK
        string organizationId FK
    }
    waSlaTracking {
        string id PK
        string organizationId FK
    }
    waOptInOut {
        string id PK
        string organizationId FK
    }
    wikiPages {
        string id PK
        string organizationId FK
    }
    wikiPageVersions {
        string id PK
        string organizationId FK
    }
    wikiDictionary {
        string id PK
        string organizationId FK
    }
```

## 📋 Catálogo de Tabelas

| Tabela no Banco | Variável Drizzle | Arquivo do Schema |
| :--- | :--- | :--- |
| `clinical_scribe_logs` | `clinicalScribeLogs` | [`ai_studio.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/ai_studio.ts) |
| `ai_usage` | `aiUsage` | [`ai_studio.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/ai_studio.ts) |
| `business_metrics` | `businessMetrics` | [`analytics.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/analytics.ts) |
| `patient_adherence_predictions` | `patientAdherencePredictions` | [`analytics.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/analytics.ts) |
| `announcements` | `announcements` | [`announcements.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/announcements.ts) |
| `announcement_reads` | `announcementReads` | [`announcements.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/announcements.ts) |
| `appointments` | `appointments` | [`appointments.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/appointments.ts) |
| `appointment_status_settings` | `appointmentStatusSettings` | [`appointments.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/appointments.ts) |
| `rooms` | `rooms` | [`appointments.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/appointments.ts) |
| `blocked_slots` | `blockedSlots` | [`appointments.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/appointments.ts) |
| `audit_logs` | `auditLogs` | [`audit.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/audit.ts) |
| `biomechanics_assessments` | `biomechanicsAssessments` | [`biomechanics.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/biomechanics.ts) |
| `biomechanics_metrics` | `biomechanicsMetrics` | [`biomechanics.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/biomechanics.ts) |
| `patient_goals` | `patientGoals` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `patient_pathologies` | `patientPathologies` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `patient_session_metrics` | `patientSessionMetrics` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `prescribed_exercises` | `prescribedExercises` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `generated_reports` | `generatedReports` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `conduct_library` | `conductLibrary` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `clinical_test_templates` | `clinicalTestTemplates` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `standardized_test_results` | `standardizedTestResults` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `pain_maps` | `painMaps` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `pain_map_points` | `painMapPoints` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `evolution_templates` | `evolutionTemplates` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `exercise_prescriptions` | `exercisePrescriptions` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `patient_objectives` | `patientObjectives` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `patient_objective_assignments` | `patientObjectiveAssignments` | [`clinical.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical.ts) |
| `clinical_embeddings` | `clinicalEmbeddings` | [`clinical_intelligence.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical_intelligence.ts) |
| `patient_longitudinal_summary` | `patientLongitudinalSummary` | [`clinical_intelligence.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical_intelligence.ts) |
| `clinical_reasoning_logs` | `clinicalReasoningLogs` | [`clinical_intelligence.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/clinical_intelligence.ts) |
| `contacts` | `contacts` | [`contacts.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/contacts.ts) |
| `contact_activities` | `contactActivities` | [`contacts.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/contacts.ts) |
| `contact_scores` | `contactScores` | [`contacts.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/contacts.ts) |
| `evaluation_templates` | `evaluationTemplates` | [`evaluation_templates.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/evaluation_templates.ts) |
| `exercise_categories` | `exerciseCategories` | [`exercises.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/exercises.ts) |
| `exercises` | `exercises` | [`exercises.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/exercises.ts) |
| `exercise_favorites` | `exerciseFavorites` | [`exercises.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/exercises.ts) |
| `transactions` | `transactions` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `financial_accounts` | `financialAccounts` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `cost_centers` | `costCenters` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `health_insurances` | `healthInsurances` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `payments` | `payments` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `partner_companies` | `partnerCompanies` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `suppliers` | `suppliers` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `payment_methods` | `paymentMethods` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `session_package_templates` | `sessionPackageTemplates` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `patient_packages` | `patientPackages` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `package_usage` | `packageUsage` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `vouchers` | `vouchers` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `user_vouchers` | `userVouchers` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `voucher_checkout_sessions` | `voucherCheckoutSessions` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `nfse` | `nfse` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `nfse_config` | `nfseConfig` | [`financial.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/financial.ts) |
| `patient_gamification` | `patientGamification` | [`gamification.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/gamification.ts) |
| `xp_transactions` | `xpTransactions` | [`gamification.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/gamification.ts) |
| `achievements` | `achievements` | [`gamification.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/gamification.ts) |
| `achievements_log` | `achievementsLog` | [`gamification.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/gamification.ts) |
| `daily_quests` | `dailyQuests` | [`gamification.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/gamification.ts) |
| `group_classes` | `groupClasses` | [`groups.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/groups.ts) |
| `group_enrollments` | `groupEnrollments` | [`groups.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/groups.ts) |
| `group_checkins` | `groupCheckins` | [`groups.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/groups.ts) |
| `jules_pr_reviews` | `julesPrReviews` | [`jules.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/jules.ts) |
| `jules_learnings` | `julesLearnings` | [`jules.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/jules.ts) |
| `media_gallery` | `mediaGallery` | [`media.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/media.ts) |
| `exercise_media_attachments` | `exerciseMediaAttachments` | [`media.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/media.ts) |
| `organizations` | `organizations` | [`organizations.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/organizations.ts) |
| `profiles` | `profiles` | [`organizations.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/organizations.ts) |
| `patients` | `patients` | [`patients.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/patients.ts) |
| `medical_records` | `medicalRecords` | [`patients.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/patients.ts) |
| `pathologies` | `pathologies` | [`patients.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/patients.ts) |
| `surgeries` | `surgeries` | [`patients.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/patients.ts) |
| `goals` | `goals` | [`patients.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/patients.ts) |
| `patient_portal_users` | `patientPortalUsers` | [`portal.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/portal.ts) |
| `patient_exercise_logs` | `patientExerciseLogs` | [`portal.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/portal.ts) |
| `pre_registration_tokens` | `preRegistrationTokens` | [`precadastro.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/precadastro.ts) |
| `pre_registrations` | `preRegistrations` | [`precadastro.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/precadastro.ts) |
| `exercise_protocols` | `exerciseProtocols` | [`protocols.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/protocols.ts) |
| `protocol_exercises` | `protocolExercises` | [`protocols.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/protocols.ts) |
| `sessions` | `sessions` | [`sessions.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/sessions.ts) |
| `session_attachments` | `sessionAttachments` | [`sessions.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/sessions.ts) |
| `session_templates` | `sessionTemplates` | [`sessions.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/sessions.ts) |
| `task_boards` | `taskBoards` | [`tasks.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/tasks.ts) |
| `task_columns` | `taskColumns` | [`tasks.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/tasks.ts) |
| `tasks` | `tasks` | [`tasks.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/tasks.ts) |
| `task_assignments` | `taskAssignments` | [`tasks.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/tasks.ts) |
| `task_acknowledgments` | `taskAcknowledgments` | [`tasks.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/tasks.ts) |
| `task_visibility` | `taskVisibility` | [`tasks.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/tasks.ts) |
| `task_audit_logs` | `taskAuditLogs` | [`tasks.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/tasks.ts) |
| `exercise_template_categories` | `exerciseTemplateCategories` | [`templates.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/templates.ts) |
| `exercise_templates` | `exerciseTemplates` | [`templates.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/templates.ts) |
| `exercise_template_items` | `exerciseTemplateItems` | [`templates.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/templates.ts) |
| `user_agenda_appearance` | `userAgendaAppearance` | [`userAgendaAppearance.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/userAgendaAppearance.ts) |
| `whatsapp_contacts` | `whatsappContacts` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_conversations` | `waConversations` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_messages` | `waMessages` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_raw_events` | `waRawEvents` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_assignments` | `waAssignments` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_internal_notes` | `waInternalNotes` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_tags` | `waTags` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_conversation_tags` | `waConversationTags` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_quick_replies` | `waQuickReplies` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_automation_rules` | `waAutomationRules` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_sla_config` | `waSlaConfig` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_sla_tracking` | `waSlaTracking` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wa_opt_in_out` | `waOptInOut` | [`whatsapp-inbox.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/whatsapp-inbox.ts) |
| `wiki_pages` | `wikiPages` | [`wiki.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/wiki.ts) |
| `wiki_page_versions` | `wikiPageVersions` | [`wiki.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/wiki.ts) |
| `wiki_dictionary` | `wikiDictionary` | [`wiki.ts`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/wiki.ts) |

---

**Nota de Compliance LGPD & Segurança:** Todos os dados clínicos estão isolados logicamente pelo campo `organizationId`, e os schemas usam chaves estrangeiras estritas para garantir integridade referencial.
