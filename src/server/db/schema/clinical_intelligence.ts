import {
	pgTable,
	uuid,
	text,
	timestamp,
	numeric,
	jsonb,
	integer,
	index,
	customType,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { sessions } from "./sessions";
import { withOrganizationPolicy } from "./rls_helper";

// Definição do tipo Vector para pgvector
const vector = customType<{ data: number[] }>({
	dataType() {
		return "vector(1536)"; // Dimensão compatível com OpenAI/Gemini
	},
});

/**
 * Clinical Embeddings (Semantic Search)
 * Armazena a representação vetorial das evoluções clínicas.
 */
export const clinicalEmbeddings = pgTable(
	"clinical_embeddings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id").notNull(),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		evolutionId: uuid("evolution_id")
			.notNull()
			.references(() => sessions.id)
			.unique(),
		
		embedding: vector("embedding"),
		contentSummary: text("content_summary"), // Texto resumido usado para o embedding
		
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_clinical_embedding_patient").on(table.patientId),
		withOrganizationPolicy("clinical_embeddings", table.organizationId),
	],
);

/**
 * Patient Longitudinal Summary (Digital Twin)
 * Armazena a trajetória preditiva e atual do paciente para IA.
 */
export const patientLongitudinalSummary = pgTable(
	"patient_longitudinal_summary",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id").notNull(),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		
		// Segmentação por IA
		clusterId: text("cluster_id"), // LCA, Dor Lombar Crônica, etc.
		aiRiskLevel: text("ai_risk_level", { enum: ["low", "medium", "high"] }).default("low"),
		
		// Predições
		predictedRecoveryWeeks: integer("predicted_recovery_weeks"),
		confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
		
		// Métricas de Engajamento
		adherenceScore: numeric("adherence_score", { precision: 5, scale: 2 }),
		lastAiAssessmentAt: timestamp("last_ai_assessment_at"),
		
		metadata: jsonb("metadata").$type<{
			similarCasesCount?: number;
			keyRecoveryFactors?: string[];
		}>(),
		
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_longitudinal_patient").on(table.patientId),
		withOrganizationPolicy("patient_longitudinal_summary", table.organizationId),
	],
);

/**
 * Clinical Reasoning Logs (Deep Reasoning)
 * Registra o "pensamento" da IA por trás de cada conduta sugerida.
 */
export const clinicalReasoningLogs = pgTable(
	"clinical_reasoning_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id").notNull(),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		evolutionId: uuid("evolution_id").references(() => sessions.id),
		
		// O "Pensamento"
		rationale: text("rationale").notNull(), 
		suggestedDiagnosis: text("suggested_diagnosis"),
		evidenceReferences: jsonb("evidence_references").$type<Array<{
			title: string;
			url?: string;
			relevance: string;
		}>>(),
		
		confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
		therapistFeedback: text("therapist_feedback", { enum: ["accepted", "rejected", "modified"] }),
		
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_reasoning_patient").on(table.patientId),
		index("idx_reasoning_evolution").on(table.evolutionId),
		withOrganizationPolicy("clinical_reasoning_logs", table.organizationId),
	],
);
