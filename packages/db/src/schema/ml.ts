import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { withOrganizationPolicy } from "./rls_helper";

/**
 * Tabela principal de Risco do Paciente (Atualizada diariamente)
 */
export const patientRiskScores = pgTable(
  "patient_risk_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id)
      .unique(), // 1 para 1 com o paciente no snapshot atual

    // Scores (0-100)
    noShowRisk: integer("no_show_risk").default(0).notNull(),
    dropoutRisk: integer("dropout_risk").default(0).notNull(),
    nonAdherenceRisk: integer("non_adherence_risk").default(0).notNull(),
    
    // Flags Derivadas
    needsActiveContact: integer("needs_active_contact").default(0), // booleano simulado 0/1

    // Features calculadas que baseiam o score (auditáveis)
    features: jsonb("features").$type<{
      recentNoShows: number;
      recentCancellations: number;
      sessionsWithoutEvolution: number;
      daysSinceLastSession: number;
      hasFutureSession: boolean;
      painVariation: number;
      totalSessions: number;
    }>().notNull(),

    // Ultima vez que a IA explicou este risco (para evitar spam)
    lastAiExplanationAt: timestamp("last_ai_explanation_at"),
    lastAiExplanation: text("last_ai_explanation"),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    withOrganizationPolicy("patient_risk_scores", table.organizationId),
  ]
);

/**
 * Histórico de eventos que alteraram o risco de forma significativa
 */
export const patientRiskScoreEvents = pgTable(
  "patient_risk_score_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
      
    eventType: text("event_type", { enum: ["no_show_spike", "dropout_warning", "adherence_drop", "recovered"] }).notNull(),
    previousScore: integer("previous_score").notNull(),
    newScore: integer("new_score").notNull(),
    reason: text("reason"), // ex: "3 faltas consecutivas"

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_risk_events_patient").on(table.patientId),
    withOrganizationPolicy("patient_risk_score_events", table.organizationId),
  ]
);
