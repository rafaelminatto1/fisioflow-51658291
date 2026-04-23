import {
	pgTable,
	uuid,
	varchar,
	text,
	boolean,
	timestamp,
	jsonb,
	integer,
	index,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { withOrganizationPolicy } from "./rls_helper";
import { patients } from "./patients";

export const whatsappContacts = pgTable(
	"whatsapp_contacts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		phoneE164: varchar("phone_e164", { length: 20 }),
		waId: varchar("wa_id", { length: 30 }),
		bsuid: varchar("bsuid", { length: 160 }),
		parentBsuid: varchar("parent_bsuid", { length: 170 }),
		username: varchar("username", { length: 100 }),
		displayName: varchar("display_name", { length: 200 }),
		avatarUrl: text("avatar_url"),
		isPatient: boolean("is_patient").default(false),
		identityHistory: jsonb("identity_history"),
		firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
		lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_contacts_organization_id").on(table.organizationId),
		index("idx_wa_contacts_wa_id").on(table.waId),
		index("idx_wa_contacts_bsuid").on(table.bsuid),
		withOrganizationPolicy("whatsapp_contacts", table.organizationId),
	],
);

export const waConversations = pgTable(
	"wa_conversations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		contactId: uuid("contact_id").references(() => whatsappContacts.id),
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		status: varchar("status", { length: 20 }).default("open"),
		priority: varchar("priority", { length: 10 }).default("normal"),
		channel: varchar("channel", { length: 20 }).default("whatsapp"),
		assignedTo: uuid("assigned_to"),
		assignedTeam: varchar("assigned_team", { length: 50 }),
		lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
		lastMessageInAt: timestamp("last_message_in_at", { withTimezone: true }),
		lastMessageOutAt: timestamp("last_message_out_at", {
			withTimezone: true,
		}),
		firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		isAutoReply: boolean("is_auto_reply").default(false),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_conv_organization_id").on(table.organizationId),
		index("idx_wa_conv_contact_id").on(table.contactId),
		index("idx_wa_conv_patient_id").on(table.patientId),
		index("idx_wa_conv_assigned_to").on(table.assignedTo),
		index("idx_wa_conv_org_status").on(table.organizationId, table.status),
		index("idx_wa_conv_org_assigned").on(
			table.organizationId,
			table.assignedTo,
		),
		index("idx_wa_conv_org_created").on(table.organizationId, table.createdAt),
		withOrganizationPolicy("wa_conversations", table.organizationId),
	],
);

export const waMessages = pgTable(
	"wa_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id").references(
			() => waConversations.id,
		),
		organizationId: uuid("organization_id"),
		contactId: uuid("contact_id").references(() => whatsappContacts.id),
		direction: varchar("direction", { length: 10 }),
		senderType: varchar("sender_type", { length: 20 }),
		senderId: text("sender_id"),
		messageType: varchar("message_type", { length: 30 }),
		content: jsonb("content"),
		metaMessageId: text("meta_message_id"),
		templateName: varchar("template_name", { length: 100 }),
		templateLanguage: varchar("template_language", { length: 10 }),
		interactiveType: varchar("interactive_type", { length: 30 }),
		quotedMessageId: uuid("quoted_message_id"),
		status: varchar("status", { length: 20 }).default("pending"),
		isInternalNote: boolean("is_internal_note").default(false),
		isAutoMessage: boolean("is_auto_message").default(false),
		sentVia: varchar("sent_via", { length: 30 }),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_msgs_conversation_id").on(table.conversationId),
		index("idx_wa_msgs_organization_id").on(table.organizationId),
		index("idx_wa_msgs_contact_id").on(table.contactId),
		index("idx_wa_msgs_meta_message_id").on(table.metaMessageId),
		index("idx_wa_msgs_conv_created").on(
			table.conversationId,
			table.createdAt,
		),
		withOrganizationPolicy("wa_messages", table.organizationId),
	],
);

export const waRawEvents = pgTable(
	"wa_raw_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		eventType: varchar("event_type", { length: 30 }),
		metaMessageId: text("meta_message_id"),
		rawPayload: jsonb("raw_payload"),
		processed: boolean("processed").default(false),
		processedAt: timestamp("processed_at", { withTimezone: true }),
		idempotencyKey: text("idempotency_key"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_events_organization_id").on(table.organizationId),
		index("idx_wa_events_meta_message_id").on(table.metaMessageId),
		uniqueIndex("idx_wa_events_idempotency_key").on(table.idempotencyKey),
		withOrganizationPolicy("wa_raw_events", table.organizationId),
	],
);

export const waAssignments = pgTable(
	"wa_assignments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id").references(
			() => waConversations.id,
		),
		organizationId: uuid("organization_id"),
		assignedTo: uuid("assigned_to"),
		assignedBy: uuid("assigned_by"),
		assignedTeam: varchar("assigned_team", { length: 50 }),
		reason: text("reason"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_assign_conversation_id").on(table.conversationId),
		index("idx_wa_assign_assigned_to").on(table.assignedTo),
		withOrganizationPolicy("wa_assignments", table.organizationId),
	],
);

export const waInternalNotes = pgTable(
	"wa_internal_notes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id").references(
			() => waConversations.id,
		),
		organizationId: uuid("organization_id"),
		authorId: uuid("author_id"),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_notes_conversation_id").on(table.conversationId),
		withOrganizationPolicy("wa_internal_notes", table.organizationId),
	],
);

export const waTags = pgTable(
	"wa_tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		name: varchar("name", { length: 50 }).notNull(),
		color: varchar("color", { length: 7 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_tags_organization_id").on(table.organizationId),
		withOrganizationPolicy("wa_tags", table.organizationId),
	],
);

export const waConversationTags = pgTable(
	"wa_conversation_tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id").references(
			() => waConversations.id,
		),
		tagId: uuid("tag_id").references(() => waTags.id),
		organizationId: uuid("organization_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("idx_wa_conv_tags_unique").on(
			table.conversationId,
			table.tagId,
		),
		withOrganizationPolicy("wa_conversation_tags", table.organizationId),
	],
);

export const waQuickReplies = pgTable(
	"wa_quick_replies",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		team: varchar("team", { length: 50 }),
		title: varchar("title", { length: 100 }).notNull(),
		content: text("content").notNull(),
		category: varchar("category", { length: 50 }),
		variables: jsonb("variables"),
		usageCount: integer("usage_count").default(0),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_replies_organization_id").on(table.organizationId),
		withOrganizationPolicy("wa_quick_replies", table.organizationId),
	],
);

export const waAutomationRules = pgTable(
	"wa_automation_rules",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		name: varchar("name", { length: 200 }).notNull(),
		description: text("description"),
		isActive: boolean("is_active").default(true),
		triggerType: varchar("trigger_type", { length: 50 }),
		triggerConfig: jsonb("trigger_config"),
		conditions: jsonb("conditions"),
		actions: jsonb("actions"),
		priority: integer("priority").default(0),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_rules_organization_id").on(table.organizationId),
		withOrganizationPolicy("wa_automation_rules", table.organizationId),
	],
);

export const waSlaConfig = pgTable(
	"wa_sla_config",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		name: varchar("name", { length: 100 }).notNull(),
		priority: varchar("priority", { length: 10 }),
		firstResponseMinutes: integer("first_response_minutes"),
		nextResponseMinutes: integer("next_response_minutes"),
		resolutionHours: integer("resolution_hours"),
		escalationConfig: jsonb("escalation_config"),
		businessHours: jsonb("business_hours"),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_sla_cfg_organization_id").on(table.organizationId),
		withOrganizationPolicy("wa_sla_config", table.organizationId),
	],
);

export const waSlaTracking = pgTable(
	"wa_sla_tracking",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id").references(
			() => waConversations.id,
		),
		organizationId: uuid("organization_id"),
		slaConfigId: uuid("sla_config_id").references(() => waSlaConfig.id),
		firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
		firstResponseTargetAt: timestamp("first_response_target_at", {
			withTimezone: true,
		}),
		firstResponseBreached: boolean("first_response_breached").default(false),
		nextResponseAt: timestamp("next_response_at", { withTimezone: true }),
		nextResponseTargetAt: timestamp("next_response_target_at", {
			withTimezone: true,
		}),
		nextResponseBreached: boolean("next_response_breached").default(false),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		resolutionTargetAt: timestamp("resolution_target_at", {
			withTimezone: true,
		}),
		resolutionBreached: boolean("resolution_breached").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_sla_conv_id").on(table.conversationId),
		withOrganizationPolicy("wa_sla_tracking", table.organizationId),
	],
);

export const waOptInOut = pgTable(
	"wa_opt_in_out",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id"),
		contactId: uuid("contact_id").references(() => whatsappContacts.id),
		type: varchar("type", { length: 10 }),
		channel: varchar("channel", { length: 20 }).default("whatsapp"),
		reason: text("reason"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_wa_opt_organization_id").on(table.organizationId),
		withOrganizationPolicy("wa_opt_in_out", table.organizationId),
	],
);

export const whatsappContactsRelations = relations(
	whatsappContacts,
	({ many }) => ({
		messages: many(waMessages),
		conversations: many(waConversations),
	}),
);

export const waConversationsRelations = relations(
	waConversations,
	({ one, many }) => ({
		contact: one(whatsappContacts, {
			fields: [waConversations.contactId],
			references: [whatsappContacts.id],
		}),
		patient: one(patients, {
			fields: [waConversations.patientId],
			references: [patients.id],
		}),
		messages: many(waMessages),
		assignments: many(waAssignments),
		internalNotes: many(waInternalNotes),
		conversationTags: many(waConversationTags),
	}),
);

export const waMessagesRelations = relations(waMessages, ({ one }) => ({
	conversation: one(waConversations, {
		fields: [waMessages.conversationId],
		references: [waConversations.id],
	}),
	contact: one(whatsappContacts, {
		fields: [waMessages.contactId],
		references: [whatsappContacts.id],
	}),
}));

export const waAssignmentsRelations = relations(waAssignments, ({ one }) => ({
	conversation: one(waConversations, {
		fields: [waAssignments.conversationId],
		references: [waConversations.id],
	}),
}));

export const waInternalNotesRelations = relations(
	waInternalNotes,
	({ one }) => ({
		conversation: one(waConversations, {
			fields: [waInternalNotes.conversationId],
			references: [waConversations.id],
		}),
	}),
);
