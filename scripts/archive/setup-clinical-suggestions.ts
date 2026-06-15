import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  console.log("Iniciando setup da tabela clinical_resource_suggestions...");

  const databaseUrl = process.env.NEON_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERRO: NEON_URL ou DATABASE_URL não definido nas variáveis de ambiente.");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "clinical_resource_suggestions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "user_id" uuid,
        "query" text NOT NULL,
        "suggested_type" text NOT NULL,
        "suggested_title" text NOT NULL,
        "external_source" text,
        "status" text DEFAULT 'pending' NOT NULL,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Tabela 'clinical_resource_suggestions' criada ou já existente.");

    await sql`ALTER TABLE "clinical_resource_suggestions" ENABLE ROW LEVEL SECURITY;`;
    console.log("✓ ROW LEVEL SECURITY habilitado.");

    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'clinical_resource_suggestions' 
              AND policyname = 'policy_clinical_resource_suggestions_isolation'
          ) THEN
              CREATE POLICY "policy_clinical_resource_suggestions_isolation" 
              ON "clinical_resource_suggestions" 
              AS PERMISSIVE FOR ALL TO "authenticated" 
              USING (organization_id = (current_setting('app.org_id'::text))::uuid);
          END IF;
      END $$;
    `;
    console.log("✓ Políticas RLS (Tenant Isolation) aplicadas com sucesso.");

    console.log(
      "Setup concluído! A tabela está pronta para uso no ambiente de produção/desenvolvimento.",
    );
  } catch (error) {
    console.error("Erro durante a execução do SQL:", error);
  }
}

main();
