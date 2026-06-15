import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function run() {
  console.log("Fetching exercises...");
  const exercises = await sql`
    SELECT id, name, description, instructions, sets_recommended, reps_recommended, duration_seconds 
    FROM exercises
  `;

  let updatedCount = 0;

  for (const ex of exercises) {
    let needsUpdate = false;
    let { sets_recommended, reps_recommended, duration_seconds, description, instructions, name } =
      ex;

    if (!sets_recommended) {
      sets_recommended = 3;
      needsUpdate = true;
    }

    if (!reps_recommended && !duration_seconds) {
      const nameLower = name.toLowerCase();
      const isIso =
        nameLower.includes("alongamento") ||
        nameLower.includes("prancha") ||
        nameLower.includes("isometri") ||
        nameLower.includes("mobilidade");
      if (isIso) {
        duration_seconds = 30;
      } else {
        reps_recommended = 12;
      }
      needsUpdate = true;
    }

    if (!description || description.trim() === "") {
      description = `Exercício focado em ${name}. Contribui para o fortalecimento, mobilidade e melhora do controle motor da região.`;
      needsUpdate = true;
    }

    if (
      !instructions ||
      instructions.trim() === "" ||
      instructions.trim() === "Nenhuma instrução adicional."
    ) {
      instructions = `### Instruções para ${name}\n1. Prepare a postura inicial alinhando corretamente o corpo.\n2. Inicie o movimento de forma controlada.\n3. Mantenha a contração e a respiração constante (não bloqueie a respiração).\n4. Retorne suavemente à posição inicial.\n5. Siga o número de repetições ou o tempo de duração indicados.`;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await sql`
        UPDATE exercises 
        SET 
          sets_recommended = ${sets_recommended}, 
          reps_recommended = ${reps_recommended}, 
          duration_seconds = ${duration_seconds}, 
          description = ${description}, 
          instructions = ${instructions},
          updated_at = NOW()
        WHERE id = ${ex.id}
      `;
      updatedCount++;
      if (updatedCount % 50 === 0) {
        console.log(`Updated ${updatedCount} exercises so far...`);
      }
    }
  }

  console.log(`Finished! Total exercises updated: ${updatedCount}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
