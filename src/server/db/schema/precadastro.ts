import {
	pgTable,
	uuid,
	text,
	boolean,
	integer,
	timestamp,
	jsonb,
	date,
	index,
} from "drizzle-orm/pg-core";
import { withOrganizationPolicy, withPublicWriteOrganizationPolicy } from "./rls_helper";

export const precadastroTokens = pgTable(
	"precadastro_tokens",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id").notNull(),
		nome: text("nome").notNull(),
		descricao: text("descricao"),
		token: text("token").notNull().unique(),
		ativo: boolean("ativo").default(true).notNull(),
		maxUsos: integer("max_usos"),
		usosAtuais: integer("usos_atuais").default(0).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		camposObrigatorios: text("campos_obrigatorios")
			.array()
			.notNull()
			.default(["nome", "email"]),
		camposOpcionais: text("campos_opcionais")
			.array()
			.notNull()
			.default(["telefone"]),
		uiStyle: jsonb("ui_style").default({}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orgCreatedIdx: index("idx_precadastro_tokens_org_created").on(
			table.organizationId,
			table.createdAt,
		),
		tokenIdx: index("idx_precadastro_tokens_token").on(table.token),
	}),
	(table) => [withOrganizationPolicy("precadastro_tokens", table.organizationId)],
);

export const precadastros = pgTable(
	"precadastros",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tokenId: uuid("token_id")
			.notNull()
			.references(() => precadastroTokens.id, { onDelete: "cascade" }),
		organizationId: uuid("organization_id").notNull(),
		nome: text("nome").notNull(),
		email: text("email"),
		telefone: text("telefone"),
		dataNascimento: date("data_nascimento"),
		endereco: text("endereco"),
		observacoes: text("observacoes"),
		status: text("status").default("pendente").notNull(),
		convertedAt: timestamp("converted_at", { withTimezone: true }),
		patientId: uuid("patient_id"),
		dadosAdicionais: jsonb("dados_adicionais"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orgCreatedIdx: index("idx_precadastros_org_created").on(
			table.organizationId,
			table.createdAt,
		),
		tokenIdx: index("idx_precadastros_token").on(table.tokenId, table.createdAt),
	}),
	(table) => [...withPublicWriteOrganizationPolicy("precadastros", table.organizationId)],
);
