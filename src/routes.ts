import {
	type RouteConfig,
	index,
	layout,
	route,
} from "@react-router/dev/routes";

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
			route(
				"patients/:patientId/evaluations/new/:formId?",
				"pages/patients/NewEvaluationPage.tsx",
			),

			// Evolução
			route("patient-evolution/:appointmentId", "pages/PatientEvolution.tsx"),
			route(
				"patient-evolution-report/:patientId",
				"pages/PatientEvolutionReport.tsx",
			),
			route(
				"session-evolution/:appointmentId",
				"pages/SessionEvolutionPage.tsx",
			),

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
			route("exercises", "pages/Exercises.tsx"),
			route("protocols", "pages/Protocols.tsx"),

			// WhatsApp Inbox
			route("whatsapp/inbox", "pages/WhatsAppInbox.tsx"),
			route("whatsapp/dashboard", "pages/WhatsAppDashboard.tsx"),
			route("whatsapp/automations", "pages/WhatsAppAutomations.tsx"),
			route("whatsapp/templates", "pages/WhatsAppTemplates.tsx"),

			// Analytics & BI
			route("analytics", "pages/AdvancedAnalytics.tsx"),
			route("bi", "pages/BIDashboard.tsx"),

			// Telemedicina
			route("telemedicine", "pages/Telemedicine.tsx"),
			route("telemedicine-room/:roomId", "pages/TelemedicineRoom.tsx"),

			// Settings
			route("settings", "pages/Settings.tsx"),
			route("profile", "pages/Profile.tsx"),
			route("organization", "pages/OrganizationSettings.tsx"),
		]),
	]),
] satisfies RouteConfig;
