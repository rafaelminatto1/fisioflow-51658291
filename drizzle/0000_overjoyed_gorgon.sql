CREATE TYPE "public"."appointment_status" AS ENUM('agendado', 'atendido', 'avaliacao', 'cancelado', 'faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'nao_atendido', 'nao_atendido_sem_cobranca', 'presenca_confirmada', 'remarcar');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('evaluation', 'session', 'reassessment', 'group', 'return');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partial', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."exercise_difficulty" AS ENUM('iniciante', 'intermediario', 'avancado');--> statement-breakpoint
CREATE TYPE "public"."exercise_protocol_type" AS ENUM('pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('active', 'expired', 'used', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F', 'O');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('pending', 'in_progress', 'achieved', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."pathology_status" AS ENUM('active', 'treated', 'monitoring');--> statement-breakpoint
CREATE TYPE "public"."biomechanics_type" AS ENUM('gait', 'jump', 'posture', 'functional');--> statement-breakpoint
CREATE TYPE "public"."file_category" AS ENUM('exam', 'imaging', 'document', 'before_after', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('pdf', 'jpg', 'png', 'docx', 'other');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'finalized', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."evidence_level" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."protocol_type" AS ENUM('pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional', 'neurologico', 'respiratorio');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TABLE "announcement_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_mandatory" boolean DEFAULT false,
	"type" varchar(50) DEFAULT 'announcement' NOT NULL,
	"media_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"therapist_id" uuid NOT NULL,
	"organization_id" uuid,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"status" "appointment_status" DEFAULT 'agendado' NOT NULL,
	"type" "appointment_type" DEFAULT 'session' NOT NULL,
	"is_group" boolean DEFAULT false,
	"max_participants" integer DEFAULT 1,
	"current_participants" integer DEFAULT 1,
	"group_id" uuid,
	"room_id" uuid,
	"confirmed_at" timestamp,
	"confirmed_via" varchar(50),
	"reminder_sent_at" timestamp,
	"payment_status" "payment_status" DEFAULT 'pending',
	"payment_amount" numeric(10, 2),
	"paid_at" timestamp,
	"package_id" uuid,
	"notes" text,
	"cancellation_reason" text,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	"rescheduled_from" uuid,
	"rescheduled_to" uuid,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" varchar(50),
	"recurrence_group_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "blocked_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"therapist_id" uuid,
	"room_id" uuid,
	"organization_id" uuid,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"reason" varchar(200),
	"is_all_day" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(100) NOT NULL,
	"capacity" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"working_hours" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_test_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"created_by" uuid,
	"name" text NOT NULL,
	"name_en" text,
	"category" text NOT NULL,
	"target_joint" text NOT NULL,
	"purpose" text,
	"execution" text,
	"positive_sign" text,
	"reference" text,
	"sensitivity_specificity" text,
	"tags" text[] DEFAULT '{}',
	"type" text DEFAULT 'special_test',
	"fields_definition" jsonb DEFAULT '[]'::jsonb,
	"regularity_sessions" integer,
	"layout_type" text,
	"image_url" text,
	"media_urls" text[] DEFAULT '{}',
	"is_custom" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conduct_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"created_by" text,
	"title" text NOT NULL,
	"description" text,
	"conduct_text" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evolution_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"name" text,
	"tipo" text DEFAULT 'fisioterapia',
	"descricao" text,
	"description" text,
	"conteudo" text,
	"content" text,
	"campos_padrao" jsonb DEFAULT '[]'::jsonb,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"tags" text[] DEFAULT '{}',
	"ativo" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"therapist_id" text,
	"qr_code" text,
	"title" text NOT NULL,
	"exercises" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"validity_days" integer DEFAULT 30,
	"valid_until" timestamp,
	"status" text DEFAULT 'ativo',
	"view_count" integer DEFAULT 0,
	"last_viewed_at" timestamp,
	"completed_exercises" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"report_content" text NOT NULL,
	"date_range_start" date,
	"date_range_end" date,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pain_map_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pain_map_id" uuid NOT NULL,
	"x_coordinate" numeric(10, 2),
	"y_coordinate" numeric(10, 2),
	"intensity" numeric(10, 2),
	"region" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pain_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"evolution_id" uuid,
	"body_region" text,
	"pain_level" integer,
	"color_code" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"description" text NOT NULL,
	"target_date" timestamp,
	"status" text DEFAULT 'em_andamento' NOT NULL,
	"priority" text DEFAULT 'media',
	"achieved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_objective_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"prioridade" integer DEFAULT 2,
	"notas" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"nome" text NOT NULL,
	"descricao" text,
	"categoria" text,
	"ativo" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_pathologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"diagnosed_at" timestamp,
	"status" text DEFAULT 'ativo' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"icd_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_session_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_id" uuid,
	"session_date" timestamp DEFAULT now() NOT NULL,
	"session_number" integer,
	"pain_level_before" numeric(10, 2),
	"functional_score_before" numeric(10, 2),
	"mood_before" text,
	"duration_minutes" integer,
	"treatment_type" text,
	"techniques_used" jsonb,
	"areas_treated" jsonb,
	"pain_level_after" numeric(10, 2),
	"functional_score_after" numeric(10, 2),
	"mood_after" text,
	"patient_satisfaction" numeric(10, 2),
	"pain_reduction" numeric(10, 2),
	"functional_improvement" numeric(10, 2),
	"notes" text,
	"therapist_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescribed_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"exercise_id" uuid,
	"frequency" text,
	"sets" integer DEFAULT 3 NOT NULL,
	"reps" integer DEFAULT 10 NOT NULL,
	"duration" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standardized_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"test_type" text NOT NULL,
	"test_name" text NOT NULL,
	"scale_name" text,
	"score" numeric(10, 2),
	"max_score" numeric(10, 2),
	"interpretation" text,
	"answers" jsonb DEFAULT '{}'::jsonb,
	"responses" jsonb DEFAULT '{}'::jsonb,
	"applied_at" timestamp DEFAULT now(),
	"applied_by" text,
	"session_id" uuid,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(100),
	"content" jsonb,
	"is_global" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(20),
	"order_index" integer DEFAULT 0,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "exercise_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(250),
	"name" varchar(250) NOT NULL,
	"category_id" uuid,
	"subcategory" varchar(100),
	"difficulty" "exercise_difficulty" DEFAULT 'iniciante',
	"description" text,
	"instructions" text,
	"tips" text,
	"precautions" text,
	"benefits" text,
	"muscles_primary" text[] DEFAULT '{}',
	"muscles_secondary" text[] DEFAULT '{}',
	"body_parts" text[] DEFAULT '{}',
	"equipment" text[] DEFAULT '{}',
	"sets_recommended" integer,
	"reps_recommended" integer,
	"duration_seconds" integer,
	"rest_seconds" integer,
	"image_url" text,
	"thumbnail_url" text,
	"video_url" text,
	"pathologies_indicated" text[] DEFAULT '{}',
	"pathologies_contraindicated" text[] DEFAULT '{}',
	"icd10_codes" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"references" text,
	"embedding" vector(1536),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "centros_custo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"codigo" varchar(50),
	"ativo" varchar(10) DEFAULT 'true',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas_financeiras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"descricao" text,
	"data_vencimento" date,
	"pago_em" date,
	"patient_id" uuid,
	"appointment_id" uuid,
	"categoria" text,
	"forma_pagamento" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "convenios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnpj" varchar(20),
	"telefone" varchar(20),
	"email" varchar(255),
	"contato_responsavel" varchar(255),
	"valor_repasse" numeric(12, 2),
	"prazo_pagamento_dias" integer,
	"observacoes" text,
	"ativo" boolean DEFAULT true,
	"registro_ans" varchar(50),
	"tabela_precos" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas_parceiras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"contato" text,
	"email" text,
	"telefone" text,
	"contrapartidas" text,
	"observacoes" text,
	"ativo" varchar(10) DEFAULT 'true',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formas_pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(50) DEFAULT 'geral',
	"taxa_percentual" numeric(5, 2) DEFAULT '0',
	"dias_recebimento" integer DEFAULT 0,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tipo_pessoa" text DEFAULT 'pj' NOT NULL,
	"razao_social" text NOT NULL,
	"nome_fantasia" text,
	"cpf_cnpj" text,
	"inscricao_estadual" text,
	"email" text,
	"telefone" text,
	"celular" text,
	"endereco" text,
	"cidade" text,
	"estado" text,
	"cep" text,
	"observacoes" text,
	"categoria" text,
	"ativo" varchar(10) DEFAULT 'true',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"numero" varchar(50) NOT NULL,
	"serie" varchar(20) DEFAULT '1',
	"tipo" varchar(20) DEFAULT 'saida',
	"valor" numeric(12, 2) NOT NULL,
	"data_emissao" timestamp with time zone DEFAULT now() NOT NULL,
	"data_prestacao" timestamp with time zone,
	"destinatario" jsonb DEFAULT '{}'::jsonb,
	"prestador" jsonb DEFAULT '{}'::jsonb,
	"servico" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(50) DEFAULT 'rascunho',
	"chave_acesso" varchar(100),
	"protocolo" varchar(100),
	"verificacao" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfse_config" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"ambiente" varchar(50) DEFAULT 'homologacao',
	"municipio_codigo" varchar(20),
	"cnpj_prestador" varchar(20),
	"inscricao_municipal" varchar(20),
	"aliquota_iss" numeric(5, 2),
	"auto_emissao" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_package_id" uuid,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"evento_id" uuid,
	"appointment_id" uuid,
	"patient_id" uuid,
	"valor" numeric(12, 2) NOT NULL,
	"forma_pagamento" text,
	"status" text DEFAULT 'paid' NOT NULL,
	"pago_em" date,
	"observacoes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"package_template_id" uuid,
	"name" varchar(255) NOT NULL,
	"total_sessions" integer NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"remaining_sessions" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"payment_method" varchar(100),
	"status" "package_status" DEFAULT 'active',
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_package_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sessions_count" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"validity_days" integer DEFAULT 365,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text,
	"tipo" varchar(50) NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"descricao" text,
	"status" varchar(50) DEFAULT 'pendente',
	"categoria" varchar(100),
	"stripe_payment_intent_id" varchar(255),
	"stripe_refund_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"voucher_id" uuid NOT NULL,
	"sessoes_restantes" integer NOT NULL,
	"sessoes_totais" integer NOT NULL,
	"data_compra" timestamp with time zone DEFAULT now() NOT NULL,
	"data_expiracao" timestamp with time zone,
	"ativo" boolean DEFAULT true,
	"valor_pago" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"voucher_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"user_voucher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"tipo" varchar(50) NOT NULL,
	"sessoes" integer,
	"validade_dias" integer DEFAULT 30,
	"preco" numeric(12, 2) NOT NULL,
	"ativo" boolean DEFAULT true,
	"stripe_price_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"xp_reward" integer DEFAULT 50,
	"icon" text,
	"category" text DEFAULT 'general',
	"requirements" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "achievements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "achievements_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"achievement_title" text NOT NULL,
	"unlocked_at" timestamp with time zone,
	"xp_reward" integer
);
--> statement-breakpoint
CREATE TABLE "daily_quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" date DEFAULT now(),
	"quests_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daily_quests_patient_id_date_unique" UNIQUE("patient_id","date")
);
--> statement-breakpoint
CREATE TABLE "patient_gamification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"current_xp" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"last_activity_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "patient_gamification_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"description" text NOT NULL,
	"target_date" date,
	"priority" integer DEFAULT 0,
	"status" "goal_status" DEFAULT 'pending',
	"achieved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid,
	"record_date" date,
	"chief_complaint" text,
	"medical_history" text,
	"current_medications" text,
	"previous_surgeries" text,
	"lifestyle_habits" text,
	"current_history" text,
	"past_history" text,
	"family_history" text,
	"created_by" text,
	"medications" jsonb DEFAULT '[]'::jsonb,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"physical_activity" text,
	"lifestyle" jsonb,
	"physical_exam" jsonb,
	"diagnosis" text,
	"icd10_codes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pathologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"icd_code" varchar(20),
	"status" "pathology_status" DEFAULT 'active',
	"diagnosed_at" date,
	"treated_at" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"cpf" varchar(14),
	"rg" varchar(20),
	"birth_date" date,
	"gender" "gender",
	"phone" varchar(20),
	"phone_secondary" varchar(20),
	"email" varchar(255),
	"photo_url" text,
	"profession" varchar(100),
	"address" jsonb,
	"emergency_contact" jsonb,
	"insurance" jsonb,
	"organization_id" uuid,
	"profile_id" uuid,
	"user_id" text,
	"origin" varchar(100),
	"referred_by" varchar(150),
	"professional_id" uuid,
	"professional_name" varchar(150),
	"is_active" boolean DEFAULT true NOT NULL,
	"alerts" jsonb DEFAULT '[]'::jsonb,
	"observations" text,
	"notes" text,
	"incomplete_registration" boolean DEFAULT false NOT NULL,
	"consent_data" boolean DEFAULT true,
	"consent_image" boolean DEFAULT false,
	"blood_type" varchar(10),
	"weight_kg" numeric(6, 2),
	"height_cm" numeric(6, 2),
	"marital_status" varchar(50),
	"education_level" varchar(100),
	"weight" double precision,
	"progress" integer,
	"date_of_birth" date,
	"archived" boolean,
	"main_condition" text,
	"status" varchar(100),
	"session_value" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "surgeries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"surgery_date" date,
	"surgeon" varchar(150),
	"hospital" varchar(150),
	"post_op_protocol" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"slug" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" varchar(255),
	"email" varchar(255),
	"full_name" varchar(255),
	"role" varchar(50),
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"patient_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"file_type" "file_type" DEFAULT 'other',
	"mime_type" varchar(100),
	"category" "file_category" DEFAULT 'other',
	"size_bytes" integer,
	"description" text,
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"therapist_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"subjective" jsonb,
	"objective" jsonb,
	"assessment" jsonb,
	"plan" jsonb,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"therapist_id" uuid NOT NULL,
	"organization_id" uuid,
	"session_number" integer,
	"date" timestamp DEFAULT now() NOT NULL,
	"duration_minutes" integer,
	"subjective" jsonb,
	"objective" jsonb,
	"assessment" jsonb,
	"plan" jsonb,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"last_auto_save_at" timestamp,
	"finalized_at" timestamp,
	"finalized_by" uuid,
	"replicated_from_id" uuid,
	"pdf_url" text,
	"pdf_generated_at" timestamp,
	"required_tests" jsonb,
	"alerts_acknowledged" boolean DEFAULT false,
	"time_to_peak" double precision,
	"total_reps" integer,
	"avg_peak_force" double precision,
	"peak_force_nkg" double precision,
	"body_weight" double precision,
	"rfd_50" double precision,
	"rfd_100" double precision,
	"rfd_200" double precision,
	"peak_force_n" double precision,
	"raw_force_data" jsonb,
	"peak_force" double precision,
	"avg_force" double precision,
	"rate_of_force_development" double precision,
	"sensitivity" integer,
	"device_battery" integer,
	"sample_rate" integer,
	"is_simulated" boolean,
	"biomechanics_type" "biomechanics_type",
	"biomechanics_data" jsonb,
	"repetitions" integer,
	"side" text,
	"device_firmware" text,
	"measurement_mode" text,
	"device_model" text,
	"protocol_name" text,
	"body_part" text,
	"duration" double precision,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(250),
	"name" varchar(250) NOT NULL,
	"condition_name" varchar(250),
	"protocol_type" "protocol_type" DEFAULT 'patologia',
	"evidence_level" "evidence_level",
	"description" text,
	"objectives" text,
	"contraindications" text,
	"weeks_total" integer,
	"phases" jsonb DEFAULT '[]'::jsonb,
	"milestones" jsonb DEFAULT '[]'::jsonb,
	"restrictions" jsonb DEFAULT '[]'::jsonb,
	"progression_criteria" jsonb DEFAULT '[]'::jsonb,
	"references" jsonb DEFAULT '[]'::jsonb,
	"icd10_codes" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"clinical_tests" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"wiki_page_id" uuid,
	"embedding" vector(1536),
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_protocols_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "protocol_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"phase_week_start" integer NOT NULL,
	"phase_week_end" integer,
	"sets_recommended" integer,
	"reps_recommended" integer,
	"duration_seconds" integer,
	"frequency_per_week" integer,
	"progression_notes" text,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"html_content" text,
	"version" integer NOT NULL,
	"comment" varchar(500),
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(350) NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text DEFAULT '',
	"html_content" text,
	"icon" varchar(50),
	"cover_image" text,
	"parent_id" uuid,
	"category" varchar(100),
	"tags" text[] DEFAULT '{}',
	"is_published" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"organization_id" uuid,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "wiki_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "task_acknowledgments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"read_at" timestamp,
	"acknowledged_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" varchar
);
--> statement-breakpoint
CREATE TABLE "task_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"performed_by" varchar NOT NULL,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"owner_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_visibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"role" varchar(50),
	"user_id" varchar,
	"can_view" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"column_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" "task_priority" DEFAULT 'medium',
	"due_date" timestamp,
	"requires_acknowledgment" boolean DEFAULT false NOT NULL,
	"patient_id" uuid,
	"related_entity_id" uuid,
	"related_entity_type" varchar,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"sets" integer,
	"repetitions" integer,
	"duration" integer,
	"notes" text,
	"week_start" integer,
	"week_end" integer,
	"clinical_notes" text,
	"focus_muscles" text[] DEFAULT '{}',
	"purpose" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"category" varchar(200),
	"condition_name" varchar(500),
	"template_variant" varchar(200),
	"clinical_notes" text,
	"contraindications" text,
	"precautions" text,
	"progression_notes" text,
	"evidence_level" "evidence_level",
	"bibliographic_references" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_prescriptions" ADD CONSTRAINT "exercise_prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_map_points" ADD CONSTRAINT "pain_map_points_pain_map_id_pain_maps_id_fk" FOREIGN KEY ("pain_map_id") REFERENCES "public"."pain_maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_maps" ADD CONSTRAINT "pain_maps_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_objective_assignments" ADD CONSTRAINT "patient_objective_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_objective_assignments" ADD CONSTRAINT "patient_objective_assignments_objective_id_patient_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."patient_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_pathologies" ADD CONSTRAINT "patient_pathologies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_session_metrics" ADD CONSTRAINT "patient_session_metrics_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescribed_exercises" ADD CONSTRAINT "prescribed_exercises_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standardized_test_results" ADD CONSTRAINT "standardized_test_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_favorites" ADD CONSTRAINT "exercise_favorites_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_category_id_exercise_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."exercise_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_financeiras" ADD CONSTRAINT "contas_financeiras_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenios" ADD CONSTRAINT "convenios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas_parceiras" ADD CONSTRAINT "empresas_parceiras_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_pagamento_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfse" ADD CONSTRAINT "nfse_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfse_config" ADD CONSTRAINT "nfse_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_usage" ADD CONSTRAINT "package_usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_usage" ADD CONSTRAINT "package_usage_patient_package_id_patient_packages_id_fk" FOREIGN KEY ("patient_package_id") REFERENCES "public"."patient_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_package_template_id_session_package_templates_id_fk" FOREIGN KEY ("package_template_id") REFERENCES "public"."session_package_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_package_templates" ADD CONSTRAINT "session_package_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" ADD CONSTRAINT "voucher_checkout_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" ADD CONSTRAINT "voucher_checkout_sessions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD CONSTRAINT "achievements_log_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD CONSTRAINT "achievements_log_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_gamification" ADD CONSTRAINT "patient_gamification_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathologies" ADD CONSTRAINT "pathologies_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_exercises" ADD CONSTRAINT "protocol_exercises_protocol_id_exercise_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."exercise_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_acknowledgments" ADD CONSTRAINT "task_acknowledgments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_audit_logs" ADD CONSTRAINT "task_audit_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_columns" ADD CONSTRAINT "task_columns_board_id_task_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."task_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_visibility" ADD CONSTRAINT "task_visibility_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_column_id_task_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."task_columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_template_items" ADD CONSTRAINT "exercise_template_items_template_id_exercise_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."exercise_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_organization_id" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient_id" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_therapist_date" ON "appointments" USING btree ("therapist_id","date");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appointments_room_id" ON "appointments" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_blocked_slots_organization_id" ON "blocked_slots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_blocked_slots_therapist_date" ON "blocked_slots" USING btree ("therapist_id","date");--> statement-breakpoint
CREATE INDEX "idx_blocked_slots_room_date" ON "blocked_slots" USING btree ("room_id","date");--> statement-breakpoint
CREATE INDEX "idx_rooms_organization_id" ON "rooms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_is_active" ON "rooms" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_exercise_categories_slug" ON "exercise_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_exercise_categories_parent_id" ON "exercise_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_favorites_exercise_id" ON "exercise_favorites" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_favorites_user_id" ON "exercise_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_favorites_organization_id" ON "exercise_favorites" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_slug" ON "exercises" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_exercises_category_id" ON "exercises" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_organization_id" ON "exercises" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_is_active" ON "exercises" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_patient_packages_patient_id" ON "patient_packages" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_patient_packages_status" ON "patient_packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_goals_medical_record_id" ON "goals" USING btree ("medical_record_id");--> statement-breakpoint
CREATE INDEX "idx_goals_status" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_medical_records_patient_id" ON "medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_pathologies_medical_record_id" ON "pathologies" USING btree ("medical_record_id");--> statement-breakpoint
CREATE INDEX "idx_pathologies_status" ON "pathologies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_patients_organization_id" ON "patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_patients_profile_id" ON "patients" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_patients_user_id" ON "patients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_patients_cpf" ON "patients" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "idx_patients_is_active" ON "patients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_patients_full_name" ON "patients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_surgeries_medical_record_id" ON "surgeries" USING btree ("medical_record_id");--> statement-breakpoint
CREATE INDEX "idx_session_attachments_session_id" ON "session_attachments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_attachments_patient_id" ON "session_attachments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_session_templates_organization_id" ON "session_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_session_templates_therapist_id" ON "session_templates" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_patient_id" ON "sessions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_appointment_id" ON "sessions" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_therapist_id" ON "sessions" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_organization_id" ON "sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_date" ON "sessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_exercise_protocols_slug" ON "exercise_protocols" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_exercise_protocols_organization_id" ON "exercise_protocols" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_protocols_protocol_type" ON "exercise_protocols" USING btree ("protocol_type");--> statement-breakpoint
CREATE INDEX "idx_protocol_exercises_protocol_id" ON "protocol_exercises" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_exercises_exercise_id" ON "protocol_exercises" USING btree ("exercise_id");