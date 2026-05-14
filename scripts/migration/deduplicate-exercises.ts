import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function deduplicateExercises() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔍 Buscando exercícios agrupados por nome...");
    
    // Group exercises by normalized name
    const { rows: allExercises } = await client.query(`
      SELECT id, name, slug, image_url, video_url, name_en, image_variants, created_at, updated_at
      FROM exercises
      ORDER BY name ASC, updated_at DESC
    `);

    const groups = new Map<string, any[]>();
    for (const ex of allExercises) {
      const normalizedName = ex.name.trim().toLowerCase();
      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }
      groups.get(normalizedName)!.push(ex);
    }

    let mergedCount = 0;
    let deletedCount = 0;

    for (const [name, duplicates] of groups.entries()) {
      if (duplicates.length <= 1) continue;

      console.log(`\n🔄 Resolvendo duplicação para: "${duplicates[0].name}" (${duplicates.length} versões)`);

      // 1. Identificar o Canônico (preferência para exd-* ou o mais recente)
      const canonical = duplicates.find(e => e.slug && e.slug.startsWith("exd-")) || duplicates[0];
      const others = duplicates.filter(e => e.id !== canonical.id);

      // 2. Fazer Merge de Mídia e Metadados
      let updatedCanonical = { ...canonical };
      let needsUpdate = false;

      for (const other of others) {
        if (!updatedCanonical.image_url && other.image_url) {
          updatedCanonical.image_url = other.image_url;
          needsUpdate = true;
        }
        if (!updatedCanonical.video_url && other.video_url) {
          updatedCanonical.video_url = other.video_url;
          needsUpdate = true;
        }
        if (!updatedCanonical.name_en && other.name_en) {
          updatedCanonical.name_en = other.name_en;
          needsUpdate = true;
        }
        
        // Merge image_variants
        const otherVariants = other.image_variants || [];
        const canonicalVariants = updatedCanonical.image_variants || [];
        if (otherVariants.length > 0) {
           const newVariants = [...new Set([...canonicalVariants, ...otherVariants])];
           if (newVariants.length > canonicalVariants.length) {
              updatedCanonical.image_variants = newVariants;
              needsUpdate = true;
           }
        }
        // If other has an image_url and it's different from canonical's, add it to variants
        if (other.image_url && other.image_url !== updatedCanonical.image_url) {
           const canonicalVariants = updatedCanonical.image_variants || [];
           if (!canonicalVariants.includes(other.image_url)) {
              updatedCanonical.image_variants = [...canonicalVariants, other.image_url];
              needsUpdate = true;
           }
        }
      }

      if (needsUpdate) {
        console.log(`   └ Atualizando metadados no canônico (${canonical.slug})`);
        await client.query(`
          UPDATE exercises 
          SET image_url = $1, video_url = $2, name_en = $3, image_variants = $4, updated_at = NOW()
          WHERE id = $5
        `, [
          updatedCanonical.image_url, 
          updatedCanonical.video_url, 
          updatedCanonical.name_en, 
          updatedCanonical.image_variants, 
          canonical.id
        ]);
        mergedCount++;
      }

      // 3. Atualizar Chaves Estrangeiras para apontar para o Canônico
      for (const other of others) {
        console.log(`   └ Migrando dados do duplicado (${other.slug}) e deletando...`);
        
        // Tentar atualizar as tabelas dependentes ignorando possíveis conflitos únicos
        const tables = [
          "exercise_plan_items", 
          "exercise_sessions", 
          "prescribed_exercises", 
          "exercise_media_attachments",
          "exercise_favorites"
        ];
        
        for (const table of tables) {
           try {
             await client.query(`
                UPDATE ${table} 
                SET exercise_id = $1 
                WHERE exercise_id = $2
             `, [canonical.id, other.id]);
           } catch (e: any) {
             // Se houver conflito (ex: paciente já tem o mesmo exercício prescrito),
             // apenas deleta a referência duplicada na tabela dependente para evitar falha
             console.log(`      Aviso na tabela ${table}: ${e.message}. Removendo referência duplicada.`);
             await client.query(`DELETE FROM ${table} WHERE exercise_id = $1`, [other.id]);
           }
        }

        // Deletar o duplicado
        await client.query(`DELETE FROM exercises WHERE id = $1`, [other.id]);
        deletedCount++;
      }
    }

    await client.query("COMMIT");
    console.log(`\n✅ Sucesso! ${mergedCount} exercícios atualizados. ${deletedCount} duplicatas deletadas.`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Falha na deduplicação:", e);
  } finally {
    client.release();
  }
}

deduplicateExercises().then(() => {
  pool.end();
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
