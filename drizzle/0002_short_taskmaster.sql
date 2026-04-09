CREATE TABLE "wa_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"organization_id" uuid,
	"assigned_to" uuid,
	"assigned_by" uuid,
	"assigned_team" varchar(50),
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"trigger_type" varchar(50),
	"trigger_config" jsonb,
	"conditions" jsonb,
	"actions" jsonb,
	"priority" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_conversation_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"tag_id" uuid,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"patient_id" uuid,
	"status" varchar(20) DEFAULT 'open',
	"priority" varchar(10) DEFAULT 'normal',
	"channel" varchar(20) DEFAULT 'whatsapp',
	"assigned_to" uuid,
	"assigned_team" varchar(50),
	"last_message_at" timestamp with time zone,
	"last_message_in_at" timestamp with time zone,
	"last_message_out_at" timestamp with time zone,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"is_auto_reply" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"organization_id" uuid,
	"author_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"organization_id" uuid,
	"contact_id" uuid,
	"direction" varchar(10),
	"sender_type" varchar(20),
	"sender_id" text,
	"message_type" varchar(30),
	"content" jsonb,
	"meta_message_id" text,
	"template_name" varchar(100),
	"template_language" varchar(10),
	"interactive_type" varchar(30),
	"quoted_message_id" uuid,
	"status" varchar(20) DEFAULT 'pending',
	"is_internal_note" boolean DEFAULT false,
	"is_auto_message" boolean DEFAULT false,
	"sent_via" varchar(30),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_opt_in_out" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"type" varchar(10),
	"channel" varchar(20) DEFAULT 'whatsapp',
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_quick_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"team" varchar(50),
	"title" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(50),
	"variables" jsonb,
	"usage_count" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_raw_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"event_type" varchar(30),
	"meta_message_id" text,
	"raw_payload" jsonb,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp with time zone,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_sla_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(100) NOT NULL,
	"priority" varchar(10),
	"first_response_minutes" integer,
	"next_response_minutes" integer,
	"resolution_hours" integer,
	"escalation_config" jsonb,
	"business_hours" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_sla_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"organization_id" uuid,
	"sla_config_id" uuid,
	"first_response_at" timestamp with time zone,
	"first_response_target_at" timestamp with time zone,
	"first_response_breached" boolean DEFAULT false,
	"next_response_at" timestamp with time zone,
	"next_response_target_at" timestamp with time zone,
	"next_response_breached" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"resolution_target_at" timestamp with time zone,
	"resolution_breached" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(50) NOT NULL,
	"color" varchar(7),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"patient_id" uuid,
	"phone_e164" varchar(20),
	"wa_id" varchar(30),
	"bsuid" varchar(160),
	"parent_bsuid" varchar(170),
	"username" varchar(100),
	"display_name" varchar(200),
	"avatar_url" text,
	"is_patient" boolean DEFAULT false,
	"identity_history" jsonb,
	"first_seen_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "pain_map_points" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "evaluation_templates" ADD COLUMN "aliases_pt" text[];--> statement-breakpoint
ALTER TABLE "evaluation_templates" ADD COLUMN "aliases_en" text[];--> statement-breakpoint
ALTER TABLE "evaluation_templates" ADD COLUMN "dictionary_id" text;--> statement-breakpoint
ALTER TABLE "evaluation_templates" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "exercise_categories" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "achievements" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_quests" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "patient_gamification" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "pathologies" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "social_name" varchar(150);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "nickname" varchar(100);--> statement-breakpoint
ALTER TABLE "surgeries" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "protocol_exercises" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "task_acknowledgments" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "task_audit_logs" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "task_boards" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "task_columns" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "task_visibility" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "exercise_template_categories" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "exercise_template_items" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "jules_learnings" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "jules_pr_reviews" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "wa_assignments" ADD CONSTRAINT "wa_assignments_conversation_id_wa_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."wa_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_conversation_tags" ADD CONSTRAINT "wa_conversation_tags_conversation_id_wa_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."wa_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_conversation_tags" ADD CONSTRAINT "wa_conversation_tags_tag_id_wa_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."wa_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_conversations" ADD CONSTRAINT "wa_conversations_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_conversations" ADD CONSTRAINT "wa_conversations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_internal_notes" ADD CONSTRAINT "wa_internal_notes_conversation_id_wa_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."wa_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_messages" ADD CONSTRAINT "wa_messages_conversation_id_wa_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."wa_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_messages" ADD CONSTRAINT "wa_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_opt_in_out" ADD CONSTRAINT "wa_opt_in_out_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_sla_tracking" ADD CONSTRAINT "wa_sla_tracking_conversation_id_wa_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."wa_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_sla_tracking" ADD CONSTRAINT "wa_sla_tracking_sla_config_id_wa_sla_config_id_fk" FOREIGN KEY ("sla_config_id") REFERENCES "public"."wa_sla_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_wa_assign_conversation_id" ON "wa_assignments" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_wa_assign_assigned_to" ON "wa_assignments" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_wa_rules_organization_id" ON "wa_automation_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wa_conv_tags_unique" ON "wa_conversation_tags" USING btree ("conversation_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_wa_conv_organization_id" ON "wa_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_conv_contact_id" ON "wa_conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_wa_conv_patient_id" ON "wa_conversations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_wa_conv_assigned_to" ON "wa_conversations" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_wa_conv_org_status" ON "wa_conversations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_wa_conv_org_assigned" ON "wa_conversations" USING btree ("organization_id","assigned_to");--> statement-breakpoint
CREATE INDEX "idx_wa_conv_org_created" ON "wa_conversations" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_wa_notes_conversation_id" ON "wa_internal_notes" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_wa_msgs_conversation_id" ON "wa_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_wa_msgs_organization_id" ON "wa_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_msgs_contact_id" ON "wa_messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_wa_msgs_meta_message_id" ON "wa_messages" USING btree ("meta_message_id");--> statement-breakpoint
CREATE INDEX "idx_wa_msgs_conv_created" ON "wa_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_wa_opt_organization_id" ON "wa_opt_in_out" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_replies_organization_id" ON "wa_quick_replies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_events_organization_id" ON "wa_raw_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_events_meta_message_id" ON "wa_raw_events" USING btree ("meta_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wa_events_idempotency_key" ON "wa_raw_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_wa_sla_cfg_organization_id" ON "wa_sla_config" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_sla_conv_id" ON "wa_sla_tracking" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_wa_tags_organization_id" ON "wa_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_contacts_organization_id" ON "whatsapp_contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_wa_contacts_wa_id" ON "whatsapp_contacts" USING btree ("wa_id");--> statement-breakpoint
CREATE INDEX "idx_wa_contacts_bsuid" ON "whatsapp_contacts" USING btree ("bsuid");--> statement-breakpoint
CREATE INDEX "idx_exercise_categories_org_id" ON "exercise_categories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_goals_org_id" ON "goals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_pathologies_org_id" ON "pathologies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_surgeries_org_id" ON "surgeries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_session_attachments_org_id" ON "session_attachments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_exercises_org_id" ON "protocol_exercises" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_jules_learnings_org_id" ON "jules_learnings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_jules_pr_org_id" ON "jules_pr_reviews" USING btree ("organization_id");