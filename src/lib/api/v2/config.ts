/**
 * Legacy API URL compatibility.
 *
 * These URLs point to Cloudflare Workers.
 * Dynamic resources still need an id appended by the caller or by the
 * compatibility layer in `function-http.ts`.
 */

import { getWorkersApiUrl } from "../config";

const WORKERS_BASE_URL = getWorkersApiUrl();
const WORKERS_ENDPOINT = (path: string) => `${WORKERS_BASE_URL}${path}`;

export const API_URLS = {
	patients: {
		list: WORKERS_ENDPOINT("/api/patients"),
		get: WORKERS_ENDPOINT("/api/patients"),
		create: WORKERS_ENDPOINT("/api/patients"),
		update: WORKERS_ENDPOINT("/api/patients"),
		delete: WORKERS_ENDPOINT("/api/patients"),
		stats: WORKERS_ENDPOINT("/api/patients"),
	},
	appointments: {
		list: WORKERS_ENDPOINT("/api/appointments"),
		get: WORKERS_ENDPOINT("/api/appointments"),
		create: WORKERS_ENDPOINT("/api/appointments"),
		update: WORKERS_ENDPOINT("/api/appointments"),
		cancel: WORKERS_ENDPOINT("/api/appointments"),
		checkConflict: WORKERS_ENDPOINT("/api/appointments/check-conflict"),
	},
	doctors: {
		list: WORKERS_ENDPOINT("/api/doctors"),
		search: WORKERS_ENDPOINT("/api/doctors"),
	},
	exercises: {
		list: WORKERS_ENDPOINT("/api/exercises"),
		get: WORKERS_ENDPOINT("/api/exercises"),
		searchSimilar: WORKERS_ENDPOINT("/api/exercises/search/semantic"),
	},
	assessments: {
		listTemplates: WORKERS_ENDPOINT("/api/evaluation-forms"),
	},
	profile: {
		get: WORKERS_ENDPOINT("/api/profile/me"),
		update: WORKERS_ENDPOINT("/api/profile/me"),
	},
	services: {
		patient: WORKERS_ENDPOINT("/api/patients"),
		appointment: WORKERS_ENDPOINT("/api/appointments"),
		evolution: WORKERS_ENDPOINT("/api/evolution"),
		ai: WORKERS_ENDPOINT("/api/ai/service"),
	},
	financial: {
		listTransactions: WORKERS_ENDPOINT("/api/financial/transacoes"),
		createTransaction: WORKERS_ENDPOINT("/api/financial/transacoes"),
		updateTransaction: WORKERS_ENDPOINT("/api/financial/transacoes"),
		deleteTransaction: WORKERS_ENDPOINT("/api/financial/transacoes"),
		findTransactionByAppointmentId: WORKERS_ENDPOINT(
			"/api/financial/pagamentos",
		),
		getEventReport: WORKERS_ENDPOINT("/api/insights/financial"),
		getSummary: WORKERS_ENDPOINT("/api/insights/financial"),
	},
	clinical: {
		listGoals: WORKERS_ENDPOINT("/api/goals"),
		createGoal: WORKERS_ENDPOINT("/api/goals"),
		listPathologies: WORKERS_ENDPOINT("/api/patients"),
		createPathology: WORKERS_ENDPOINT("/api/patients"),
		getInsights: WORKERS_ENDPOINT("/api/clinical/insights"),
		getAiSummary: WORKERS_ENDPOINT("/api/ai/service"),
		transcribe: WORKERS_ENDPOINT("/api/ai/transcribe-audio"),
		scanReport: WORKERS_ENDPOINT("/api/ai/document/analyze"),
	},
	analytics: {
		setup: WORKERS_ENDPOINT("/api/insights/dashboard"),
		dashboard: WORKERS_ENDPOINT("/api/insights/dashboard"),
		evolution: WORKERS_ENDPOINT("/api/insights/patient-evolution"),
		organization: WORKERS_ENDPOINT("/api/insights/dashboard"),
		exercises: WORKERS_ENDPOINT("/api/insights/top-exercises"),
		painMap: WORKERS_ENDPOINT("/api/insights/pain-map"),
		usage: WORKERS_ENDPOINT("/api/insights/dashboard"),
	},
	external: {
		exerciseService: WORKERS_ENDPOINT("/api/exercises"),
	},
};
