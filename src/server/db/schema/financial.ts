import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	numeric,
	jsonb,
	date,
	boolean,
	integer,
	pgEnum,
	index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { withOrganizationPolicy } from "./rls_helper";
import { organizations } from "./organizations";
import { patients } from "./patients";

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
	dreCategoria: varchar("dre_categoria", { length: 100 }),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
	metadata: jsonb("metadata").default({}),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("transacoes", table.organizationId)]);

export const contasFinanceiras = pgTable("contas_financeiras", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	tipo: text("tipo").notNull(),
	valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
	status: text("status").notNull().default("pendente"),
	descricao: text("descricao"),
	dataVencimento: date("data_vencimento"),
	pagoEm: date("pago_em"),
	patientId: uuid("patient_id"),
	appointmentId: uuid("appointment_id"),
	categoria: text("categoria"),
	formaPagamento: text("forma_pagamento"),
	observacoes: text("observacoes"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("idx_contas_financeiras_org_patient").on(table.organizationId, table.patientId),
	withOrganizationPolicy("contas_financeiras", table.organizationId)
]);

export const centrosCusto = pgTable("centros_custo", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	descricao: text("descricao"),
	codigo: varchar("codigo", { length: 50 }),
	ativo: boolean("ativo").default(true),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("centros_custo", table.organizationId)]);

export const convenios = pgTable("convenios", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	cnpj: varchar("cnpj", { length: 20 }),
	telefone: varchar("telefone", { length: 20 }),
	email: varchar("email", { length: 255 }),
	contatoResponsavel: varchar("contato_responsavel", { length: 255 }),
	valorRepasse: numeric("valor_repasse", { precision: 12, scale: 2 }),
	prazoPagamentoDias: integer("prazo_pagamento_dias"),
	observacoes: text("observacoes"),
	ativo: boolean("ativo").default(true),
	registroAns: varchar("registro_ans", { length: 50 }),
	tabelaPrecos: jsonb("tabela_precos").default({}),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("convenios", table.organizationId)]);

export const pagamentos = pgTable("pagamentos", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	eventoId: uuid("evento_id"),
	appointmentId: uuid("appointment_id"),
	patientId: uuid("patient_id"),
	valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
	formaPagamento: text("forma_pagamento"),
	status: text("status").notNull().default("paid"),
	pagoEm: date("pago_em"),
	observacoes: text("observacoes"),
	metadata: jsonb("metadata").notNull().default({}),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("pagamentos", table.organizationId)]);

export const empresasParceiras = pgTable("empresas_parceiras", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: text("nome").notNull(),
	contato: text("contato"),
	email: text("email"),
	telefone: text("telefone"),
	contrapartidas: text("contrapartidas"),
	observacoes: text("observacoes"),
	ativo: boolean("ativo").default(true),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("empresas_parceiras", table.organizationId)]);

export const fornecedores = pgTable("fornecedores", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	tipoPessoa: text("tipo_pessoa").notNull().default("pj"),
	razaoSocial: text("razao_social").notNull(),
	nomeFantasia: text("nome_fantasia"),
	cpfCnpj: text("cpf_cnpj"),
	inscricaoEstadual: text("inscricao_estadual"),
	email: text("email"),
	telefone: text("telefone"),
	celular: text("celular"),
	endereco: text("endereco"),
	cidade: text("cidade"),
	estado: text("estado"),
	cep: text("cep"),
	observacoes: text("observacoes"),
	categoria: text("categoria"),
	ativo: varchar("ativo", { length: 10 }).default("true"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("fornecedores", table.organizationId)]);

export const formasPagamento = pgTable("formas_pagamento", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	tipo: varchar("tipo", { length: 50 }).default("geral"),
	taxaPercentual: numeric("taxa_percentual", { precision: 5, scale: 2 }).default("0"),
	diasRecebimento: integer("dias_recebimento").default(0),
	ativo: boolean("ativo").default(true),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("formas_pagamento", table.organizationId)]);

export const sessionPackageTemplates = pgTable("session_package_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	sessionsCount: integer("sessions_count").notNull(),
	price: numeric("price", { precision: 12, scale: 2 }).notNull(),
	validityDays: integer("validity_days").default(365),
	isActive: boolean("is_active").default(true),
	createdBy: text("created_by"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("session_package_templates", table.organizationId)]);

export const packageStatusEnum = pgEnum("package_status", [
	"active",
	"expired",
	"used",
	"cancelled",
]);

export const patientPackages = pgTable(
	"patient_packages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.references(() => organizations.id)
			.notNull(),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		packageTemplateId: uuid("package_template_id").references(() => sessionPackageTemplates.id),
		name: varchar("name", { length: 255 }).notNull(),
		totalSessions: integer("total_sessions").notNull(),
		usedSessions: integer("used_sessions").default(0).notNull(),
		remainingSessions: integer("remaining_sessions").notNull(),
		price: numeric("price", { precision: 12, scale: 2 }).notNull(),
		paymentMethod: varchar("payment_method", { length: 100 }),
		status: packageStatusEnum("status").default("active"),
		purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow().notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
		createdBy: text("created_by"),
		deletedAt: timestamp("deleted_at"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_patient_packages_patient_id").on(table.patientId),
		index("idx_patient_packages_status").on(table.status),
		withOrganizationPolicy("patient_packages", table.organizationId),
	],
);

export const patientPackagesRelations = relations(
	patientPackages,
	({ one }) => ({
		patient: one(patients, {
			fields: [patientPackages.patientId],
			references: [patients.id],
		}),
	}),
);

export const packageUsage = pgTable("package_usage", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	patientPackageId: uuid("patient_package_id").references(() => patientPackages.id),
	patientId: uuid("patient_id").notNull(),
	appointmentId: uuid("appointment_id"),
	usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
	createdBy: text("created_by"),
}, (table) => [withOrganizationPolicy("package_usage", table.organizationId)]);

export const vouchers = pgTable("vouchers", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	descricao: text("descricao"),
	tipo: varchar("tipo", { length: 50 }).notNull(),
	sessoes: integer("sessoes"),
	validadeDias: integer("validade_dias").default(30),
	preco: numeric("preco", { precision: 12, scale: 2 }).notNull(),
	ativo: boolean("ativo").default(true),
	stripePriceId: varchar("stripe_price_id", { length: 255 }),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("vouchers", table.organizationId)]);

export const userVouchers = pgTable("user_vouchers", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	userId: text("user_id").notNull(),
	voucherId: uuid("voucher_id")
		.references(() => vouchers.id)
		.notNull(),
	sessoesRestantes: integer("sessoes_restantes").notNull(),
	sessoesTotais: integer("sessoes_totais").notNull(),
	dataCompra: timestamp("data_compra", { withTimezone: true }).defaultNow().notNull(),
	dataExpiracao: timestamp("data_expiracao", { withTimezone: true }),
	ativo: boolean("ativo").default(true),
	valorPago: numeric("valor_pago", { precision: 12, scale: 2 }).notNull(),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("user_vouchers", table.organizationId)]);

export const voucherCheckoutSessions = pgTable("voucher_checkout_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	userId: text("user_id").notNull(),
	voucherId: uuid("voucher_id")
		.references(() => vouchers.id)
		.notNull(),
	amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
	status: varchar("status", { length: 50 }).default("pending"),
	userVoucherId: uuid("user_voucher_id"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("voucher_checkout_sessions", table.organizationId)]);

export const nfse = pgTable("nfse", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	numero: varchar("numero", { length: 50 }).notNull(),
	serie: varchar("serie", { length: 20 }).default("1"),
	tipo: varchar("tipo", { length: 20 }).default("saida"),
	valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
	dataEmissao: timestamp("data_emissao", { withTimezone: true }).defaultNow().notNull(),
	dataPrestacao: timestamp("data_prestacao", { withTimezone: true }),
	destinatario: jsonb("destinatario").default({}),
	prestador: jsonb("prestador").default({}),
	servico: jsonb("servico").default({}),
	status: varchar("status", { length: 50 }).default("rascunho"),
	chaveAcesso: varchar("chave_acesso", { length: 100 }),
	protocolo: varchar("protocolo", { length: 100 }),
	verificacao: varchar("verificacao", { length: 100 }),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("nfse", table.organizationId)]);
export const nfseConfig = pgTable("nfse_config", {
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.primaryKey()
		.notNull(),
	ambiente: varchar("ambiente", { length: 50 }).default("homologacao"),
	municipioCodigo: varchar("municipio_codigo", { length: 20 }),
	cnpjPrestador: varchar("cnpj_prestador", { length: 20 }),
	inscricaoMunicipal: varchar("inscricao_municipal", { length: 20 }),
	aliquotaIss: numeric("aliquota_iss", { precision: 5, scale: 2 }),
	autoEmissao: boolean("auto_emissao").default(false),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [withOrganizationPolicy("nfse_config", table.organizationId)]);

export const vouchersRelations = relations(vouchers, ({ many }) => ({
	userVouchers: many(userVouchers),
	checkoutSessions: many(voucherCheckoutSessions),
}));

export const userVouchersRelations = relations(userVouchers, ({ one }) => ({
	organization: one(organizations, {
		fields: [userVouchers.organizationId],
		references: [organizations.id],
	}),
	voucher: one(vouchers, {
		fields: [userVouchers.voucherId],
		references: [vouchers.id],
	}),
}));

export const voucherCheckoutSessionsRelations = relations(voucherCheckoutSessions, ({ one }) => ({
	organization: one(organizations, {
		fields: [voucherCheckoutSessions.organizationId],
		references: [organizations.id],
	}),
	voucher: one(vouchers, {
		fields: [voucherCheckoutSessions.voucherId],
		references: [vouchers.id],
	}),
	userVoucher: one(userVouchers, {
		fields: [voucherCheckoutSessions.userVoucherId],
		references: [userVouchers.id],
	}),
}));

export const nfseRelations = relations(nfse, ({ one }) => ({
	organization: one(organizations, {
		fields: [nfse.organizationId],
		references: [organizations.id],
	}),
}));

export const nfseConfigRelations = relations(nfseConfig, ({ one }) => ({
	organization: one(organizations, {
		fields: [nfseConfig.organizationId],
		references: [organizations.id],
	}),
}));
