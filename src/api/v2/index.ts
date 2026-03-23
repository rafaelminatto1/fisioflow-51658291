export { request, requestPublic } from "./base";

export * from "./admin";
export * from "./billing";
export * from "./boards";
export * from "./clinical";
export * from "./communications";
export * from "./documents";
export * from "./events";
export * from "./exercises";
export * from "./feedback";
export * from "./financial";
export * from "./gamification";
export * from "./imaging";
export * from "./insights";
export * from "./knowledge";
export * from "./marketing";
export * from "./operations";
export * from "./patients";
export * from "./scheduling";
export * from "./system";
export * from "./tracking";

export { appointmentsApi } from "./appointments";
export {
	exercisesApi,
	exerciseTemplatesApi,
	protocolsApi,
	templatesApi,
} from "./exercises";
export {
	exerciseSessionsApi,
	telemedicineApi,
	documentSignaturesApi,
	exercisePlansApi,
	exerciseVideosApi,
} from "./rehab";

export type {
	PatientLifecycleEvent,
	PatientOutcomeMeasure,
	PatientSessionMetrics,
	PatientPrediction,
	PatientRiskScore,
	PatientInsight,
	PatientGoalTracking,
	ClinicalBenchmark,
} from "@/types/patientAnalytics";

export type {
	ClinicalTestTemplateRecord,
	PatientChallengeRow,
	WeeklyChallengeRow,
	GamificationProfileRow,
	DailyQuestRow,
	AchievementRow,
	AchievementLogRow,
	XpTransactionRow,
	GamificationLeaderboardRow,
	ShopItemRow,
	UserInventoryRow,
	GamificationSettingRow,
	GamificationStats,
	AtRiskPatient,
	PopularAchievement,
	QuestDefinitionRow,
} from "@/types/workers";
export * from "./messaging";
