import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates, exerciseTemplateItems } from "../src/server/db/schema/templates";
import { notInArray, eq } from "drizzle-orm";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const keptNames = [
    "Gonartrose — Fortalecimento Funcional",
    "Hérnia de Disco Lombar — Controle Motor",
    "Impacto Subacromial — Estabilização Escapular",
    "Entorse de Tornozelo — Estabilidade Dinâmica",
    "Tendinopatia Patelar — Carga Progressiva",
    "Pós-Op LCA — Fase I (Proteção e Ativação)",
    "Pós-Op Manguito Rotador — Proteção Inicial",
    "Prevenção de Quedas — Equilíbrio e Força",
    "Manutenção Funcional — Sarcopenia"
  ];

  console.log("Cleaning up all other templates to maintain high quality...");

  const toDelete = await db.select().from(exerciseTemplates).where(notInArray(exerciseTemplates.name, keptNames));

  for (const t of toDelete) {
    console.log(`Deleting: ${t.name}`);
    await db.delete(exerciseTemplateItems).where(eq(exerciseTemplateItems.templateId, t.id));
    await db.delete(exerciseTemplates).where(eq(exerciseTemplates.id, t.id));
  }

  console.log("Cleanup complete. 9 core templates remain.");
}
main().catch(console.error);
