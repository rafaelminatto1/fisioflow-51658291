import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("components/layout/InfrastructureLayout.tsx", [
    // Public Routes
    route("welcome", "pages/Welcome.tsx"),
    route("auth", "pages/Auth.tsx", { id: "auth-root" }),
    route("auth/login", "pages/Auth.tsx", { id: "auth-login" }),
    route("pre-cadastro", "pages/PreCadastro.tsx", { id: "pre-cadastro-root" }),
    route("pre-cadastro/:token", "pages/PreCadastro.tsx", {
      id: "pre-cadastro-token",
    }),
    route("feedback-pre-cadastro", "pages/FeedbackPreCadastro.tsx"),
    route("pending-approval", "pages/PendingApproval.tsx"),
    route("privacidade", "pages/PrivacyPolicy.tsx"),
    route("privacy", "pages/PrivacyPolicy.tsx", { id: "privacy-en" }),

    layout("components/layout/AppShellLayout.tsx", [
      // Dashboard & Home
      index("pages/Index.tsx"),
      route("dashboard", "pages/SmartDashboard.tsx"),

      // Pacientes
      route("pacientes", "pages/Patients.tsx"),
      route("patients", "pages/Patients.tsx"),
      route("patients/new", "pages/patients/NewPatientPage.tsx"),
      route("patients/:id", "pages/patients/PatientProfilePage.tsx"),
      route("patients/:id/mapas-dor", "pages/patients/PainMapHistoryPage.tsx"),
      route("pacientes/:id/mapas-dor", "pages/patients/PainMapHistoryPage.tsx"),
      route("patients/:patientId/evaluations/new/:formId?", "pages/patients/NewEvaluationPage.tsx"),

      // Evolução
      route("patient-evolution/:appointmentId", "pages/PatientEvolution.tsx"),
      route("patient-evolution-report/:patientId", "pages/PatientEvolutionReport.tsx"),
      route("session-evolution/:appointmentId", "pages/SessionEvolutionPage.tsx"),

      // Financeiro
      route("financial", "pages/Financial.tsx"),
      route("financeiro/fluxo-caixa", "pages/financeiro/FluxoCaixaPage.tsx"),
      route("financeiro/contas", "pages/financeiro/ContasFinanceirasPage.tsx"),
      route("financeiro/recibos", "pages/financeiro/RecibosPage.tsx"),
      route("financeiro/nfse", "pages/financeiro/NFSePage.tsx"),

      // Agenda
      route("agenda", "pages/Schedule.tsx"),
      route("schedule", "pages/Schedule.tsx"),
      route("schedule/settings", "pages/ScheduleSettings.tsx"),

      // Exercises & Protocols
      route("exercises", "pages/Exercises.tsx", [
        index("pages/exercises/ExercisesLibraryPage.tsx"),
        route("videos", "pages/exercises/ExerciseVideosPage.tsx"),
        route("templates", "pages/exercises/ExerciseTemplatesPage.tsx"),
        route("protocols", "pages/exercises/ExerciseProtocolsPage.tsx"),
        route("ai", "pages/exercises/ExerciseAiPage.tsx"),
        route("analytics", "pages/exercises/ExerciseAnalyticsPage.tsx"),
      ]),
      route("exercises/search-ai", "pages/exercises/SemanticExerciseSearch.tsx"),
      route("exercises/curation", "pages/exercises/ExerciseCuration.tsx"),
      route("exercises/:id/evidence", "pages/exercises/ExerciseEvidence.tsx"),
      route("exercicios", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/videos", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/templates", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/protocolos", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/ia", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/analytics", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/busca-ia", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/curadoria", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("exercicios/:id/evidencia", "pages/exercises/ExercisesLegacyRedirect.tsx"),
      route("protocols", "pages/Protocols.tsx"),

      // WhatsApp Inbox — /whatsapp/inbox unificado em /crm-whatsapp (CrmWhatsApp.tsx)
      route("crm-whatsapp", "pages/CrmWhatsApp.tsx"),
      route("whatsapp/dashboard", "pages/WhatsAppDashboard.tsx"),
      route("whatsapp/automations", "pages/WhatsAppAutomations.tsx"),
      route("whatsapp/templates", "pages/WhatsAppTemplates.tsx"),

      // Analytics & AI
      route("analytics", "pages/AdvancedAnalytics.tsx"),
      route("ai-hub", "pages/AIHub.tsx"),

      // Telemedicina
      route("telemedicine", "pages/Telemedicine.tsx"),
      route("telemedicine-room/:roomId", "pages/TelemedicineRoom.tsx"),

      // Settings
      route("settings", "pages/Settings.tsx"),
      route("profile", "pages/Profile.tsx"),
      route("organization", "pages/OrganizationSettings.tsx"),
      route("admin/lgpd/ropa", "pages/admin/ROPAViewer.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
