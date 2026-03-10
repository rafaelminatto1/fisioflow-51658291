import { relations } from "drizzle-orm/relations";
import { patients, patientPathologies, patientGoals, exerciseCategories, exercises, patientGamification, medicalRecords, achievementsLog, achievements, dailyQuests, xpTransactions, sessions, sessionAttachments, surgeries, exerciseTemplates, exerciseTemplateItems, exerciseFavorites, goals, pathologies, patientPackages, exerciseProtocols, protocolExercises, wikiPages, wikiPageVersions, appointments, patientDocuments, patientExams, patientExamFiles, medicalRequests, medicalRequestFiles, painMaps, painMapPoints, recurringAppointmentSeries, recurringAppointmentOccurrences, leads, crmTarefas, waitlist, waitlistOffers, leadHistorico, users, accounts, authSessions, shopItems, userInventory, exerciseVideos, physicalExaminations, treatmentPlans, medicalAttachments, evaluationForms, evaluationFormFields, exerciseSessions, exercisePlans, exercisePlanItems, vouchers, userVouchers, voucherCheckoutSessions, standardizedTestResults, patientEvaluationResponses, organizations, activityLabClinicProfiles, activityLabSessions, knowledgeAnnotations, knowledgeCuration, marketingConsents, knowledgeAudit, marketingExports, marketingReviewConfigs, marketingBirthdayConfigs, marketingRecallCampaigns, referralCodes, referralRedemptions, fisioLinks, fisioLinkAnalytics, contentCalendar, knowledgeArticles, knowledgeNotes } from "./schema";

export const patientPathologiesRelations = relations(patientPathologies, ({one}) => ({
	patient: one(patients, {
		fields: [patientPathologies.patientId],
		references: [patients.id]
	}),
}));

export const patientsRelations = relations(patients, ({many}) => ({
	patientPathologies: many(patientPathologies),
	patientGoals: many(patientGoals),
	patientGamifications: many(patientGamification),
	medicalRecords: many(medicalRecords),
	achievementsLogs: many(achievementsLog),
	dailyQuests: many(dailyQuests),
	xpTransactions: many(xpTransactions),
	sessionAttachments: many(sessionAttachments),
	patientPackages: many(patientPackages),
	appointments: many(appointments),
	patientDocuments: many(patientDocuments),
	patientExams: many(patientExams),
	medicalRequests: many(medicalRequests),
	sessions: many(sessions),
	physicalExaminations: many(physicalExaminations),
	treatmentPlans: many(treatmentPlans),
	medicalAttachments: many(medicalAttachments),
	standardizedTestResults: many(standardizedTestResults),
	patientEvaluationResponses: many(patientEvaluationResponses),
	activityLabSessions: many(activityLabSessions),
	marketingConsents: many(marketingConsents),
	marketingExports: many(marketingExports),
	referralCodes: many(referralCodes),
	referralRedemptions_referrerPatientId: many(referralRedemptions, {
		relationName: "referralRedemptions_referrerPatientId_patients_id"
	}),
	referralRedemptions_newPatientId: many(referralRedemptions, {
		relationName: "referralRedemptions_newPatientId_patients_id"
	}),
}));

export const patientGoalsRelations = relations(patientGoals, ({one}) => ({
	patient: one(patients, {
		fields: [patientGoals.patientId],
		references: [patients.id]
	}),
}));

export const exercisesRelations = relations(exercises, ({one, many}) => ({
	exerciseCategory: one(exerciseCategories, {
		fields: [exercises.categoryId],
		references: [exerciseCategories.id]
	}),
	exerciseFavorites: many(exerciseFavorites),
	exerciseVideos: many(exerciseVideos),
	exerciseSessions: many(exerciseSessions),
	exercisePlanItems: many(exercisePlanItems),
}));

export const exerciseCategoriesRelations = relations(exerciseCategories, ({many}) => ({
	exercises: many(exercises),
}));

export const patientGamificationRelations = relations(patientGamification, ({one}) => ({
	patient: one(patients, {
		fields: [patientGamification.patientId],
		references: [patients.id]
	}),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({one, many}) => ({
	patient: one(patients, {
		fields: [medicalRecords.patientId],
		references: [patients.id]
	}),
	surgeries: many(surgeries),
	goals: many(goals),
	pathologies: many(pathologies),
}));

export const achievementsLogRelations = relations(achievementsLog, ({one}) => ({
	patient: one(patients, {
		fields: [achievementsLog.patientId],
		references: [patients.id]
	}),
	achievement: one(achievements, {
		fields: [achievementsLog.achievementId],
		references: [achievements.id]
	}),
}));

export const achievementsRelations = relations(achievements, ({many}) => ({
	achievementsLogs: many(achievementsLog),
}));

export const dailyQuestsRelations = relations(dailyQuests, ({one}) => ({
	patient: one(patients, {
		fields: [dailyQuests.patientId],
		references: [patients.id]
	}),
}));

export const xpTransactionsRelations = relations(xpTransactions, ({one}) => ({
	patient: one(patients, {
		fields: [xpTransactions.patientId],
		references: [patients.id]
	}),
}));

export const sessionAttachmentsRelations = relations(sessionAttachments, ({one}) => ({
	session: one(sessions, {
		fields: [sessionAttachments.sessionId],
		references: [sessions.id]
	}),
	patient: one(patients, {
		fields: [sessionAttachments.patientId],
		references: [patients.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	sessionAttachments: many(sessionAttachments),
	patient: one(patients, {
		fields: [sessions.patientId],
		references: [patients.id]
	}),
	appointment: one(appointments, {
		fields: [sessions.appointmentId],
		references: [appointments.id]
	}),
}));

export const surgeriesRelations = relations(surgeries, ({one}) => ({
	medicalRecord: one(medicalRecords, {
		fields: [surgeries.medicalRecordId],
		references: [medicalRecords.id]
	}),
}));

export const exerciseTemplateItemsRelations = relations(exerciseTemplateItems, ({one}) => ({
	exerciseTemplate: one(exerciseTemplates, {
		fields: [exerciseTemplateItems.templateId],
		references: [exerciseTemplates.id]
	}),
}));

export const exerciseTemplatesRelations = relations(exerciseTemplates, ({many}) => ({
	exerciseTemplateItems: many(exerciseTemplateItems),
}));

export const exerciseFavoritesRelations = relations(exerciseFavorites, ({one}) => ({
	exercise: one(exercises, {
		fields: [exerciseFavorites.exerciseId],
		references: [exercises.id]
	}),
}));

export const goalsRelations = relations(goals, ({one}) => ({
	medicalRecord: one(medicalRecords, {
		fields: [goals.medicalRecordId],
		references: [medicalRecords.id]
	}),
}));

export const pathologiesRelations = relations(pathologies, ({one}) => ({
	medicalRecord: one(medicalRecords, {
		fields: [pathologies.medicalRecordId],
		references: [medicalRecords.id]
	}),
}));

export const patientPackagesRelations = relations(patientPackages, ({one}) => ({
	patient: one(patients, {
		fields: [patientPackages.patientId],
		references: [patients.id]
	}),
}));

export const protocolExercisesRelations = relations(protocolExercises, ({one}) => ({
	exerciseProtocol: one(exerciseProtocols, {
		fields: [protocolExercises.protocolId],
		references: [exerciseProtocols.id]
	}),
}));

export const exerciseProtocolsRelations = relations(exerciseProtocols, ({many}) => ({
	protocolExercises: many(protocolExercises),
}));

export const wikiPageVersionsRelations = relations(wikiPageVersions, ({one}) => ({
	wikiPage: one(wikiPages, {
		fields: [wikiPageVersions.pageId],
		references: [wikiPages.id]
	}),
}));

export const wikiPagesRelations = relations(wikiPages, ({many}) => ({
	wikiPageVersions: many(wikiPageVersions),
}));

export const appointmentsRelations = relations(appointments, ({one, many}) => ({
	patient: one(patients, {
		fields: [appointments.patientId],
		references: [patients.id]
	}),
	sessions: many(sessions),
}));

export const patientDocumentsRelations = relations(patientDocuments, ({one}) => ({
	patient: one(patients, {
		fields: [patientDocuments.patientId],
		references: [patients.id]
	}),
}));

export const patientExamsRelations = relations(patientExams, ({one, many}) => ({
	patient: one(patients, {
		fields: [patientExams.patientId],
		references: [patients.id]
	}),
	patientExamFiles: many(patientExamFiles),
}));

export const patientExamFilesRelations = relations(patientExamFiles, ({one}) => ({
	patientExam: one(patientExams, {
		fields: [patientExamFiles.examId],
		references: [patientExams.id]
	}),
}));

export const medicalRequestsRelations = relations(medicalRequests, ({one, many}) => ({
	patient: one(patients, {
		fields: [medicalRequests.patientId],
		references: [patients.id]
	}),
	medicalRequestFiles: many(medicalRequestFiles),
}));

export const medicalRequestFilesRelations = relations(medicalRequestFiles, ({one}) => ({
	medicalRequest: one(medicalRequests, {
		fields: [medicalRequestFiles.medicalRequestId],
		references: [medicalRequests.id]
	}),
}));

export const painMapPointsRelations = relations(painMapPoints, ({one}) => ({
	painMap: one(painMaps, {
		fields: [painMapPoints.painMapId],
		references: [painMaps.id]
	}),
}));

export const painMapsRelations = relations(painMaps, ({many}) => ({
	painMapPoints: many(painMapPoints),
}));

export const recurringAppointmentOccurrencesRelations = relations(recurringAppointmentOccurrences, ({one}) => ({
	recurringAppointmentSery: one(recurringAppointmentSeries, {
		fields: [recurringAppointmentOccurrences.seriesId],
		references: [recurringAppointmentSeries.id]
	}),
}));

export const recurringAppointmentSeriesRelations = relations(recurringAppointmentSeries, ({many}) => ({
	recurringAppointmentOccurrences: many(recurringAppointmentOccurrences),
}));

export const crmTarefasRelations = relations(crmTarefas, ({one}) => ({
	lead: one(leads, {
		fields: [crmTarefas.leadId],
		references: [leads.id]
	}),
}));

export const leadsRelations = relations(leads, ({many}) => ({
	crmTarefas: many(crmTarefas),
	leadHistoricos: many(leadHistorico),
}));

export const waitlistOffersRelations = relations(waitlistOffers, ({one}) => ({
	waitlist: one(waitlist, {
		fields: [waitlistOffers.waitlistId],
		references: [waitlist.id]
	}),
}));

export const waitlistRelations = relations(waitlist, ({many}) => ({
	waitlistOffers: many(waitlistOffers),
}));

export const leadHistoricoRelations = relations(leadHistorico, ({one}) => ({
	lead: one(leads, {
		fields: [leadHistorico.leadId],
		references: [leads.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	authSessions: many(authSessions),
}));

export const authSessionsRelations = relations(authSessions, ({one}) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id]
	}),
}));

export const userInventoryRelations = relations(userInventory, ({one}) => ({
	shopItem: one(shopItems, {
		fields: [userInventory.itemId],
		references: [shopItems.id]
	}),
}));

export const shopItemsRelations = relations(shopItems, ({many}) => ({
	userInventories: many(userInventory),
}));

export const exerciseVideosRelations = relations(exerciseVideos, ({one}) => ({
	exercise: one(exercises, {
		fields: [exerciseVideos.exerciseId],
		references: [exercises.id]
	}),
}));

export const physicalExaminationsRelations = relations(physicalExaminations, ({one}) => ({
	patient: one(patients, {
		fields: [physicalExaminations.patientId],
		references: [patients.id]
	}),
}));

export const treatmentPlansRelations = relations(treatmentPlans, ({one}) => ({
	patient: one(patients, {
		fields: [treatmentPlans.patientId],
		references: [patients.id]
	}),
}));

export const medicalAttachmentsRelations = relations(medicalAttachments, ({one}) => ({
	patient: one(patients, {
		fields: [medicalAttachments.patientId],
		references: [patients.id]
	}),
}));

export const evaluationFormFieldsRelations = relations(evaluationFormFields, ({one}) => ({
	evaluationForm: one(evaluationForms, {
		fields: [evaluationFormFields.formId],
		references: [evaluationForms.id]
	}),
}));

export const evaluationFormsRelations = relations(evaluationForms, ({many}) => ({
	evaluationFormFields: many(evaluationFormFields),
	patientEvaluationResponses: many(patientEvaluationResponses),
}));

export const exerciseSessionsRelations = relations(exerciseSessions, ({one}) => ({
	exercise: one(exercises, {
		fields: [exerciseSessions.exerciseId],
		references: [exercises.id]
	}),
}));

export const exercisePlanItemsRelations = relations(exercisePlanItems, ({one}) => ({
	exercisePlan: one(exercisePlans, {
		fields: [exercisePlanItems.planId],
		references: [exercisePlans.id]
	}),
	exercise: one(exercises, {
		fields: [exercisePlanItems.exerciseId],
		references: [exercises.id]
	}),
}));

export const exercisePlansRelations = relations(exercisePlans, ({many}) => ({
	exercisePlanItems: many(exercisePlanItems),
}));

export const userVouchersRelations = relations(userVouchers, ({one, many}) => ({
	voucher: one(vouchers, {
		fields: [userVouchers.voucherId],
		references: [vouchers.id]
	}),
	voucherCheckoutSessions: many(voucherCheckoutSessions),
}));

export const vouchersRelations = relations(vouchers, ({many}) => ({
	userVouchers: many(userVouchers),
	voucherCheckoutSessions: many(voucherCheckoutSessions),
}));

export const voucherCheckoutSessionsRelations = relations(voucherCheckoutSessions, ({one}) => ({
	voucher: one(vouchers, {
		fields: [voucherCheckoutSessions.voucherId],
		references: [vouchers.id]
	}),
	userVoucher: one(userVouchers, {
		fields: [voucherCheckoutSessions.userVoucherId],
		references: [userVouchers.id]
	}),
}));

export const standardizedTestResultsRelations = relations(standardizedTestResults, ({one}) => ({
	patient: one(patients, {
		fields: [standardizedTestResults.patientId],
		references: [patients.id]
	}),
}));

export const patientEvaluationResponsesRelations = relations(patientEvaluationResponses, ({one}) => ({
	patient: one(patients, {
		fields: [patientEvaluationResponses.patientId],
		references: [patients.id]
	}),
	evaluationForm: one(evaluationForms, {
		fields: [patientEvaluationResponses.formId],
		references: [evaluationForms.id]
	}),
}));

export const activityLabClinicProfilesRelations = relations(activityLabClinicProfiles, ({one}) => ({
	organization: one(organizations, {
		fields: [activityLabClinicProfiles.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	activityLabClinicProfiles: many(activityLabClinicProfiles),
	activityLabSessions: many(activityLabSessions),
	knowledgeAnnotations: many(knowledgeAnnotations),
	knowledgeCurations: many(knowledgeCuration),
	marketingConsents: many(marketingConsents),
	knowledgeAudits: many(knowledgeAudit),
	marketingExports: many(marketingExports),
	marketingReviewConfigs: many(marketingReviewConfigs),
	marketingBirthdayConfigs: many(marketingBirthdayConfigs),
	marketingRecallCampaigns: many(marketingRecallCampaigns),
	referralCodes: many(referralCodes),
	referralRedemptions: many(referralRedemptions),
	fisioLinks: many(fisioLinks),
	fisioLinkAnalytics: many(fisioLinkAnalytics),
	contentCalendars: many(contentCalendar),
	knowledgeArticles: many(knowledgeArticles),
	knowledgeNotes: many(knowledgeNotes),
}));

export const activityLabSessionsRelations = relations(activityLabSessions, ({one}) => ({
	organization: one(organizations, {
		fields: [activityLabSessions.organizationId],
		references: [organizations.id]
	}),
	patient: one(patients, {
		fields: [activityLabSessions.patientId],
		references: [patients.id]
	}),
}));

export const knowledgeAnnotationsRelations = relations(knowledgeAnnotations, ({one}) => ({
	organization: one(organizations, {
		fields: [knowledgeAnnotations.organizationId],
		references: [organizations.id]
	}),
}));

export const knowledgeCurationRelations = relations(knowledgeCuration, ({one}) => ({
	organization: one(organizations, {
		fields: [knowledgeCuration.organizationId],
		references: [organizations.id]
	}),
}));

export const marketingConsentsRelations = relations(marketingConsents, ({one}) => ({
	patient: one(patients, {
		fields: [marketingConsents.patientId],
		references: [patients.id]
	}),
	organization: one(organizations, {
		fields: [marketingConsents.organizationId],
		references: [organizations.id]
	}),
}));

export const knowledgeAuditRelations = relations(knowledgeAudit, ({one}) => ({
	organization: one(organizations, {
		fields: [knowledgeAudit.organizationId],
		references: [organizations.id]
	}),
}));

export const marketingExportsRelations = relations(marketingExports, ({one}) => ({
	organization: one(organizations, {
		fields: [marketingExports.organizationId],
		references: [organizations.id]
	}),
	patient: one(patients, {
		fields: [marketingExports.patientId],
		references: [patients.id]
	}),
}));

export const marketingReviewConfigsRelations = relations(marketingReviewConfigs, ({one}) => ({
	organization: one(organizations, {
		fields: [marketingReviewConfigs.organizationId],
		references: [organizations.id]
	}),
}));

export const marketingBirthdayConfigsRelations = relations(marketingBirthdayConfigs, ({one}) => ({
	organization: one(organizations, {
		fields: [marketingBirthdayConfigs.organizationId],
		references: [organizations.id]
	}),
}));

export const marketingRecallCampaignsRelations = relations(marketingRecallCampaigns, ({one}) => ({
	organization: one(organizations, {
		fields: [marketingRecallCampaigns.organizationId],
		references: [organizations.id]
	}),
}));

export const referralCodesRelations = relations(referralCodes, ({one, many}) => ({
	patient: one(patients, {
		fields: [referralCodes.patientId],
		references: [patients.id]
	}),
	organization: one(organizations, {
		fields: [referralCodes.organizationId],
		references: [organizations.id]
	}),
	referralRedemptions: many(referralRedemptions),
}));

export const referralRedemptionsRelations = relations(referralRedemptions, ({one}) => ({
	referralCode: one(referralCodes, {
		fields: [referralRedemptions.referralId],
		references: [referralCodes.id]
	}),
	organization: one(organizations, {
		fields: [referralRedemptions.organizationId],
		references: [organizations.id]
	}),
	patient_referrerPatientId: one(patients, {
		fields: [referralRedemptions.referrerPatientId],
		references: [patients.id],
		relationName: "referralRedemptions_referrerPatientId_patients_id"
	}),
	patient_newPatientId: one(patients, {
		fields: [referralRedemptions.newPatientId],
		references: [patients.id],
		relationName: "referralRedemptions_newPatientId_patients_id"
	}),
}));

export const fisioLinksRelations = relations(fisioLinks, ({one}) => ({
	organization: one(organizations, {
		fields: [fisioLinks.organizationId],
		references: [organizations.id]
	}),
}));

export const fisioLinkAnalyticsRelations = relations(fisioLinkAnalytics, ({one}) => ({
	organization: one(organizations, {
		fields: [fisioLinkAnalytics.organizationId],
		references: [organizations.id]
	}),
}));

export const contentCalendarRelations = relations(contentCalendar, ({one}) => ({
	organization: one(organizations, {
		fields: [contentCalendar.organizationId],
		references: [organizations.id]
	}),
}));

export const knowledgeArticlesRelations = relations(knowledgeArticles, ({one}) => ({
	organization: one(organizations, {
		fields: [knowledgeArticles.organizationId],
		references: [organizations.id]
	}),
}));

export const knowledgeNotesRelations = relations(knowledgeNotes, ({one}) => ({
	organization: one(organizations, {
		fields: [knowledgeNotes.organizationId],
		references: [organizations.id]
	}),
}));