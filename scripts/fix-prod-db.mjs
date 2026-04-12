import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

async function run() {
  console.log("Aplicando colunas de deleted_at em produção...");
  
  try {
    const tables = ['patients', 'appointments', 'sessions', 'transacoes', 'pagamentos', 'medical_records'];
    
    for (const table of tables) {
      const check = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = 'deleted_at'
      `;

      if (check.length === 0) {
        console.log(`Adicionando deleted_at à tabela ${table}...`);
        // Para Neon HTTP, não podemos parametrizar nomes de tabela, 
        // mas como a lista é fixa e segura, usamos template string.
        if (table === 'patients') await sql`ALTER TABLE "patients" ADD COLUMN "deleted_at" timestamp`;
        else if (table === 'appointments') await sql`ALTER TABLE "appointments" ADD COLUMN "deleted_at" timestamp`;
        else if (table === 'sessions') await sql`ALTER TABLE "sessions" ADD COLUMN "deleted_at" timestamp`;
        else if (table === 'transacoes') await sql`ALTER TABLE "transacoes" ADD COLUMN "deleted_at" timestamp`;
        else if (table === 'pagamentos') await sql`ALTER TABLE "pagamentos" ADD COLUMN "deleted_at" timestamp`;
        else if (table === 'medical_records') await sql`ALTER TABLE "medical_records" ADD COLUMN "deleted_at" timestamp`;
        
        console.log(`Tabela ${table} atualizada.`);
      } else {
        console.log(`A coluna deleted_at já existe em ${table}.`);
      }
    }

    console.log("Sincronização de colunas concluída!");
  } catch (err) {
    console.error("Erro ao aplicar sincronização:", err);
    process.exit(1);
  }
}

run();
