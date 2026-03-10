import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, date, time, integer, foreignKey, unique, index, pgPolicy, vector, numeric, check, doublePrecision, uniqueIndex, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const appointmentStatus = pgEnum("appointment_status", ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'])
export const appointmentType = pgEnum("appointment_type", ['evaluation', 'session', 'reassessment', 'group', 'return'])
export const evidenceLevel = pgEnum("evidence_level", ['A', 'B', 'C', 'D'])
export const exerciseDifficulty = pgEnum("exercise_difficulty", ['iniciante', 'intermediario', 'avancado'])
export const exerciseProtocolType = pgEnum("exercise_protocol_type", ['pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional'])
export const fileCategory = pgEnum("file_category", ['exam', 'imaging', 'document', 'before_after', 'other'])
export const fileType = pgEnum("file_type", ['pdf', 'jpg', 'png', 'docx', 'other'])
export const gender = pgEnum("gender", ['M', 'F', 'O'])
export const goalStatus = pgEnum("goal_status", ['pending', 'in_progress', 'achieved', 'abandoned'])
export const packageStatus = pgEnum("package_status", ['active', 'expired', 'used', 'cancelled'])
export const pathologyStatus = pgEnum("pathology_status", ['active', 'treated', 'monitoring'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'paid', 'partial', 'refunded'])
export const protocolType = pgEnum("protocol_type", ['pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional', 'neurologico', 'respiratorio'])
export const role = pgEnum("role", ['admin', 'fisioterapeuta', 'recepcionista', 'estagiario', 'paciente', 'parceiro', 'pending'])
export const sessionStatus = pgEnum("session_status", ['draft', 'finalized', 'cancelled'])


export const sessionTemplates = pgTable("session_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	therapistId: uuid("therapist_id"),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	subjective: jsonb(),
	objective: jsonb(),
	assessment: jsonb(),
	plan: jsonb(),
	isGlobal: boolean("is_global").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const blockedSlots = pgTable("blocked_slots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	therapistId: uuid("therapist_id"),
	roomId: uuid("room_id"),
	organizationId: uuid("organization_id"),
	date: date().notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	reason: varchar({ length: 200 }),
	isAllDay: boolean("is_all_day").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	name: varchar({ length: 100 }).notNull(),
	capacity: integer().default(1),
	isActive: boolean("is_active").default(true),
	workingHours: text("working_hours"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const patientPathologies = pgTable("patient_pathologies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	description: text(),
	diagnosedAt: timestamp("diagnosed_at", { mode: 'string' }),
	status: text().default('ativo').notNull(),
	isPrimary: boolean("is_primary").default(false),
	icdCode: text("icd_code"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_pathologies_patient_id_patients_id_fk"
		}),
]);

export const evaluationTemplates = pgTable("evaluation_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	content: jsonb(),
	isGlobal: boolean("is_global").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const exerciseCategories = pgTable("exercise_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	icon: varchar({ length: 50 }),
	color: varchar({ length: 20 }),
	orderIndex: integer("order_index").default(0),
	parentId: uuid("parent_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("exercise_categories_slug_unique").on(table.slug),
]);

export const patientGoals = pgTable("patient_goals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	description: text().notNull(),
	targetDate: timestamp("target_date", { mode: 'string' }),
	status: text().default('em_andamento').notNull(),
	priority: text().default('media'),
	achievedAt: timestamp("achieved_at", { mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_goals_patient_id_patients_id_fk"
		}),
]);

export const exercises = pgTable("exercises", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 250 }),
	name: varchar({ length: 250 }).notNull(),
	categoryId: uuid("category_id"),
	subcategory: varchar({ length: 100 }),
	difficulty: exerciseDifficulty().default('iniciante'),
	description: text(),
	instructions: text(),
	tips: text(),
	precautions: text(),
	benefits: text(),
	musclesPrimary: text("muscles_primary").array().default([""]),
	musclesSecondary: text("muscles_secondary").array().default([""]),
	bodyParts: text("body_parts").array().default([""]),
	equipment: text().array().default([""]),
	setsRecommended: integer("sets_recommended"),
	repsRecommended: integer("reps_recommended"),
	durationSeconds: integer("duration_seconds"),
	restSeconds: integer("rest_seconds"),
	imageUrl: text("image_url"),
	thumbnailUrl: text("thumbnail_url"),
	videoUrl: text("video_url"),
	pathologiesIndicated: text("pathologies_indicated").array().default([""]),
	pathologiesContraindicated: text("pathologies_contraindicated").array().default([""]),
	icd10Codes: text("icd10_codes").array().default([""]),
	tags: text().array().default([""]),
	references: text(),
	isActive: boolean("is_active").default(true).notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	organizationId: uuid("organization_id"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	firestoreId: varchar("firestore_id", { length: 255 }),
	embedding: vector({ dimensions: 3072 }),
}, (table) => [
	index("idx_exercises_active_public").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.isPublic.asc().nullsLast().op("bool_ops")).where(sql`((is_active = true) AND (is_public = true))`),
	index("idx_exercises_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [exerciseCategories.id],
			name: "exercises_category_id_exercise_categories_id_fk"
		}),
	unique("exercises_slug_unique").on(table.slug),
	unique("exercises_firestore_id_key").on(table.firestoreId),
	pgPolicy("exercises_org_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((organization_id IS NULL) OR (organization_id = (NULLIF(current_setting('app.org_id'::text, true), ''::text))::uuid))` }),
]);

export const achievements = pgTable("achievements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	xpReward: integer("xp_reward").default(50),
	icon: text(),
	category: text().default('general'),
	requirements: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("achievements_code_unique").on(table.code),
]);

export const patientGamification = pgTable("patient_gamification", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	currentXp: integer("current_xp").default(0),
	level: integer().default(1),
	currentStreak: integer("current_streak").default(0),
	longestStreak: integer("longest_streak").default(0),
	totalPoints: integer("total_points").default(0),
	lastActivityDate: timestamp("last_activity_date", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_gamification_patient_id_patients_id_fk"
		}).onDelete("cascade"),
	unique("patient_gamification_patient_id_unique").on(table.patientId),
]);

export const medicalRecords = pgTable("medical_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	chiefComplaint: text("chief_complaint"),
	currentHistory: text("current_history"),
	pastHistory: text("past_history"),
	familyHistory: text("family_history"),
	medications: jsonb().default([]),
	allergies: jsonb().default([]),
	physicalActivity: text("physical_activity"),
	lifestyle: jsonb(),
	physicalExam: jsonb("physical_exam"),
	diagnosis: text(),
	icd10Codes: jsonb("icd10_codes").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "medical_records_patient_id_patients_id_fk"
		}).onDelete("cascade"),
	unique("medical_records_patient_id_unique").on(table.patientId),
]);

export const achievementsLog = pgTable("achievements_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	achievementId: uuid("achievement_id").notNull(),
	achievementTitle: text("achievement_title").notNull(),
	unlockedAt: timestamp("unlocked_at", { withTimezone: true, mode: 'string' }),
	xpReward: integer("xp_reward"),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "achievements_log_patient_id_patients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.achievementId],
			foreignColumns: [achievements.id],
			name: "achievements_log_achievement_id_achievements_id_fk"
		}),
]);

export const dailyQuests = pgTable("daily_quests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	date: date().defaultNow(),
	questsData: jsonb("quests_data").default([]).notNull(),
	completedCount: integer("completed_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "daily_quests_patient_id_patients_id_fk"
		}).onDelete("cascade"),
	unique("daily_quests_patient_id_date_unique").on(table.patientId, table.date),
]);

export const xpTransactions = pgTable("xp_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	amount: integer().notNull(),
	reason: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdBy: uuid("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "xp_transactions_patient_id_patients_id_fk"
		}).onDelete("cascade"),
]);

export const sessionAttachments = pgTable("session_attachments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id"),
	patientId: uuid("patient_id").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	originalName: varchar("original_name", { length: 255 }),
	fileUrl: text("file_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	fileType: fileType("file_type").default('other'),
	mimeType: varchar("mime_type", { length: 100 }),
	category: fileCategory().default('other'),
	sizeBytes: integer("size_bytes"),
	description: text(),
	uploadedBy: uuid("uploaded_by"),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "session_attachments_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "session_attachments_patient_id_patients_id_fk"
		}).onDelete("cascade"),
]);

export const surgeries = pgTable("surgeries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	medicalRecordId: uuid("medical_record_id").notNull(),
	name: varchar({ length: 200 }).notNull(),
	surgeryDate: date("surgery_date"),
	surgeon: varchar({ length: 150 }),
	hospital: varchar({ length: 150 }),
	postOpProtocol: text("post_op_protocol"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.medicalRecordId],
			foreignColumns: [medicalRecords.id],
			name: "surgeries_medical_record_id_medical_records_id_fk"
		}).onDelete("cascade"),
]);

export const exerciseTemplateItems = pgTable("exercise_template_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firestoreId: varchar("firestore_id", { length: 255 }),
	templateId: uuid("template_id").notNull(),
	exerciseId: text("exercise_id").notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	sets: integer(),
	repetitions: integer(),
	duration: integer(),
	notes: text(),
	weekStart: integer("week_start"),
	weekEnd: integer("week_end"),
	clinicalNotes: text("clinical_notes"),
	focusMuscles: text("focus_muscles").array().default([""]),
	purpose: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [exerciseTemplates.id],
			name: "exercise_template_items_template_id_fkey"
		}).onDelete("cascade"),
	unique("exercise_template_items_firestore_id_key").on(table.firestoreId),
]);

export const exerciseFavorites = pgTable("exercise_favorites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	exerciseId: uuid("exercise_id").notNull(),
	userId: text("user_id").notNull(),
	organizationId: uuid("organization_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.exerciseId],
			foreignColumns: [exercises.id],
			name: "exercise_favorites_exercise_id_exercises_id_fk"
		}).onDelete("cascade"),
]);

export const goals = pgTable("goals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	medicalRecordId: uuid("medical_record_id").notNull(),
	description: text().notNull(),
	targetDate: date("target_date"),
	priority: integer().default(0),
	status: goalStatus().default('pending'),
	achievedAt: timestamp("achieved_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.medicalRecordId],
			foreignColumns: [medicalRecords.id],
			name: "goals_medical_record_id_medical_records_id_fk"
		}).onDelete("cascade"),
]);

export const pathologies = pgTable("pathologies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	medicalRecordId: uuid("medical_record_id").notNull(),
	name: varchar({ length: 200 }).notNull(),
	icdCode: varchar("icd_code", { length: 20 }),
	status: pathologyStatus().default('active'),
	diagnosedAt: date("diagnosed_at"),
	treatedAt: date("treated_at"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.medicalRecordId],
			foreignColumns: [medicalRecords.id],
			name: "pathologies_medical_record_id_medical_records_id_fk"
		}).onDelete("cascade"),
]);

export const patientPackages = pgTable("patient_packages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	totalSessions: integer("total_sessions").notNull(),
	usedSessions: integer("used_sessions").default(0).notNull(),
	remainingSessions: integer("remaining_sessions").notNull(),
	price: numeric({ precision: 10, scale:  2 }),
	status: packageStatus().default('active'),
	purchasedAt: timestamp("purchased_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_packages_patient_id_patients_id_fk"
		}).onDelete("cascade"),
]);

export const protocolExercises = pgTable("protocol_exercises", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	protocolId: uuid("protocol_id").notNull(),
	exerciseId: uuid("exercise_id").notNull(),
	phaseWeekStart: integer("phase_week_start").notNull(),
	phaseWeekEnd: integer("phase_week_end"),
	setsRecommended: integer("sets_recommended"),
	repsRecommended: integer("reps_recommended"),
	durationSeconds: integer("duration_seconds"),
	frequencyPerWeek: integer("frequency_per_week"),
	progressionNotes: text("progression_notes"),
	orderIndex: integer("order_index").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.protocolId],
			foreignColumns: [exerciseProtocols.id],
			name: "protocol_exercises_protocol_id_exercise_protocols_id_fk"
		}).onDelete("cascade"),
]);

export const wikiPages = pgTable("wiki_pages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 350 }).notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().default('),
	htmlContent: text("html_content"),
	icon: varchar({ length: 50 }),
	coverImage: text("cover_image"),
	parentId: uuid("parent_id"),
	category: varchar({ length: 100 }),
	tags: text().array().default([""]),
	isPublished: boolean("is_published").default(true).notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	version: integer().default(1).notNull(),
	organizationId: uuid("organization_id"),
	createdBy: text("created_by"),
	updatedBy: text("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	index("idx_wiki_published_public").using("btree", table.isPublished.asc().nullsLast().op("bool_ops"), table.isPublic.asc().nullsLast().op("bool_ops")).where(sql`((is_published = true) AND (is_public = true) AND (deleted_at IS NULL))`),
	index("idx_wiki_title_trgm").using("gin", table.title.asc().nullsLast().op("gin_trgm_ops")),
	unique("wiki_pages_slug_unique").on(table.slug),
]);

export const wikiPageVersions = pgTable("wiki_page_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pageId: uuid("page_id").notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	htmlContent: text("html_content"),
	version: integer().notNull(),
	comment: varchar({ length: 500 }),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [wikiPages.id],
			name: "wiki_page_versions_page_id_wiki_pages_id_fk"
		}).onDelete("cascade"),
]);

export const exerciseTemplates = pgTable("exercise_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firestoreId: varchar("firestore_id", { length: 255 }),
	name: varchar({ length: 500 }).notNull(),
	description: text(),
	category: varchar({ length: 200 }),
	conditionName: varchar("condition_name", { length: 500 }),
	templateVariant: varchar("template_variant", { length: 200 }),
	clinicalNotes: text("clinical_notes"),
	contraindications: text(),
	precautions: text(),
	progressionNotes: text("progression_notes"),
	evidenceLevel: varchar("evidence_level", { length: 1 }),
	bibliographicReferences: text("bibliographic_references").array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	organizationId: uuid("organization_id"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_templates_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	unique("exercise_templates_firestore_id_key").on(table.firestoreId),
	pgPolicy("templates_org_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((organization_id IS NULL) OR (organization_id = (NULLIF(current_setting('app.org_id'::text, true), ''::text))::uuid))` }),
	check("exercise_templates_evidence_level_check", sql`(evidence_level)::text = ANY ((ARRAY['A'::character varying, 'B'::character varying, 'C'::character varying, 'D'::character varying])::text[])`),
]);

export const exerciseProtocols = pgTable("exercise_protocols", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 250 }),
	name: varchar({ length: 250 }).notNull(),
	conditionName: varchar("condition_name", { length: 250 }),
	protocolType: protocolType("protocol_type").default('patologia'),
	evidenceLevel: evidenceLevel("evidence_level"),
	description: text(),
	objectives: text(),
	contraindications: text(),
	weeksTotal: integer("weeks_total"),
	phases: jsonb().default([]),
	milestones: jsonb().default([]),
	restrictions: jsonb().default([]),
	progressionCriteria: jsonb("progression_criteria").default([]),
	references: jsonb().default([]),
	icd10Codes: text("icd10_codes").array().default([""]),
	tags: text().array().default([""]),
	clinicalTests: text("clinical_tests").array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	organizationId: uuid("organization_id"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	firestoreId: varchar("firestore_id", { length: 255 }),
	embedding: vector({ dimensions: 3072 }),
}, (table) => [
	index("idx_protocols_active_public").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.isPublic.asc().nullsLast().op("bool_ops")).where(sql`((is_active = true) AND (is_public = true))`),
	index("idx_protocols_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	unique("exercise_protocols_slug_unique").on(table.slug),
	unique("exercise_protocols_firestore_id_key").on(table.firestoreId),
	pgPolicy("protocols_org_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((organization_id IS NULL) OR (organization_id = (NULLIF(current_setting('app.org_id'::text, true), ''::text))::uuid))` }),
]);

export const appointments = pgTable("appointments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	therapistId: uuid("therapist_id"),
	organizationId: uuid("organization_id"),
	date: date().notNull(),
	startTime: time("start_time"),
	endTime: time("end_time"),
	durationMinutes: integer("duration_minutes").default(60),
	status: appointmentStatus().default('scheduled'),
	type: appointmentType().default('session'),
	isGroup: boolean("is_group").default(false),
	maxParticipants: integer("max_participants").default(1),
	currentParticipants: integer("current_participants").default(1),
	groupId: uuid("group_id"),
	roomId: uuid("room_id"),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
	confirmedVia: varchar("confirmed_via", { length: 50 }),
	reminderSentAt: timestamp("reminder_sent_at", { mode: 'string' }),
	paymentStatus: paymentStatus("payment_status").default('pending'),
	paymentAmount: numeric("payment_amount", { precision: 10, scale:  2 }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	packageId: uuid("package_id"),
	notes: text(),
	cancellationReason: text("cancellation_reason"),
	cancelledAt: timestamp("cancelled_at", { mode: 'string' }),
	cancelledBy: uuid("cancelled_by"),
	rescheduledFrom: uuid("rescheduled_from"),
	rescheduledTo: uuid("rescheduled_to"),
	isRecurring: boolean("is_recurring").default(false),
	recurrencePattern: varchar("recurrence_pattern", { length: 50 }),
	recurrenceGroupId: uuid("recurrence_group_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	firestoreId: varchar("firestore_id", { length: 255 }),
}, (table) => [
	index("idx_appointments_org_date").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.date.asc().nullsLast().op("uuid_ops")),
	index("idx_appointments_org_patient_date").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.patientId.asc().nullsLast().op("uuid_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("idx_appointments_org_status_date").using("btree", table.organizationId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("uuid_ops")),
	index("idx_appointments_org_therapist_date").using("btree", table.organizationId.asc().nullsLast().op("date_ops"), table.therapistId.asc().nullsLast().op("uuid_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "appointments_patient_id_patients_id_fk"
		}).onDelete("cascade"),
	unique("appointments_firestore_id_key").on(table.firestoreId),
]);

export const profiles = pgTable("profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	organizationId: uuid("organization_id"),
	fullName: text("full_name").notNull(),
	role: text().default('fisioterapeuta'),
	avatarUrl: text("avatar_url"),
	phone: text(),
	onboardingCompleted: boolean("onboarding_completed").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("profiles_user_id_key").on(table.userId),
]);

export const patientDocuments = pgTable("patient_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	fileName: varchar("file_name", { length: 500 }).notNull(),
	filePath: text("file_path").notNull(),
	fileType: varchar("file_type", { length: 200 }),
	fileSize: integer("file_size"),
	category: varchar({ length: 50 }).default('outro'),
	description: text(),
	storageUrl: text("storage_url"),
	uploadedBy: varchar("uploaded_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_documents_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const patientExams = pgTable("patient_exams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	title: varchar({ length: 500 }).notNull(),
	examDate: timestamp("exam_date", { mode: 'string' }),
	examType: varchar("exam_type", { length: 200 }),
	description: text(),
	createdBy: varchar("created_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_exams_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const patientExamFiles = pgTable("patient_exam_files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	examId: uuid("exam_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	filePath: text("file_path").notNull(),
	fileName: varchar("file_name", { length: 500 }).notNull(),
	fileType: varchar("file_type", { length: 200 }),
	fileSize: integer("file_size"),
	storageUrl: text("storage_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.examId],
			foreignColumns: [patientExams.id],
			name: "patient_exam_files_exam_id_fkey"
		}).onDelete("cascade"),
]);

export const medicalRequests = pgTable("medical_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	doctorName: varchar("doctor_name", { length: 500 }),
	requestDate: timestamp("request_date", { mode: 'string' }),
	notes: text(),
	createdBy: varchar("created_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "medical_requests_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const medicalRequestFiles = pgTable("medical_request_files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	medicalRequestId: uuid("medical_request_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	filePath: text("file_path").notNull(),
	fileName: varchar("file_name", { length: 500 }).notNull(),
	fileType: varchar("file_type", { length: 200 }),
	fileSize: integer("file_size"),
	storageUrl: text("storage_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.medicalRequestId],
			foreignColumns: [medicalRequests.id],
			name: "medical_request_files_medical_request_id_fkey"
		}).onDelete("cascade"),
]);

export const clinicProfiles = pgTable("clinic_profiles", {
	organizationId: uuid("organization_id").primaryKey().notNull(),
	name: text().default('Activity Fisioterapia').notNull(),
	physioName: text("physio_name").default('Dr. Fisioterapeuta').notNull(),
	crefito: text().default(').notNull(),
	logoUri: text("logo_uri"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("clinic_profiles_rls", { as: "permissive", for: "all", to: ["public"], using: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`, withCheck: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`  }),
]);

export const contasFinanceiras = pgTable("contas_financeiras", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	tipo: text().notNull(),
	valor: numeric({ precision: 10, scale:  2 }).notNull(),
	status: text().default('pendente'),
	descricao: text(),
	dataVencimento: date("data_vencimento"),
	pagoEm: timestamp("pago_em", { withTimezone: true, mode: 'string' }),
	patientId: uuid("patient_id"),
	appointmentId: uuid("appointment_id"),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("contas_financeiras_tipo_check", sql`tipo = ANY (ARRAY['receber'::text, 'pagar'::text])`),
	check("contas_financeiras_status_check", sql`status = ANY (ARRAY['pendente'::text, 'pago'::text, 'cancelado'::text, 'vencido'::text])`),
]);

export const goalProfiles = pgTable("goal_profiles", {
	id: text().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	name: text().notNull(),
	description: text(),
	status: text().default('DRAFT').notNull(),
	version: integer().default(1).notNull(),
	applicableTests: jsonb("applicable_tests").default([]).notNull(),
	qualityGate: jsonb("quality_gate"),
	targets: jsonb().default([]).notNull(),
	clinicianNotesTemplate: text("clinician_notes_template"),
	patientNotesTemplate: text("patient_notes_template"),
	evidence: jsonb().default([]).notNull(),
	defaultPinnedMetricKeys: jsonb("default_pinned_metric_keys").default([]).notNull(),
	tags: jsonb().default([]).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("goal_profiles_status_check", sql`status = ANY (ARRAY['DRAFT'::text, 'PUBLISHED'::text, 'ARCHIVED'::text])`),
]);

export const centrosCusto = pgTable("centros_custo", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	descricao: text(),
	codigo: text(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const transacoes = pgTable("transacoes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	userId: text("user_id"),
	tipo: text().notNull(),
	valor: numeric({ precision: 10, scale:  2 }).notNull(),
	descricao: text(),
	status: text().default('pendente'),
	categoria: text(),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	stripeRefundId: text("stripe_refund_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const convenios = pgTable("convenios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	cnpj: text(),
	telefone: text(),
	email: text(),
	contatoResponsavel: text("contato_responsavel"),
	valorRepasse: numeric("valor_repasse", { precision: 10, scale:  2 }),
	prazoPagamentoDias: integer("prazo_pagamento_dias"),
	observacoes: text(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const pagamentos = pgTable("pagamentos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	eventoId: uuid("evento_id"),
	appointmentId: uuid("appointment_id"),
	valor: numeric({ precision: 10, scale:  2 }).notNull(),
	formaPagamento: text("forma_pagamento"),
	pagoEm: timestamp("pago_em", { withTimezone: true, mode: 'string' }),
	observacoes: text(),
	patientId: uuid("patient_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const painMapPoints = pgTable("pain_map_points", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	painMapId: uuid("pain_map_id"),
	xCoordinate: numeric("x_coordinate"),
	yCoordinate: numeric("y_coordinate"),
	intensity: integer(),
	region: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.painMapId],
			foreignColumns: [painMaps.id],
			name: "pain_map_points_pain_map_id_fkey"
		}).onDelete("cascade"),
]);

export const recurringAppointmentSeries = pgTable("recurring_appointment_series", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id"),
	therapistId: text("therapist_id"),
	serviceId: uuid("service_id"),
	roomId: uuid("room_id"),
	recurrenceType: text("recurrence_type").notNull(),
	recurrenceInterval: integer("recurrence_interval").default(1),
	recurrenceDaysOfWeek: integer("recurrence_days_of_week").array().default([]),
	appointmentDate: date("appointment_date"),
	appointmentTime: time("appointment_time"),
	duration: integer().default(60),
	appointmentType: text("appointment_type"),
	notes: text(),
	autoConfirm: boolean("auto_confirm").default(false),
	isActive: boolean("is_active").default(true),
	createdBy: text("created_by"),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("recurring_appointment_series_recurrence_type_check", sql`recurrence_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text])`),
]);

export const recurringAppointmentOccurrences = pgTable("recurring_appointment_occurrences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	seriesId: uuid("series_id"),
	occurrenceDate: date("occurrence_date").notNull(),
	occurrenceTime: time("occurrence_time"),
	status: text().default('scheduled'),
	appointmentId: uuid("appointment_id"),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	canceledBy: text("canceled_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.seriesId],
			foreignColumns: [recurringAppointmentSeries.id],
			name: "recurring_appointment_occurrences_series_id_fkey"
		}).onDelete("cascade"),
	check("recurring_appointment_occurrences_status_check", sql`status = ANY (ARRAY['scheduled'::text, 'cancelled'::text, 'completed'::text])`),
]);

export const crmTarefas = pgTable("crm_tarefas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	titulo: text().notNull(),
	descricao: text(),
	status: text().default('pendente'),
	responsavelId: text("responsavel_id"),
	leadId: uuid("lead_id"),
	dueDate: date("due_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "crm_tarefas_lead_id_fkey"
		}).onDelete("set null"),
]);

export const waitlist = pgTable("waitlist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id"),
	preferredDays: integer("preferred_days").array().default([]),
	preferredPeriods: text("preferred_periods").array().default([""]),
	preferredTherapistId: text("preferred_therapist_id"),
	priority: text().default('normal'),
	status: text().default('waiting'),
	refusalCount: integer("refusal_count").default(0),
	offeredSlot: jsonb("offered_slot"),
	offeredAt: timestamp("offered_at", { withTimezone: true, mode: 'string' }),
	offerExpiresAt: timestamp("offer_expires_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("waitlist_priority_check", sql`priority = ANY (ARRAY['normal'::text, 'high'::text, 'urgent'::text])`),
	check("waitlist_status_check", sql`status = ANY (ARRAY['waiting'::text, 'offered'::text, 'scheduled'::text, 'removed'::text])`),
]);

export const waitlistOffers = pgTable("waitlist_offers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	patientId: uuid("patient_id"),
	waitlistId: uuid("waitlist_id"),
	offeredSlot: jsonb("offered_slot"),
	response: text().default('pending'),
	status: text().default('pending'),
	expirationTime: timestamp("expiration_time", { withTimezone: true, mode: 'string' }),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.waitlistId],
			foreignColumns: [waitlist.id],
			name: "waitlist_offers_waitlist_id_fkey"
		}).onDelete("cascade"),
	check("waitlist_offers_response_check", sql`response = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])`),
]);

export const leads = pgTable("leads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	telefone: text(),
	email: text(),
	origem: text(),
	estagio: text().default('aguardando'),
	responsavelId: text("responsavel_id"),
	dataPrimeiroContato: date("data_primeiro_contato"),
	dataUltimoContato: date("data_ultimo_contato"),
	interesse: text(),
	observacoes: text(),
	motivoNaoEfetivacao: text("motivo_nao_efetivacao"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("leads_estagio_check", sql`estagio = ANY (ARRAY['aguardando'::text, 'em_contato'::text, 'avaliacao_agendada'::text, 'avaliacao_realizada'::text, 'efetivado'::text, 'nao_efetivado'::text])`),
]);

export const leadHistorico = pgTable("lead_historico", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	leadId: uuid("lead_id"),
	tipoContato: text("tipo_contato"),
	descricao: text(),
	resultado: text(),
	proximoContato: date("proximo_contato"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_historico_lead_id_fkey"
		}).onDelete("cascade"),
]);

export const evolutionTemplates = pgTable("evolution_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	description: text(),
	blocks: jsonb().default([]),
	tags: text().array().default([""]),
	ativo: boolean().default(true),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const painMaps = pgTable("pain_maps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	patientId: uuid("patient_id"),
	evolutionId: text("evolution_id"),
	bodyRegion: text("body_region"),
	painLevel: integer("pain_level"),
	colorCode: text("color_code"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const exercisePrescriptions = pgTable("exercise_prescriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	patientId: uuid("patient_id"),
	therapistId: text("therapist_id"),
	qrCode: text("qr_code"),
	title: text().notNull(),
	exercises: jsonb().default([]),
	notes: text(),
	validityDays: integer("validity_days").default(30),
	validUntil: date("valid_until"),
	status: text().default('ativo'),
	viewCount: integer("view_count").default(0),
	lastViewedAt: timestamp("last_viewed_at", { withTimezone: true, mode: 'string' }),
	completedExercises: jsonb("completed_exercises").default([]),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("exercise_prescriptions_qr_code_key").on(table.qrCode),
	check("exercise_prescriptions_status_check", sql`status = ANY (ARRAY['ativo'::text, 'concluido'::text, 'expirado'::text, 'cancelado'::text])`),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	userId: text("user_id").notNull(),
	type: text().default('info'),
	title: text().notNull(),
	message: text(),
	link: text(),
	isRead: boolean("is_read").default(false),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notifications_user_unread").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.isRead.asc().nullsLast().op("text_ops")).where(sql`(is_read = false)`),
	check("notifications_type_check", sql`type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'appointment'::text, 'payment'::text, 'whatsapp'::text, 'waitlist'::text])`),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: text("entity_id"),
	userId: text("user_id"),
	changes: jsonb(),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const eventos = pgTable("eventos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	descricao: text(),
	categoria: text(),
	local: text(),
	dataInicio: timestamp("data_inicio", { withTimezone: true, mode: 'string' }),
	dataFim: timestamp("data_fim", { withTimezone: true, mode: 'string' }),
	horaInicio: time("hora_inicio"),
	horaFim: time("hora_fim"),
	gratuito: boolean().default(false),
	linkWhatsapp: text("link_whatsapp"),
	valorPadraoPrestador: numeric("valor_padrao_prestador", { precision: 10, scale:  2 }),
	status: text().default('ativo'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const salas = pgTable("salas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	capacidade: integer().default(1),
	descricao: text(),
	cor: text(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const servicos = pgTable("servicos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	descricao: text(),
	duracao: integer().default(60),
	valor: numeric({ precision: 10, scale:  2 }),
	cor: text(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const patients = pgTable("patients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fullName: varchar("full_name", { length: 150 }).notNull(),
	cpf: varchar({ length: 14 }),
	rg: varchar({ length: 20 }),
	birthDate: date("birth_date"),
	gender: gender(),
	phone: varchar({ length: 20 }),
	phoneSecondary: varchar("phone_secondary", { length: 20 }),
	email: varchar({ length: 255 }),
	photoUrl: text("photo_url"),
	profession: varchar({ length: 100 }),
	address: jsonb(),
	emergencyContact: jsonb("emergency_contact"),
	insurance: jsonb(),
	organizationId: uuid("organization_id"),
	origin: varchar({ length: 100 }),
	referredBy: varchar("referred_by", { length: 150 }),
	isActive: boolean("is_active").default(true).notNull(),
	alerts: jsonb().default([]),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	mainCondition: text("main_condition"),
	status: varchar({ length: 50 }).default('Inicial').notNull(),
	progress: integer().default(0).notNull(),
	firestoreId: varchar("firestore_id", { length: 255 }),
	dateOfBirth: date("date_of_birth"),
	archived: boolean().default(false).notNull(),
	weight: doublePrecision(),
}, (table) => [
	index("idx_patients_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_patients_org_active").using("btree", table.organizationId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("uuid_ops")),
	index("idx_patients_org_archived").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.archived.asc().nullsLast().op("bool_ops")),
	index("idx_patients_org_name").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.fullName.asc().nullsLast().op("uuid_ops")),
	index("idx_patients_org_status").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_patients_photo_url").using("btree", table.photoUrl.asc().nullsLast().op("text_ops")).where(sql`(photo_url IS NOT NULL)`),
	unique("patients_cpf_unique").on(table.cpf),
	unique("patients_firestore_id_key").on(table.firestoreId),
	pgPolicy("patients_rls", { as: "permissive", for: "all", to: ["public"], using: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`, withCheck: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`  }),
]);

export const articles = pgTable("articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	title: text().notNull(),
	authors: text().notNull(),
	summary: text(),
	category: text().default('Geral').notNull(),
	tags: text().array().default([""]),
	externalUrl: text("external_url"),
	fileUrl: text("file_url"),
	isFavorite: boolean("is_favorite").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_articles_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_articles_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_articles_org_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	pgPolicy("articles_rls", { as: "permissive", for: "all", to: ["public"], using: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`, withCheck: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`  }),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	appointmentId: uuid("appointment_id"),
	therapistId: uuid("therapist_id"),
	organizationId: uuid("organization_id"),
	sessionNumber: integer("session_number"),
	date: timestamp({ mode: 'string' }).defaultNow().notNull(),
	durationMinutes: integer("duration_minutes"),
	subjective: jsonb(),
	objective: jsonb(),
	assessment: jsonb(),
	plan: jsonb(),
	status: sessionStatus().default('draft').notNull(),
	lastAutoSaveAt: timestamp("last_auto_save_at", { mode: 'string' }),
	finalizedAt: timestamp("finalized_at", { mode: 'string' }),
	finalizedBy: uuid("finalized_by"),
	replicatedFromId: uuid("replicated_from_id"),
	pdfUrl: text("pdf_url"),
	pdfGeneratedAt: timestamp("pdf_generated_at", { mode: 'string' }),
	requiredTests: jsonb("required_tests"),
	alertsAcknowledged: boolean("alerts_acknowledged").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	firestoreId: varchar("firestore_id", { length: 255 }),
	protocolName: text("protocol_name").default(').notNull(),
	bodyPart: text("body_part").default(').notNull(),
	side: text().default('RIGHT').notNull(),
	rawForceData: jsonb("raw_force_data").default([]).notNull(),
	peakForce: doublePrecision("peak_force").default(0).notNull(),
	avgForce: doublePrecision("avg_force").default(0).notNull(),
	duration: doublePrecision().default(0).notNull(),
	rateOfForceDevelopment: doublePrecision("rate_of_force_development").default(0).notNull(),
	sensitivity: integer().default(3).notNull(),
	notes: text().default(').notNull(),
	deviceModel: text("device_model"),
	deviceFirmware: text("device_firmware"),
	deviceBattery: integer("device_battery"),
	sampleRate: integer("sample_rate"),
	measurementMode: text("measurement_mode"),
	isSimulated: boolean("is_simulated").default(false).notNull(),
	repetitions: integer(),
	totalReps: integer("total_reps"),
	avgPeakForce: doublePrecision("avg_peak_force"),
	peakForceNkg: doublePrecision("peak_force_nkg"),
	bodyWeight: doublePrecision("body_weight"),
	rfd50: doublePrecision("rfd_50"),
	rfd100: doublePrecision("rfd_100"),
	rfd200: doublePrecision("rfd_200"),
	peakForceN: doublePrecision("peak_force_n"),
	timeToPeak: doublePrecision("time_to_peak"),
}, (table) => [
	index("idx_sessions_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_sessions_patient").using("btree", table.patientId.asc().nullsLast().op("uuid_ops")),
	index("idx_sessions_patient_created").using("btree", table.patientId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "sessions_patient_id_patients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [appointments.id],
			name: "sessions_appointment_id_appointments_id_fk"
		}).onDelete("set null"),
	unique("sessions_firestore_id_key").on(table.firestoreId),
	pgPolicy("sessions_rls", { as: "permissive", for: "all", to: ["public"], using: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`, withCheck: sql`((organization_id)::text = current_setting('app.org_id'::text, true))`  }),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	fullName: text("full_name").notNull(),
	role: role().default('paciente').notNull(),
	avatarUrl: text("avatar_url"),
	phone: text(),
	specialty: text(),
	cpf: text(),
	birthDate: text("birth_date"),
	gender: gender(),
	address: jsonb(),
	fingerprintId: text("fingerprint_id"),
	fingerprintRegistered: boolean("fingerprint_registered").default(false).notNull(),
	professionalSettings: jsonb("professional_settings"),
	isActive: boolean("is_active").default(true).notNull(),
	organizationId: uuid("organization_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const accounts = pgTable("accounts", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: uuid("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}),
]);

export const authSessions = pgTable("auth_sessions", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auth_sessions_user_id_users_id_fk"
		}),
	unique("auth_sessions_token_unique").on(table.token),
]);

export const verifications = pgTable("verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const patientPredictions = pgTable("patient_predictions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	predictionType: text("prediction_type").notNull(),
	predictionDate: timestamp("prediction_date", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	features: jsonb().default({}).notNull(),
	predictedValue: numeric("predicted_value", { precision: 10, scale:  2 }),
	predictedClass: text("predicted_class"),
	confidenceScore: numeric("confidence_score", { precision: 10, scale:  4 }).default('0').notNull(),
	confidenceInterval: jsonb("confidence_interval"),
	targetDate: timestamp("target_date", { withTimezone: true, mode: 'string' }),
	timeframeDays: integer("timeframe_days"),
	modelVersion: text("model_version").default('custom').notNull(),
	modelName: text("model_name"),
	isActive: boolean("is_active").default(true).notNull(),
	milestones: jsonb().default([]).notNull(),
	riskFactors: jsonb("risk_factors").default([]).notNull(),
	treatmentRecommendations: jsonb("treatment_recommendations").default({}).notNull(),
	similarCases: jsonb("similar_cases").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_patient_predictions_org_patient_active").using("btree", table.organizationId.asc().nullsLast().op("bool_ops"), table.patientId.asc().nullsLast().op("uuid_ops"), table.isActive.asc().nullsLast().op("uuid_ops")),
	index("idx_patient_predictions_org_patient_date").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.patientId.asc().nullsLast().op("uuid_ops"), table.predictionDate.desc().nullsFirst().op("uuid_ops")),
	index("idx_patient_predictions_org_type_date").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.predictionType.asc().nullsLast().op("timestamptz_ops"), table.predictionDate.desc().nullsFirst().op("uuid_ops")),
]);

export const mlTrainingData = pgTable("ml_training_data", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientHash: text("patient_hash").notNull(),
	ageGroup: text("age_group").default('unknown').notNull(),
	gender: text().default('unknown').notNull(),
	primaryPathology: text("primary_pathology").default('unknown').notNull(),
	chronicCondition: boolean("chronic_condition").default(false).notNull(),
	baselinePainLevel: numeric("baseline_pain_level", { precision: 10, scale:  2 }).default('0').notNull(),
	baselineFunctionalScore: numeric("baseline_functional_score", { precision: 10, scale:  2 }).default('0').notNull(),
	treatmentType: text("treatment_type").default('physical_therapy').notNull(),
	sessionFrequencyWeekly: numeric("session_frequency_weekly", { precision: 10, scale:  2 }).default('0').notNull(),
	totalSessions: integer("total_sessions").default(0).notNull(),
	attendanceRate: numeric("attendance_rate", { precision: 10, scale:  4 }).default('0').notNull(),
	homeExerciseCompliance: numeric("home_exercise_compliance", { precision: 10, scale:  4 }).default('0').notNull(),
	portalLoginFrequency: numeric("portal_login_frequency", { precision: 10, scale:  4 }).default('0').notNull(),
	outcomeCategory: text("outcome_category").default('partial').notNull(),
	sessionsToDischarge: integer("sessions_to_discharge").default(0).notNull(),
	painReductionPercentage: numeric("pain_reduction_percentage", { precision: 10, scale:  2 }).default('0').notNull(),
	functionalImprovementPercentage: numeric("functional_improvement_percentage", { precision: 10, scale:  2 }).default('0').notNull(),
	patientSatisfactionScore: numeric("patient_satisfaction_score", { precision: 10, scale:  2 }).default('0').notNull(),
	dataCollectionPeriodStart: timestamp("data_collection_period_start", { withTimezone: true, mode: 'string' }),
	dataCollectionPeriodEnd: timestamp("data_collection_period_end", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ml_training_data_org_created_at").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	uniqueIndex("idx_ml_training_data_org_hash").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.patientHash.asc().nullsLast().op("uuid_ops")),
	index("idx_ml_training_data_org_pathology").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.primaryPathology.asc().nullsLast().op("uuid_ops")),
]);

export const forceSessions = pgTable("force_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	protocolName: text("protocol_name").notNull(),
	bodyPart: text("body_part").notNull(),
	side: text().default('RIGHT').notNull(),
	rawForceData: jsonb("raw_force_data").default([]).notNull(),
	peakForce: doublePrecision("peak_force").default(0).notNull(),
	avgForce: doublePrecision("avg_force").default(0).notNull(),
	duration: doublePrecision().default(0).notNull(),
	rateOfForceDevelopment: doublePrecision("rate_of_force_development").default(0).notNull(),
	sensitivity: integer().default(3).notNull(),
	notes: text().default(').notNull(),
	deviceModel: text("device_model"),
	deviceFirmware: text("device_firmware"),
	deviceBattery: integer("device_battery"),
	sampleRate: integer("sample_rate"),
	measurementMode: text("measurement_mode"),
	isSimulated: boolean("is_simulated").default(false).notNull(),
	repetitions: integer(),
	totalReps: integer("total_reps"),
	avgPeakForce: doublePrecision("avg_peak_force"),
	bodyWeight: doublePrecision("body_weight"),
	peakForceN: doublePrecision("peak_force_n"),
	peakForceNkg: doublePrecision("peak_force_nkg"),
	rfd50: doublePrecision("rfd_50"),
	rfd100: doublePrecision("rfd_100"),
	rfd200: doublePrecision("rfd_200"),
	timeToPeak: doublePrecision("time_to_peak"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_force_sessions_org_created_at").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const shopItems = pgTable("shop_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text().default(').notNull(),
	cost: integer().default(0).notNull(),
	type: text().default('consumable').notNull(),
	icon: text(),
	metadata: jsonb().default({}).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_shop_items_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	unique("shop_items_code_key").on(table.code),
	check("shop_items_type_check", sql`type = ANY (ARRAY['consumable'::text, 'cosmetic'::text, 'feature'::text])`),
]);

export const userInventory = pgTable("user_inventory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	itemId: uuid("item_id").notNull(),
	itemCode: text("item_code").notNull(),
	quantity: integer().default(1).notNull(),
	isEquipped: boolean("is_equipped").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_inventory_item_code").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.itemCode.asc().nullsLast().op("uuid_ops")),
	index("idx_user_inventory_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [shopItems.id],
			name: "user_inventory_item_id_fkey"
		}).onDelete("cascade"),
	unique("user_inventory_user_id_item_id_key").on(table.userId, table.itemId),
	check("user_inventory_quantity_check", sql`quantity >= 0`),
]);

export const exerciseVideos = pgTable("exercise_videos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	exerciseId: uuid("exercise_id"),
	organizationId: uuid("organization_id"),
	title: text().notNull(),
	description: text(),
	videoUrl: text("video_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	duration: integer(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }).default(0).notNull(),
	category: text().default('fortalecimento').notNull(),
	difficulty: text().default('iniciante').notNull(),
	bodyParts: text("body_parts").array().default([""]).notNull(),
	equipment: text().array().default([""]).notNull(),
	uploadedBy: text("uploaded_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_exercise_videos_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_exercise_videos_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_exercise_videos_difficulty").using("btree", table.difficulty.asc().nullsLast().op("text_ops")),
	index("idx_exercise_videos_exercise").using("btree", table.exerciseId.asc().nullsLast().op("uuid_ops")),
	index("idx_exercise_videos_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.exerciseId],
			foreignColumns: [exercises.id],
			name: "exercise_videos_exercise_id_fkey"
		}).onDelete("set null"),
]);

export const physicalExaminations = pgTable("physical_examinations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	recordDate: date("record_date").default(sql`CURRENT_DATE`).notNull(),
	createdBy: text("created_by"),
	vitalSigns: jsonb("vital_signs").default({}).notNull(),
	generalAppearance: text("general_appearance"),
	heent: text(),
	cardiovascular: text(),
	respiratory: text(),
	gastrointestinal: text(),
	musculoskeletal: text(),
	neurological: text(),
	integumentary: text(),
	psychological: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_physical_examinations_patient_date").using("btree", table.patientId.asc().nullsLast().op("date_ops"), table.recordDate.desc().nullsFirst().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "physical_examinations_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const treatmentPlans = pgTable("treatment_plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	recordDate: date("record_date").default(sql`CURRENT_DATE`).notNull(),
	createdBy: text("created_by"),
	diagnosis: jsonb().default([]).notNull(),
	objectives: jsonb().default([]).notNull(),
	procedures: jsonb().default([]).notNull(),
	exercises: jsonb().default([]).notNull(),
	recommendations: jsonb().default([]).notNull(),
	followUpDate: date("follow_up_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_treatment_plans_patient_date").using("btree", table.patientId.asc().nullsLast().op("date_ops"), table.recordDate.desc().nullsFirst().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "treatment_plans_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const medicalAttachments = pgTable("medical_attachments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	recordId: uuid("record_id"),
	fileName: text("file_name").notNull(),
	fileUrl: text("file_url").notNull(),
	fileType: text("file_type").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uploadedBy: text("uploaded_by"),
	category: text().default('other').notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_medical_attachments_patient_uploaded").using("btree", table.patientId.asc().nullsLast().op("timestamptz_ops"), table.uploadedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_medical_attachments_record_uploaded").using("btree", table.recordId.asc().nullsLast().op("uuid_ops"), table.uploadedAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "medical_attachments_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const nfseConfig = pgTable("nfse_config", {
	organizationId: uuid("organization_id").primaryKey().notNull(),
	ambiente: text().default('homologacao').notNull(),
	municipioCodigo: text("municipio_codigo"),
	cnpjPrestador: text("cnpj_prestador"),
	inscricaoMunicipal: text("inscricao_municipal"),
	aliquotaIss: numeric("aliquota_iss", { precision: 8, scale:  2 }).default('5').notNull(),
	autoEmissao: boolean("auto_emissao").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const nfse = pgTable("nfse", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	numero: text().notNull(),
	serie: text().default('1').notNull(),
	tipo: text().notNull(),
	valor: numeric({ precision: 12, scale:  2 }).notNull(),
	dataEmissao: timestamp("data_emissao", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	dataPrestacao: date("data_prestacao").notNull(),
	destinatario: jsonb().default({}).notNull(),
	prestador: jsonb().default({}).notNull(),
	servico: jsonb().default({}).notNull(),
	status: text().default('rascunho').notNull(),
	chaveAcesso: text("chave_acesso"),
	protocolo: text(),
	verificacao: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_nfse_org_emissao").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.dataEmissao.desc().nullsFirst().op("timestamptz_ops")),
	unique("nfse_organization_id_numero_key").on(table.organizationId, table.numero),
]);

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().default('FisioFlow Clinic').notNull(),
	slug: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const evaluationForms = pgTable("evaluation_forms", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	createdBy: text("created_by"),
	nome: text().notNull(),
	descricao: text(),
	referencias: text(),
	tipo: text().default('anamnese').notNull(),
	ativo: boolean().default(true).notNull(),
	isFavorite: boolean("is_favorite").default(false).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	coverImage: text("cover_image"),
	estimatedTime: integer("estimated_time"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_evaluation_forms_org").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const evaluationFormFields = pgTable("evaluation_form_fields", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	formId: uuid("form_id").notNull(),
	tipoCampo: text("tipo_campo").notNull(),
	label: text().notNull(),
	placeholder: text(),
	opcoes: jsonb(),
	ordem: integer().default(0).notNull(),
	obrigatorio: boolean().default(false).notNull(),
	grupo: text(),
	descricao: text(),
	minimo: numeric(),
	maximo: numeric(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_evaluation_form_fields_form").using("btree", table.formId.asc().nullsLast().op("int4_ops"), table.ordem.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [evaluationForms.id],
			name: "evaluation_form_fields_form_id_fkey"
		}).onDelete("cascade"),
]);

export const exerciseSessions = pgTable("exercise_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id"),
	exerciseId: uuid("exercise_id"),
	exerciseType: text("exercise_type"),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
	duration: integer(),
	repetitions: integer().default(0),
	completed: boolean().default(false),
	metrics: jsonb().default({}).notNull(),
	postureIssuesSummary: jsonb("posture_issues_summary").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_exercise_sessions_exercise").using("btree", table.exerciseId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_exercise_sessions_patient").using("btree", table.patientId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.exerciseId],
			foreignColumns: [exercises.id],
			name: "exercise_sessions_exercise_id_fkey"
		}).onDelete("set null"),
]);

export const timeEntries = pgTable("time_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	taskId: uuid("task_id"),
	patientId: uuid("patient_id"),
	projectId: uuid("project_id"),
	appointmentId: uuid("appointment_id"),
	description: text().default(').notNull(),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
	durationSeconds: integer("duration_seconds").default(0).notNull(),
	isBillable: boolean("is_billable").default(true).notNull(),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }),
	totalValue: numeric("total_value", { precision: 10, scale:  2 }),
	tags: text().array().default([""]).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_time_entries_org_user").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.startTime.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_time_entries_patient").using("btree", table.patientId.asc().nullsLast().op("timestamptz_ops"), table.startTime.desc().nullsFirst().op("uuid_ops")),
]);

export const timerDrafts = pgTable("timer_drafts", {
	userId: text("user_id").primaryKey().notNull(),
	timer: jsonb().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const clinicInventory = pgTable("clinic_inventory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	itemName: text("item_name").notNull(),
	category: text(),
	currentQuantity: integer("current_quantity").default(0).notNull(),
	minimumQuantity: integer("minimum_quantity").default(0).notNull(),
	unit: text().default('unidade').notNull(),
	costPerUnit: numeric("cost_per_unit", { precision: 12, scale:  2 }),
	supplier: text(),
	lastRestockDate: timestamp("last_restock_date", { withTimezone: true, mode: 'string' }),
	expirationDate: timestamp("expiration_date", { withTimezone: true, mode: 'string' }),
	location: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_clinic_inventory_org_active_name").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.isActive.asc().nullsLast().op("text_ops"), table.itemName.asc().nullsLast().op("text_ops")),
]);

export const inventoryMovements = pgTable("inventory_movements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	inventoryId: uuid("inventory_id").notNull(),
	movementType: text("movement_type").notNull(),
	quantity: integer().notNull(),
	reason: text(),
	relatedAppointmentId: uuid("related_appointment_id"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_inventory_movements_org_inventory_created").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.inventoryId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
]);

export const staffPerformanceMetrics = pgTable("staff_performance_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	therapistId: uuid("therapist_id").notNull(),
	metricDate: date("metric_date").notNull(),
	totalAppointments: integer("total_appointments").default(0).notNull(),
	completedAppointments: integer("completed_appointments").default(0).notNull(),
	cancelledAppointments: integer("cancelled_appointments").default(0).notNull(),
	noShowAppointments: integer("no_show_appointments").default(0).notNull(),
	averageSessionDuration: numeric("average_session_duration", { precision: 10, scale:  2 }),
	patientSatisfactionAvg: numeric("patient_satisfaction_avg", { precision: 10, scale:  2 }),
	revenueGenerated: numeric("revenue_generated", { precision: 12, scale:  2 }).default('0').notNull(),
	newPatients: integer("new_patients").default(0).notNull(),
	returningPatients: integer("returning_patients").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_staff_performance_org_therapist_date").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.therapistId.asc().nullsLast().op("date_ops"), table.metricDate.desc().nullsFirst().op("uuid_ops")),
]);

export const revenueForecasts = pgTable("revenue_forecasts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	forecastDate: date("forecast_date").notNull(),
	predictedRevenue: numeric("predicted_revenue", { precision: 12, scale:  2 }).default('0').notNull(),
	actualRevenue: numeric("actual_revenue", { precision: 12, scale:  2 }),
	predictedAppointments: integer("predicted_appointments").default(0).notNull(),
	actualAppointments: integer("actual_appointments"),
	confidenceIntervalLow: numeric("confidence_interval_low", { precision: 12, scale:  2 }).default('0').notNull(),
	confidenceIntervalHigh: numeric("confidence_interval_high", { precision: 12, scale:  2 }).default('0').notNull(),
	factors: jsonb().default({}).notNull(),
	modelVersion: text("model_version").default('v1').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_revenue_forecasts_org_forecast_date").using("btree", table.organizationId.asc().nullsLast().op("date_ops"), table.forecastDate.desc().nullsFirst().op("date_ops")),
]);

export const whatsappExerciseQueue = pgTable("whatsapp_exercise_queue", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	exercisePlanId: uuid("exercise_plan_id"),
	phoneNumber: text("phone_number").notNull(),
	exercises: jsonb().default([]).notNull(),
	scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: 'string' }),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	openedAt: timestamp("opened_at", { withTimezone: true, mode: 'string' }),
	status: text().default('pending').notNull(),
	errorMessage: text("error_message"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_whatsapp_exercise_queue_org_created").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const patientSelfAssessments = pgTable("patient_self_assessments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	assessmentType: text("assessment_type").notNull(),
	question: text().notNull(),
	response: text(),
	numericValue: numeric("numeric_value", { precision: 10, scale:  2 }),
	receivedVia: text("received_via").default('whatsapp').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_patient_self_assessments_org_patient_created").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.patientId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
]);

export const lgpdConsents = pgTable("lgpd_consents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	consentType: text("consent_type").notNull(),
	granted: boolean().default(false).notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	version: text().default('1.0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_lgpd_consents_user_updated").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	unique("lgpd_consents_user_type_unique").on(table.userId, table.consentType),
]);

export const wearableData = pgTable("wearable_data", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	patientId: uuid("patient_id").notNull(),
	source: text().notNull(),
	dataType: text("data_type").notNull(),
	value: numeric().notNull(),
	unit: text(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_wearable_data_patient").using("btree", table.patientId.asc().nullsLast().op("timestamptz_ops"), table.timestamp.desc().nullsFirst().op("timestamptz_ops")),
]);

export const assetAnnotations = pgTable("asset_annotations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: text("asset_id").notNull(),
	version: integer().default(1).notNull(),
	data: jsonb().default([]).notNull(),
	authorId: text("author_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_asset_annotations_asset").using("btree", table.assetId.asc().nullsLast().op("int4_ops"), table.version.desc().nullsFirst().op("int4_ops")),
	index("idx_asset_annotations_asset_version").using("btree", table.assetId.asc().nullsLast().op("int4_ops"), table.version.desc().nullsFirst().op("int4_ops")),
]);

export const documentSignatures = pgTable("document_signatures", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: text("document_id").notNull(),
	documentType: text("document_type").notNull(),
	documentTitle: text("document_title").notNull(),
	signerName: text("signer_name").notNull(),
	signerId: text("signer_id"),
	signatureImage: text("signature_image").notNull(),
	signatureHash: text("signature_hash").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	signedAt: timestamp("signed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_document_signatures_doc").using("btree", table.documentId.asc().nullsLast().op("text_ops"), table.signedAt.desc().nullsFirst().op("text_ops")),
	index("idx_document_signatures_hash").using("btree", table.documentId.asc().nullsLast().op("text_ops"), table.signatureHash.asc().nullsLast().op("text_ops")),
]);

export const treatmentCycles = pgTable("treatment_cycles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	therapistId: text("therapist_id"),
	title: text().notNull(),
	description: text(),
	status: text().default('active').notNull(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	goals: jsonb().default([]).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_treatment_cycles_patient").using("btree", table.patientId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const evolutionVersions = pgTable("evolution_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	soapRecordId: text("soap_record_id").notNull(),
	savedBy: text("saved_by").notNull(),
	changeType: text("change_type").default('auto').notNull(),
	content: jsonb().default({}).notNull(),
	savedAt: timestamp("saved_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_evolution_versions_record").using("btree", table.soapRecordId.asc().nullsLast().op("text_ops"), table.savedAt.desc().nullsFirst().op("text_ops")),
]);

export const exercisePlans = pgTable("exercise_plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	createdBy: text("created_by").notNull(),
	name: text().notNull(),
	description: text(),
	status: text().default('ativo').notNull(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_exercise_plans_patient").using("btree", table.patientId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const exercisePlanItems = pgTable("exercise_plan_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	planId: uuid("plan_id").notNull(),
	exerciseId: uuid("exercise_id"),
	orderIndex: integer("order_index").default(0).notNull(),
	sets: integer(),
	repetitions: integer(),
	duration: integer(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_exercise_plan_items_plan").using("btree", table.planId.asc().nullsLast().op("int4_ops"), table.orderIndex.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [exercisePlans.id],
			name: "exercise_plan_items_plan_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.exerciseId],
			foreignColumns: [exercises.id],
			name: "exercise_plan_items_exercise_id_fkey"
		}).onDelete("set null"),
]);

export const vouchers = pgTable("vouchers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	descricao: text(),
	tipo: text().notNull(),
	sessoes: integer(),
	validadeDias: integer("validade_dias").default(30).notNull(),
	preco: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	ativo: boolean().default(true).notNull(),
	stripePriceId: text("stripe_price_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_vouchers_org_active").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.ativo.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
]);

export const userVouchers = pgTable("user_vouchers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	userId: text("user_id").notNull(),
	voucherId: uuid("voucher_id").notNull(),
	sessoesRestantes: integer("sessoes_restantes").default(0).notNull(),
	sessoesTotais: integer("sessoes_totais").default(0).notNull(),
	dataCompra: timestamp("data_compra", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	dataExpiracao: timestamp("data_expiracao", { withTimezone: true, mode: 'string' }).notNull(),
	ativo: boolean().default(true).notNull(),
	valorPago: numeric("valor_pago", { precision: 12, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_vouchers_user_active").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.ativo.asc().nullsLast().op("bool_ops"), table.dataCompra.desc().nullsFirst().op("bool_ops")),
	foreignKey({
			columns: [table.voucherId],
			foreignColumns: [vouchers.id],
			name: "user_vouchers_voucher_id_fkey"
		}).onDelete("cascade"),
]);

export const voucherCheckoutSessions = pgTable("voucher_checkout_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	userId: text("user_id").notNull(),
	voucherId: uuid("voucher_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	status: text().default('pending').notNull(),
	userVoucherId: uuid("user_voucher_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_voucher_checkout_sessions_user_status").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.voucherId],
			foreignColumns: [vouchers.id],
			name: "voucher_checkout_sessions_voucher_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userVoucherId],
			foreignColumns: [userVouchers.id],
			name: "voucher_checkout_sessions_user_voucher_id_fkey"
		}).onDelete("set null"),
]);

export const eventoTemplates = pgTable("evento_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	nome: text().notNull(),
	descricao: text(),
	categoria: text(),
	gratuito: boolean().default(false).notNull(),
	valorPadraoPrestador: numeric("valor_padrao_prestador", { precision: 12, scale:  2 }),
	checklistPadrao: jsonb("checklist_padrao").default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_evento_templates_org_created").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const standardizedTestResults = pgTable("standardized_test_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	testType: text("test_type").notNull(),
	testName: text("test_name").notNull(),
	score: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	maxScore: numeric("max_score", { precision: 10, scale:  2 }).default('0').notNull(),
	interpretation: text(),
	answers: jsonb().default({}).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_standardized_test_results_patient_created").using("btree", table.patientId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "standardized_test_results_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const patientEvaluationResponses = pgTable("patient_evaluation_responses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	patientId: uuid("patient_id").notNull(),
	formId: uuid("form_id").notNull(),
	appointmentId: uuid("appointment_id"),
	responses: jsonb().default({}).notNull(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_patient_evaluation_responses_form").using("btree", table.formId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_patient_evaluation_responses_patient").using("btree", table.patientId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_evaluation_responses_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [evaluationForms.id],
			name: "patient_evaluation_responses_form_id_fkey"
		}).onDelete("cascade"),
]);

export const activityLabClinicProfiles = pgTable("activity_lab_clinic_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	clinicName: varchar("clinic_name", { length: 150 }).notNull(),
	professionalName: varchar("professional_name", { length: 150 }),
	registrationNumber: varchar("registration_number", { length: 80 }),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_activity_lab_clinic_profiles_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "activity_lab_clinic_profiles_organization_id_fkey"
		}).onDelete("cascade"),
	unique("activity_lab_clinic_profiles_organization_id_key").on(table.organizationId),
]);

export const activityLabSessions = pgTable("activity_lab_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	protocolName: varchar("protocol_name", { length: 160 }).notNull(),
	bodyPart: varchar("body_part", { length: 120 }).notNull(),
	side: varchar({ length: 10 }).default('LEFT').notNull(),
	testType: varchar("test_type", { length: 40 }).default('isometric').notNull(),
	peakForce: numeric("peak_force", { precision: 10, scale:  2 }).default('0').notNull(),
	avgForce: numeric("avg_force", { precision: 10, scale:  2 }).default('0').notNull(),
	duration: integer().default(0).notNull(),
	rfd: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	sensitivity: integer().default(3).notNull(),
	rawForceData: jsonb("raw_force_data").default([]).notNull(),
	sampleRate: integer("sample_rate").default(80).notNull(),
	deviceModel: varchar("device_model", { length: 120 }).default('Tindeq').notNull(),
	deviceFirmware: varchar("device_firmware", { length: 120 }).default(').notNull(),
	deviceBattery: integer("device_battery").default(0).notNull(),
	measurementMode: varchar("measurement_mode", { length: 40 }).default('isometric').notNull(),
	isSimulated: boolean("is_simulated").default(false).notNull(),
	notes: text().default(').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_activity_lab_sessions_org_created").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_activity_lab_sessions_org_patient_created").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.patientId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "activity_lab_sessions_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "activity_lab_sessions_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const knowledgeAnnotations = pgTable("knowledge_annotations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	articleId: text("article_id").notNull(),
	scope: text().notNull(),
	scopeKey: text("scope_key").notNull(),
	userId: uuid("user_id"),
	highlights: jsonb().default([]).notNull(),
	observations: jsonb().default([]).notNull(),
	status: text(),
	evidence: text(),
	createdBy: uuid("created_by").notNull(),
	updatedBy: uuid("updated_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_knowledge_annotations_org_scope_user").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.scope.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("text_ops"), table.updatedAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "knowledge_annotations_organization_id_fkey"
		}).onDelete("cascade"),
	unique("knowledge_annotations_organization_id_article_id_scope_scop_key").on(table.organizationId, table.articleId, table.scope, table.scopeKey),
	check("knowledge_annotations_scope_check", sql`scope = ANY (ARRAY['organization'::text, 'user'::text])`),
]);

export const knowledgeCuration = pgTable("knowledge_curation", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	articleId: text("article_id").notNull(),
	status: text().default('pending').notNull(),
	notes: text(),
	assignedTo: uuid("assigned_to"),
	createdBy: uuid("created_by").notNull(),
	updatedBy: uuid("updated_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_knowledge_curation_org_updated").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "knowledge_curation_organization_id_fkey"
		}).onDelete("cascade"),
	unique("knowledge_curation_organization_id_article_id_key").on(table.organizationId, table.articleId),
]);

export const marketingConsents = pgTable("marketing_consents", {
	patientId: uuid("patient_id").primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	socialMedia: boolean("social_media").default(false).notNull(),
	educationalMaterial: boolean("educational_material").default(false).notNull(),
	website: boolean().default(false).notNull(),
	signedAt: timestamp("signed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	signedBy: text("signed_by").notNull(),
	signatureIp: text("signature_ip"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_marketing_consents_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "marketing_consents_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "marketing_consents_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const knowledgeAudit = pgTable("knowledge_audit", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	articleId: text("article_id").notNull(),
	actorId: uuid("actor_id").notNull(),
	action: text().notNull(),
	before: jsonb(),
	after: jsonb(),
	context: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_knowledge_audit_org_created").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "knowledge_audit_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const marketingExports = pgTable("marketing_exports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	exportType: text("export_type").default('video_comparison').notNull(),
	filePath: text("file_path").notNull(),
	fileUrl: text("file_url").notNull(),
	isAnonymized: boolean("is_anonymized").default(true).notNull(),
	metricsOverlay: jsonb("metrics_overlay").default([]).notNull(),
	assetAId: text("asset_a_id"),
	assetBId: text("asset_b_id"),
	deleted: boolean().default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_marketing_exports_org_created").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_marketing_exports_patient").using("btree", table.patientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "marketing_exports_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "marketing_exports_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const marketingReviewConfigs = pgTable("marketing_review_configs", {
	organizationId: uuid("organization_id").primaryKey().notNull(),
	enabled: boolean().default(false).notNull(),
	triggerStatus: jsonb("trigger_status").default(["alta","concluido"]).notNull(),
	messageTemplate: text("message_template").default(').notNull(),
	delayHours: integer("delay_hours").default(24).notNull(),
	googlePlaceId: text("google_place_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "marketing_review_configs_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const marketingBirthdayConfigs = pgTable("marketing_birthday_configs", {
	organizationId: uuid("organization_id").primaryKey().notNull(),
	enabled: boolean().default(false).notNull(),
	messageTemplate: text("message_template").default(').notNull(),
	sendWhatsapp: boolean("send_whatsapp").default(true).notNull(),
	sendEmail: boolean("send_email").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "marketing_birthday_configs_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const marketingRecallCampaigns = pgTable("marketing_recall_campaigns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	description: text().default(').notNull(),
	daysWithoutVisit: integer("days_without_visit").default(180).notNull(),
	messageTemplate: text("message_template").default(').notNull(),
	enabled: boolean().default(true).notNull(),
	deleted: boolean().default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_marketing_recall_campaigns_org").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "marketing_recall_campaigns_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const referralCodes = pgTable("referral_codes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	code: text().notNull(),
	rewardType: text("reward_type").notNull(),
	rewardValue: numeric("reward_value", { precision: 12, scale:  2 }).default('0').notNull(),
	referrerReward: jsonb("referrer_reward"),
	uses: integer().default(0).notNull(),
	maxUses: integer("max_uses"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_referral_codes_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_referral_codes_patient").using("btree", table.patientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "referral_codes_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "referral_codes_organization_id_fkey"
		}).onDelete("cascade"),
	unique("referral_codes_code_key").on(table.code),
]);

export const referralRedemptions = pgTable("referral_redemptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	referralId: uuid("referral_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	referrerPatientId: uuid("referrer_patient_id").notNull(),
	newPatientId: uuid("new_patient_id").notNull(),
	redeemedAt: timestamp("redeemed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_referral_redemptions_org").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.redeemedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_referral_redemptions_referrer").using("btree", table.referrerPatientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.referralId],
			foreignColumns: [referralCodes.id],
			name: "referral_redemptions_referral_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "referral_redemptions_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.referrerPatientId],
			foreignColumns: [patients.id],
			name: "referral_redemptions_referrer_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.newPatientId],
			foreignColumns: [patients.id],
			name: "referral_redemptions_new_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const fisioLinks = pgTable("fisio_links", {
	organizationId: uuid("organization_id").primaryKey().notNull(),
	slug: text().notNull(),
	whatsappNumber: text("whatsapp_number"),
	googleMapsUrl: text("google_maps_url"),
	phone: text(),
	showBeforeAfter: boolean("show_before_after").default(true).notNull(),
	showReviews: boolean("show_reviews").default(true).notNull(),
	customMessage: text("custom_message"),
	theme: text().default('clinical').notNull(),
	primaryColor: text("primary_color").default('#3b82f6').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "fisio_links_organization_id_fkey"
		}).onDelete("cascade"),
	unique("fisio_links_slug_key").on(table.slug),
]);

export const fisioLinkAnalytics = pgTable("fisio_link_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	slug: text().notNull(),
	button: text().notNull(),
	clickedAt: timestamp("clicked_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_fisio_link_analytics_slug_clicked").using("btree", table.slug.asc().nullsLast().op("text_ops"), table.clickedAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "fisio_link_analytics_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const satisfactionSurveys = pgTable("satisfaction_surveys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id"),
	appointmentId: uuid("appointment_id"),
	therapistId: text("therapist_id"),
	npsScore: integer("nps_score"),
	qCareQuality: integer("q_care_quality"),
	qProfessionalism: integer("q_professionalism"),
	qFacilityCleanliness: integer("q_facility_cleanliness"),
	qSchedulingEase: integer("q_scheduling_ease"),
	qCommunication: integer("q_communication"),
	comments: text(),
	suggestions: text(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
	responseTimeHours: numeric("response_time_hours", { precision: 6, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_satisfaction_surveys_org").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_satisfaction_surveys_patient").using("btree", table.patientId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
]);

export const contentCalendar = pgTable("content_calendar", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	title: text().notNull(),
	description: text().default(').notNull(),
	type: text().notNull(),
	status: text().default('idea').notNull(),
	date: date(),
	hashtags: text(),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_content_calendar_org_date").using("btree", table.organizationId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops"), table.createdAt.desc().nullsFirst().op("date_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "content_calendar_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const knowledgeArticles = pgTable("knowledge_articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	articleId: text("article_id").notNull(),
	title: text().notNull(),
	group: text().notNull(),
	subgroup: text().default(').notNull(),
	focus: jsonb().default([]).notNull(),
	evidence: text().default('B').notNull(),
	year: integer(),
	source: text(),
	url: text(),
	tags: jsonb().default([]).notNull(),
	status: text().default('pending').notNull(),
	highlights: jsonb().default([]).notNull(),
	observations: jsonb().default([]).notNull(),
	keyQuestions: jsonb("key_questions").default([]).notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	articleType: text("article_type").default('pdf').notNull(),
	metadata: jsonb().default({}).notNull(),
	summary: text(),
	clinicalImplications: jsonb("clinical_implications").default([]).notNull(),
	vectorStatus: text("vector_status").default('pending').notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	citationCount: integer("citation_count"),
	rawText: text("raw_text"),
}, (table) => [
	index("idx_knowledge_articles_org_updated").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "knowledge_articles_organization_id_fkey"
		}).onDelete("cascade"),
	unique("knowledge_articles_organization_id_article_id_key").on(table.organizationId, table.articleId),
]);

export const knowledgeNotes = pgTable("knowledge_notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	articleId: text("article_id").notNull(),
	userId: uuid("user_id").notNull(),
	content: text().notNull(),
	pageRef: integer("page_ref"),
	highlightColor: text("highlight_color"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_knowledge_notes_article_user_created").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.articleId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "knowledge_notes_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const tarefas = pgTable("tarefas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	createdBy: text("created_by").notNull(),
	responsavelId: text("responsavel_id"),
	projectId: uuid("project_id"),
	parentId: uuid("parent_id"),
	titulo: text().notNull(),
	descricao: text(),
	status: text().default('A_FAZER').notNull(),
	prioridade: text().default('MEDIA').notNull(),
	tipo: text().default('TAREFA').notNull(),
	dataVencimento: timestamp("data_vencimento", { withTimezone: true, mode: 'string' }),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	orderIndex: integer("order_index").default(0).notNull(),
	tags: text().array().default([""]).notNull(),
	checklists: jsonb().default([]).notNull(),
	attachments: jsonb().default([]).notNull(),
	taskReferences: jsonb("task_references").default([]).notNull(),
	dependencies: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_tarefas_org_status").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("uuid_ops"), table.orderIndex.asc().nullsLast().op("text_ops")),
	index("idx_tarefas_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops"), table.orderIndex.asc().nullsLast().op("uuid_ops")),
]);

export const userInvitations = pgTable("user_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	email: text().notNull(),
	role: text().default('fisioterapeuta').notNull(),
	token: text().notNull(),
	invitedBy: text("invited_by").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_invitations_email").using("btree", table.email.asc().nullsLast().op("text_ops"), table.usedAt.asc().nullsLast().op("text_ops")),
	index("idx_user_invitations_org").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	unique("user_invitations_token_key").on(table.token),
]);

export const wikiCategories = pgTable("wiki_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	icon: text(),
	color: text(),
	parentId: uuid("parent_id"),
	orderIndex: integer("order_index").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_wiki_categories_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.orderIndex.asc().nullsLast().op("int4_ops")),
	unique("wiki_categories_organization_id_slug_key").on(table.organizationId, table.slug),
]);

export const wikiComments = pgTable("wiki_comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	pageId: uuid("page_id").notNull(),
	parentCommentId: uuid("parent_comment_id"),
	content: text().notNull(),
	createdBy: text("created_by").notNull(),
	blockId: text("block_id"),
	selectionText: text("selection_text"),
	selectionStart: integer("selection_start"),
	selectionEnd: integer("selection_end"),
	resolved: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_wiki_comments_page").using("btree", table.pageId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const wikiTriageEvents = pgTable("wiki_triage_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	pageId: uuid("page_id").notNull(),
	changedBy: text("changed_by").notNull(),
	eventType: text("event_type").default('reorder').notNull(),
	fromCategory: text("from_category"),
	toCategory: text("to_category"),
	fromOrder: integer("from_order"),
	toOrder: integer("to_order"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_wiki_triage_events_org").using("btree", table.organizationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);
