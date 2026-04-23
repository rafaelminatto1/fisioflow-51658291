CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE "clinical_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"evolution_id" uuid NOT NULL,
	"embedding" "vector(1536)",
	"content_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_embeddings_evolution_id_unique" UNIQUE("evolution_id")
	);
--> statement-breakpoint
ALTER TABLE "clinical_embeddings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_embeddings" ADD CONSTRAINT "clinical_embeddings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_embeddings" ADD CONSTRAINT "clinical_embeddings_evolution_id_sessions_id_fk" FOREIGN KEY ("evolution_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clinical_embedding_patient" ON "clinical_embeddings" USING btree ("patient_id");--> statement-breakpoint
CREATE POLICY "policy_clinical_embeddings_isolation" ON "clinical_embeddings" AS PERMISSIVE FOR ALL TO "authenticated" USING ("clinical_embeddings"."organization_id" = (current_setting('app.org_id')::uuid));-- High-Performance GIN Indexes for JSONB (Postgres 17 Best Practice)
CREATE INDEX IF NOT EXISTS idx_bio_analysis_data_gin ON biomechanics_assessments USING GIN (analysis_data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_patient_ai_prefs_gin ON patients USING GIN (ai_preferences jsonb_path_ops);

-- HNSW Vector Index for Semantic Search (AI Roadmap 2026)
CREATE INDEX IF NOT EXISTS idx_clinical_embeddings_vector ON clinical_embeddings USING hnsw (embedding vector_cosine_ops);
