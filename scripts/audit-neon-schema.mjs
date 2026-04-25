#!/usr/bin/env node

import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", override: true });
config({ path: ".env", override: false });

const { Client } = pg;

const CRITICAL_TABLES = [
  "knowledge_articles",
  "knowledge_annotations",
  "knowledge_curation",
  "knowledge_audit",
  "knowledge_notes",
  "profiles",
  "organization_members",
  "patient_goals",
  "patient_pathologies",
  "patient_session_metrics",
  "prescribed_exercises",
  "generated_reports",
  "appointments",
  "exercise_plans",
  "exercise_plan_items",
  "exercises",
  "exercise_sessions",
  "notifications",
  "treatment_sessions",
  "medical_reports",
  "public_booking_requests",
  "organizations",
  "empresas_parceiras",
  "fornecedores",
  "formas_pagamento",
  "clinic_inventory",
  "inventory_movements",
  "staff_performance_metrics",
  "patient_predictions",
  "revenue_forecasts",
  "whatsapp_exercise_queue",
  "patient_self_assessments",
  "precadastro_tokens",
  "precadastros",
  "medical_report_templates",
  "convenio_reports",
];

const MIGRATION_COVERAGE = {
  knowledge_articles: "src/server/db/migrations/0029_knowledge_base.sql",
  knowledge_annotations: "src/server/db/migrations/0029_knowledge_base.sql",
  knowledge_curation: "src/server/db/migrations/0029_knowledge_base.sql",
  knowledge_audit: "src/server/db/migrations/0029_knowledge_base.sql",
  knowledge_notes: "src/server/db/migrations/0031_wiki_library.sql",
  patient_predictions: "src/server/db/migrations/0004_patient_predictions_metadata.sql",
  precadastro_tokens: "src/server/db/migrations/0007_precadastro.sql",
  precadastros: "src/server/db/migrations/0007_precadastro.sql",
  medical_report_templates: "src/server/db/migrations/0017_reports_and_public_booking.sql",
  medical_reports: "src/server/db/migrations/0017_reports_and_public_booking.sql",
  convenio_reports: "src/server/db/migrations/0017_reports_and_public_booking.sql",
  public_booking_requests: "src/server/db/migrations/0017_reports_and_public_booking.sql",
  clinic_inventory: "src/server/db/migrations/0022_innovations_support.sql",
  inventory_movements: "src/server/db/migrations/0022_innovations_support.sql",
  staff_performance_metrics: "src/server/db/migrations/0022_innovations_support.sql",
  revenue_forecasts: "src/server/db/migrations/0022_innovations_support.sql",
  whatsapp_exercise_queue: "src/server/db/migrations/0022_innovations_support.sql",
  patient_self_assessments: "src/server/db/migrations/0022_innovations_support.sql",
  exercise_sessions: "src/server/db/migrations/0018_exercise_sessions.sql",
  treatment_sessions: "src/server/db/migrations/0036_patient_resources_sync_hotfix.sql",
  organization_members:
    "src/server/db/migrations/0039_missing_org_members_and_analytics_tables.sql",
  patient_session_metrics:
    "src/server/db/migrations/0039_missing_org_members_and_analytics_tables.sql",
  prescribed_exercises:
    "src/server/db/migrations/0039_missing_org_members_and_analytics_tables.sql",
  generated_reports: "src/server/db/migrations/0039_missing_org_members_and_analytics_tables.sql",
};

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não definida em .env/.env.local");
  }
  return url;
}

async function main() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const existing = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name",
      [CRITICAL_TABLES],
    );
    const tracking = await client.query(
      "SELECT to_regclass('drizzle.__drizzle_migrations')::text AS drizzle_table, to_regclass('public.schema_migrations')::text AS schema_migrations",
    );

    const existingSet = new Set(existing.rows.map((row) => String(row.table_name)));
    const rows = CRITICAL_TABLES.map((table) => ({
      table,
      exists: existingSet.has(table),
      migration: MIGRATION_COVERAGE[table] ?? null,
    }));

    const missing = rows.filter((row) => !row.exists);
    const missingWithMigration = missing.filter((row) => row.migration);
    const missingWithoutMigration = missing.filter((row) => !row.migration);

    console.log(
      JSON.stringify(
        {
          summary: {
            total: rows.length,
            present: rows.length - missing.length,
            missing: missing.length,
          },
          migrationTracking: tracking.rows[0],
          missingWithMigration,
          missingWithoutMigration,
          present: rows.filter((row) => row.exists).map((row) => row.table),
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
