export const APP_ROUTES = {
	HOME: "/",
	DASHBOARD: "/dashboard",
	SMART_DASHBOARD: "/smart-dashboard",
	AGENDA: "/agenda",
	PATIENTS: "/patients",
	PATIENT_NEW: "/patients/new",
	EXERCISES: "/exercises",
	FINANCIAL: "/financial",
	REPORTS: "/reports",
	SETTINGS: "/profile",
	EVENTS: "/eventos",
	TASKS: "/tarefas",
	IA_STUDIO: "/ia-studio",
} as const;

export const patientRoutes = {
	profile: (patientId: string) => `${APP_ROUTES.PATIENTS}/${patientId}`,
	clinicalTab: (patientId: string) =>
		`${APP_ROUTES.PATIENTS}/${patientId}?tab=clinical`,
	overviewTab: (patientId: string) =>
		`${APP_ROUTES.PATIENTS}/${patientId}?tab=overview`,
	documentsTab: (patientId: string) =>
		`${APP_ROUTES.PATIENTS}/${patientId}?tab=documents`,
	evaluation: (patientId: string) =>
		`${APP_ROUTES.PATIENTS}/${patientId}/evaluation`,
	evolution: (patientId: string) =>
		`${APP_ROUTES.PATIENTS}/${patientId}/evolution`,
} as const;
