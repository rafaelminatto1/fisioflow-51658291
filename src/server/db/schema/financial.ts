import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	numeric,
	jsonb,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const transacoes = pgTable("transacoes", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	userId: text("user_id"),
	tipo: varchar("tipo", { length: 50 }).notNull(), // 'receita', 'despesa', etc.
	valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
	descricao: text("descricao"),
	status: varchar("status", { length: 50 }).default("pendente"),
	categoria: varchar("categoria", { length: 100 }),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
	metadata: jsonb("metadata").default({}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contas = pgTable("contas", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	tipo: varchar("tipo", { length: 50 }), // 'corrente', 'poupanca', 'caixa', etc.
	saldoInicial: numeric("saldo_inicial", { precision: 12, scale: 2 }).default(
		"0",
	),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const centrosCusto = pgTable("centros_custo", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	codigo: varchar("codigo", { length: 50 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const convenios = pgTable("convenios", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	registroAns: varchar("registro_ans", { length: 50 }),
	tabelaPrecos: jsonb("tabela_precos").default({}),
	isActive: varchar("is_active", { length: 10 }).default("true"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
