export { request, requestPublic } from "./base";

export * from "./admin";
export * from "./billing";
export * from "./boards";
export * from "./clinical";
export * from "./communications";
export * from "./documents";
export * from "./doctors";
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

// export { biomechanicsApi, type BiomechanicsData } from "./clinical"; // Replaced by the module above

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
export {
	biomechanicsApi as biomechanicsAssessmentsApi,
	type BiomechanicsAssessment,
} from "./biomechanics";

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
	EvaluationFormFieldRow,
	EvaluationFormRow,
	EvaluationFormWithFieldsRow,
	PatientEvaluationResponseRow,
	PatientEvaluationResponseStatus,
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
	Protocol,
} from "@/types/workers";
export * from "./messaging";
