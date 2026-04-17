CREATE TABLE "precadastro_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"token" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"max_usos" integer,
	"usos_atuais" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"campos_obrigatorios" text[] DEFAULT '{"nome","email"}' NOT NULL,
	"campos_opcionais" text[] DEFAULT '{"telefone"}' NOT NULL,
	"ui_style" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "precadastro_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "precadastros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text,
	"telefone" text,
	"data_nascimento" date,
	"endereco" text,
	"observacoes" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"converted_at" timestamp with time zone,
	"patient_id" uuid,
	"dados_adicionais" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "precadastros" ADD CONSTRAINT "precadastros_token_id_precadastro_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."precadastro_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_precadastro_tokens_org_created" ON "precadastro_tokens" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_precadastro_tokens_token" ON "precadastro_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_precadastros_org_created" ON "precadastros" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_precadastros_token" ON "precadastros" USING btree ("token_id","created_at");