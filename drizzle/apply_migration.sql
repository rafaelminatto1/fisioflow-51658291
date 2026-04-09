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
CREATE TABLE "wa_conversation_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"tag_id" uuid,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE TABLE "wa_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"organization_id" uuid,
	"author_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE TABLE "wa_opt_in_out" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"type" varchar(10),
	"channel" varchar(20) DEFAULT 'whatsapp',
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE TABLE "wa_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(50) NOT NULL,
	"color" varchar(7),
	"created_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE INDEX "idx_jules_pr_org_id" ON "jules_pr_reviews" USING btree ("organization_id");
