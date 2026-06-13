import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

// Normalização básica de texto
function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function unify() {
  console.log("Buscando exercícios...");
  const exercises = await sql`
    SELECT id, name, slug, image_url, video_url, thumbnail_url, created_at, is_active
    FROM exercises
    ORDER BY created_at ASC
  `;

  const wordMatches = new Map();

  exercises.forEach(ex => {
    const norm = normalizeString(ex.name);
    const words = norm.split(" ").filter(w => w.length > 2);
    if (words.length > 0) {
      const signature = words.slice(0, 2).join(" ");
      if (signature.length > 4) {
        if (!wordMatches.has(signature)) {
          wordMatches.set(signature, []);
        }
        wordMatches.get(signature).push(ex);
      }
    }
  });

  let unifiedGroups = 0;
  let deletedCount = 0;

  for (const [signature, group] of wordMatches.entries()) {
    // Filtro para grupos que realmente parecem duplicatas similares (e não grupos muito grandes acidentais)
    const uniqueNames = new Set(group.map(g => normalizeString(g.name)));
    if (group.length > 1 && uniqueNames.size > 1 && group.length <= 5) {
      console.log(`\nUnificando grupo [${signature}]...`);

      // 1. Eleger o Primary
      // O exercício com nome mais curto tende a ser o mais genérico (ex: "Monster Walk" vs "Monster Walk (Caminhada Monster)")
      const sortedGroup = [...group].sort((a, b) => a.name.length - b.name.length);
      const primary = sortedGroup[0];
      const secondaries = sortedGroup.slice(1);

      console.log(`   🌟 Primary: "${primary.name}" (ID: ${primary.id})`);

      let pImageUrl = primary.image_url;
      let pVideoUrl = primary.video_url;
      let pThumbUrl = primary.thumbnail_url;

      for (const sec of secondaries) {
        console.log(`   🗑️ Unindo Secundário: "${sec.name}" (ID: ${sec.id})`);

        // Herdar imagens se o primary não tiver
        if (!pImageUrl && sec.image_url) pImageUrl = sec.image_url;
        if (!pVideoUrl && sec.video_url) pVideoUrl = sec.video_url;
        if (!pThumbUrl && sec.thumbnail_url) pThumbUrl = sec.thumbnail_url;

        // Tenta atualizar relações e ignorar falhas se o usuário já adicionou o primary ao mesmo lugar
        // Para Favorites:
        await sql`
          UPDATE exercise_favorites 
          SET exercise_id = ${primary.id} 
          WHERE exercise_id = ${sec.id} AND NOT EXISTS (
            SELECT 1 FROM exercise_favorites WHERE exercise_id = ${primary.id} AND user_id = exercise_favorites.user_id
          )
        `;
        // Deleta leftovers nos favoritos que colidiram
        await sql`DELETE FROM exercise_favorites WHERE exercise_id = ${sec.id}`;

        // Para Protocol Exercises:
        try {
          await sql`
            UPDATE protocol_exercises 
            SET exercise_id = ${primary.id} 
            WHERE exercise_id = ${sec.id} AND NOT EXISTS (
              SELECT 1 FROM protocol_exercises pe2 WHERE pe2.exercise_id = ${primary.id} AND pe2.protocol_id = protocol_exercises.protocol_id
            )
          `;
          await sql`DELETE FROM protocol_exercises WHERE exercise_id = ${sec.id}`;
        } catch(e) { /* ignore if tables don't exist yet */ }

        // Para Media Attachments (tabela auxiliar):
        try {
          await sql`UPDATE exercise_media_attachments SET exercise_id = ${primary.id} WHERE exercise_id = ${sec.id}`;
        } catch(e) { /* ignore */ }

        // Deleta o exercício secundário
        await sql`DELETE FROM exercises WHERE id = ${sec.id}`;
        deletedCount++;
      }

      // Atualiza o Primary com as imagens que ele possa ter herdado
      if (pImageUrl !== primary.image_url || pVideoUrl !== primary.video_url || pThumbUrl !== primary.thumbnail_url) {
        console.log(`   📸 Atualizando imagens no Primary...`);
        await sql`
          UPDATE exercises 
          SET image_url = ${pImageUrl || null},
              video_url = ${pVideoUrl || null},
              thumbnail_url = ${pThumbUrl || null}
          WHERE id = ${primary.id}
        `;
      }

      unifiedGroups++;
    }
  }

  console.log(`\n============================`);
  console.log(`🚀 Concluído! Grupos unificados: ${unifiedGroups}`);
  console.log(`❌ Exercícios secundários excluídos: ${deletedCount}`);
  console.log(`============================`);
}

unify().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
