import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	index,
	foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

/**
 * Leads - Potenciais clientes (RF05)
 */
export const leads = pgTable(
	"leads",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		nome: text("nome").notNull(),
		telefone: text("telefone"),
		email: text("email"),
		origem: text("origem"),
		estagio: text("estagio").notNull().default("aguardando"),
		responsavelId: text("responsavel_id"), // UID do Clerk/Auth
		dataPrimeiroContato: timestamp("data_primeiro_contato", { withTimezone: true }),
		dataUltimoContato: timestamp("data_ultimo_contato", { withTimezone: true }),
		interesse: text("interesse"),
		observacoes: text("observacoes"),
		motivoNaoEfetivacao: text("motivo_nao_efetivacao"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		orgIdx: index("idx_leads_org").on(table.organizationId),
	}),
);

/**
 * Histórico de interações com o lead
 */
export const leadHistorico = pgTable(
	"lead_historico",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		leadId: uuid("lead_id")
			.notNull()
			.references(() => leads.id, { onDelete: "cascade" }),
		tipoContato: text("tipo_contato"),
		descricao: text("descricao"),
		resultado: text("resultado"),
		proximoContato: timestamp("proximo_contato", { withTimezone: true }),
		createdBy: text("created_by"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		leadIdx: index("idx_lead_hist_lead").on(table.leadId),
	}),
);

/**
 * Tarefas do CRM vinculadas a leads
 */
export const crmTarefas = pgTable(
	"crm_tarefas",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		titulo: text("titulo").notNull(),
		descricao: text("descricao"),
		status: text("status").notNull().default("pendente"),
		responsavelId: text("responsavel_id"),
		leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
		dueDate: timestamp("due_date", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		orgIdx: index("idx_crm_tasks_org").on(table.organizationId),
		leadIdx: index("idx_crm_tasks_lead").on(table.leadId),
	}),
);

/**
 * Campanhas de Marketing (RF05.3)
 */
export const crmCampanhas = pgTable(
	"crm_campanhas",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		createdBy: text("created_by"),
		nome: text("nome").notNull(),
		tipo: text("tipo").notNull(), // email, whatsapp, etc
		conteudo: text("conteudo"),
		status: text("status").default("concluida"),
		totalDestinatarios: integer("total_destinatarios").default(0),
		totalEnviados: integer("total_enviados").default(0),
		agendadaEm: timestamp("agendada_em", { withTimezone: true }),
		concluidaEm: timestamp("concluida_em", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
);

/**
 * Registro de envios individuais de campanhas
 */
export const crmCampanhaEnvios = pgTable(
	"crm_campanha_envios",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		campanhaId: uuid("campanha_id")
			.notNull()
			.references(() => crmCampanhas.id, { onDelete: "cascade" }),
		patientId: uuid("patient_id"), // Pode ser nulo se for lead externo
		canal: text("canal"),
		status: text("status").default("enviado"),
		enviadoEm: timestamp("enviado_em", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
);

// --- RELATIONS ---

export const leadsRelations = relations(leads, ({ many }) => ({
	historico: many(leadHistorico),
	tarefas: many(crmTarefas),
}));

export const leadHistoricoRelations = relations(leadHistorico, ({ one }) => ({
	lead: one(leads, {
		fields: [leadHistorico.leadId],
		references: [leads.id],
	}),
}));

export const crmTarefasRelations = relations(crmTarefas, ({ one }) => ({
	lead: one(leads, {
		fields: [crmTarefas.leadId],
		references: [leads.id],
	}),
}));

export const crmCampanhasRelations = relations(crmCampanhas, ({ many }) => ({
	envios: many(crmCampanhaEnvios),
}));

export const crmCampanhaEnviosRelations = relations(crmCampanhaEnvios, ({ one }) => ({
	campanha: one(crmCampanhas, {
		fields: [crmCampanhaEnvios.campanhaId],
		references: [crmCampanhas.id],
	}),
}));
