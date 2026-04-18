export { fetchApi, ApiError, cleanRequestData } from "./client";
export type { FetchOptions } from "./client";
export { config } from "../config";
export { getToken } from "../token-storage";

export * from "@/types/api";

export {
	getPatients,
	getPatientById,
	createPatient,
	updatePatient,
	deletePatient,
} from "./patients";

export {
	getAppointments,
	getAppointmentById,
	createAppointment,
	updateAppointment,
	cancelAppointment,
} from "./appointments";

export {
	getExercises,
	getExerciseById,
	createExercise,
	updateExercise,
	deleteExercise,
	favoriteExercise,
	unfavoriteExercise,
	getMyFavoriteExercises,
} from "./exercises";

export {
	getEvolutions,
	getEvolutionById,
	createEvolution,
	updateEvolution,
	deleteEvolution,
	duplicateEvolution,
} from "./evolutions";

export {
	getTarefas,
	createTarefa,
	updateTarefa,
	deleteTarefa,
	bulkUpdateTarefas,
} from "./tarefas";

export {
	getConversations,
	getConversationMessages,
	sendMessage,
	markAsRead,
} from "./messaging";

export {
	getLeads,
	getLeadById,
	createLead,
	updateLead,
	deleteLead,
	getLeadHistory,
	createLeadHistory,
} from "./leads";

export type { ApiLead, ApiLeadHistory } from "./leads";

export {
	getPatientFinancialRecords,
	getPatientFinancialSummary,
	getAllFinancialRecords,
	createFinancialRecord,
	updateFinancialRecord,
	deleteFinancialRecord,
	markFinancialRecordAsPaid,
} from "./financial";

export type { ApiFinancialRecord, ApiFinancialSummary } from "./financial";

export { getLeaderboard } from "./gamification";
export type { ApiLeaderboardEntry } from "./gamification";

export {
	getTelemedicineRooms,
	createTelemedicineRoom,
	startTelemedicineRoom,
} from "./telemedicine";

export type { ApiTelemedicineRoom } from "./telemedicine";

export { getWikiPages, getWikiPageById } from "./wiki";
export type { ApiWikiPage } from "./wiki";

export { getNFSeList, generateNFSe, cancelNFSe } from "./nfse";
export type { ApiNFSeRecord } from "./nfse";

export { getDashboardStats } from "./dashboard";

export {
	getPartnerships,
	getPartnershipById,
	createPartnership,
	updatePartnership,
	deletePartnership,
} from "./partnerships";

export {
	getPatientStandardizedTests,
	createStandardizedTestResult,
} from "./proms";

export type { ApiStandardizedTestResult } from "./proms";

export { getHEPCompliance, getPatientExercisePlans } from "./hep";
export type { ApiHEPComplianceData } from "./hep";

export { checkPatientNameDuplicate } from "./utils";
export { reportsApi } from "./reports";
export type { PdfReportRequest, PdfReportResponse } from "./reports";
