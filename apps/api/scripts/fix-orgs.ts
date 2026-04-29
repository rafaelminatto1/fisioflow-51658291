import { neon } from "@neondatabase/serverless";

const REAL_ORG_ID = "04f4477c-7833-4f96-8571-33157940787e";
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sql = neon(url);

  console.log("Iniciando correção de organizações...");

  // 1. Corrigir perfis
  await sql.query(
    "UPDATE profiles SET organization_id = $1 WHERE email = 'rafael.minatto@yahoo.com.br'",
    [REAL_ORG_ID],
  );

  // 2. Corrigir pacientes
  await sql.query(
    "UPDATE patients SET organization_id = $1 WHERE organization_id = $2 OR organization_id IS NULL",
    [REAL_ORG_ID, DEFAULT_ORG_ID],
  );
  await sql.query(
    "DELETE FROM patients WHERE full_name IS NULL OR full_name = '' OR full_name = 'Sem nome'",
  );

  // 3. Corrigir agendamentos
  await sql.query(
    "UPDATE appointments SET organization_id = $1 WHERE organization_id = $2 OR organization_id IS NULL",
    [REAL_ORG_ID, DEFAULT_ORG_ID],
  );

  console.log("Correção concluída!");
}

main().catch(console.error);
