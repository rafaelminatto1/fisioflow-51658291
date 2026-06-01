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

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    userId: text("user_id"),
    type: varchar("type", { length: 50 }).notNull(), // 'receita', 'despesa', etc.
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).default("pending"),
    category: varchar("category", { length: 100 }),
    dreCategory: varchar("dre_category", { length: 100 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
    metadata: jsonb("metadata").default({}),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_transactions_org_created").on(table.organizationId, table.createdAt),
    withOrganizationPolicy("transactions", table.organizationId),
  ],
);

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("pending"),
    description: text("description"),
    dueDate: date("due_date"),
    paidAt: date("paid_at"),
    patientId: uuid("patient_id"),
    appointmentId: uuid("appointment_id"),
    category: text("category"),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_financial_accounts_org_vencimento").on(table.organizationId, table.dueDate),
    index("idx_financial_accounts_org_patient").on(table.organizationId, table.patientId),
    withOrganizationPolicy("financial_accounts", table.organizationId),
  ],
);

export const costCenters = pgTable(
  "cost_centers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    code: varchar("code", { length: 50 }),
    isActive: boolean("is_active").default(true),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("cost_centers", table.organizationId)],
);

export const healthInsurances = pgTable(
  "health_insurances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    taxId: varchar("tax_id", { length: 20 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    responsibleContact: varchar("responsible_contact", { length: 255 }),
    reimbursementAmount: numeric("reimbursement_amount", { precision: 12, scale: 2 }),
    paymentTermsDays: integer("payment_terms_days"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    ansRegistration: varchar("ans_registration", { length: 50 }),
    priceTable: jsonb("price_table").default({}),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("health_insurances", table.organizationId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    eventId: uuid("event_id"),
    appointmentId: uuid("appointment_id"),
    patientId: uuid("patient_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method"),
    status: text("status").notNull().default("paid"),
    paidAt: date("paid_at"),
    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("payments", table.organizationId)],
);

export const partnerCompanies = pgTable(
  "partner_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    contact: text("contact"),
    email: text("email"),
    phone: text("phone"),
    benefits: text("benefits"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("partner_companies", table.organizationId)],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    personType: text("person_type").notNull().default("pj"),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    taxId: text("tax_id"),
    stateRegistration: text("state_registration"),
    email: text("email"),
    phone: text("phone"),
    mobilePhone: text("mobile_phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    notes: text("notes"),
    category: text("category"),
    isActive: boolean("is_active").default(true),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("suppliers", table.organizationId)],
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).default("geral"),
    feePercentage: numeric("fee_percentage", { precision: 5, scale: 2 }).default("0"),
    payoutDays: integer("payout_days").default(0),
    isActive: boolean("is_active").default(true),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("payment_methods", table.organizationId)],
);

export const sessionPackageTemplates = pgTable(
  "session_package_templates",
  {
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
  },
  (table) => [withOrganizationPolicy("session_package_templates", table.organizationId)],
);

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

export const patientPackagesRelations = relations(patientPackages, ({ one }) => ({
  patient: one(patients, {
    fields: [patientPackages.patientId],
    references: [patients.id],
  }),
}));

export const packageUsage = pgTable(
  "package_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    patientPackageId: uuid("patient_package_id").references(() => patientPackages.id),
    patientId: uuid("patient_id").notNull(),
    appointmentId: uuid("appointment_id"),
    usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by"),
  },
  (table) => [withOrganizationPolicy("package_usage", table.organizationId)],
);

export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 50 }).notNull(),
    sessions: integer("sessions"),
    validityDays: integer("validity_days").default(30),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    isActive: boolean("is_active").default(true),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("vouchers", table.organizationId)],
);

export const userVouchers = pgTable(
  "user_vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    userId: text("user_id").notNull(),
    voucherId: uuid("voucher_id")
      .references(() => vouchers.id)
      .notNull(),
    remainingSessions: integer("remaining_sessions").notNull(),
    totalSessions: integer("total_sessions").notNull(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("user_vouchers", table.organizationId)],
);

export const voucherCheckoutSessions = pgTable(
  "voucher_checkout_sessions",
  {
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
  },
  (table) => [withOrganizationPolicy("voucher_checkout_sessions", table.organizationId)],
);

export const nfse = pgTable(
  "nfse",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    number: varchar("number", { length: 50 }).notNull(),
    series: varchar("series", { length: 20 }).default("1"),
    type: varchar("type", { length: 20 }).default("saida"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    serviceDate: timestamp("service_date", { withTimezone: true }),
    recipient: jsonb("recipient").default({}),
    provider: jsonb("provider").default({}),
    service: jsonb("service").default({}),
    status: varchar("status", { length: 50 }).default("rascunho"),
    accessKey: varchar("access_key", { length: 100 }),
    protocol: varchar("protocol", { length: 100 }),
    verification: varchar("verification", { length: 100 }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("nfse", table.organizationId)],
);

export const nfseConfig = pgTable(
  "nfse_config",
  {
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .primaryKey()
      .notNull(),
    environment: varchar("environment", { length: 50 }).default("homologacao"),
    cityCode: varchar("city_code", { length: 20 }),
    providerTaxId: varchar("provider_tax_id", { length: 20 }),
    cityRegistration: varchar("city_registration", { length: 20 }),
    issRate: numeric("iss_rate", { precision: 5, scale: 2 }),
    autoIssuance: boolean("auto_issuance").default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("nfse_config", table.organizationId)],
);

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
