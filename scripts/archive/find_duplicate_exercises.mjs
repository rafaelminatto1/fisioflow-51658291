import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

// Normalização básica de texto
function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/gi, "") // Remove pontuação
    .replace(/\s+/g, " ") // Remove espaços múltiplos
    .trim();
}

async function findDuplicates() {
  console.log("Buscando exercícios no banco de dados...");

  const exercises = await sql`
    SELECT id, name, slug, organization_id, created_at
    FROM exercises
    ORDER BY created_at ASC
  `;

  // Agrupamentos
  const exactMatches = new Map();
  const wordMatches = new Map();

  exercises.forEach((ex) => {
    // 1. Exact Normal Match
    const norm = normalizeString(ex.name);
    if (!exactMatches.has(norm)) {
      exactMatches.set(norm, []);
    }
    exactMatches.get(norm).push(ex);

    // 2. Base Word Match (ex: "Agachamento com barra" e "Agachamento livre" caem na keyword "agachamento")
    // Considera apenas as duas primeiras palavras (com mais de 2 letras) como assinatura principal
    const words = norm.split(" ").filter((w) => w.length > 2);
    if (words.length > 0) {
      // Cria uma assinatura usando as duas primeiras palavras importantes
      const signature = words.slice(0, 2).join(" ");
      if (signature.length > 4) {
        // Evita signatures muito curtas como "com a"
        if (!wordMatches.has(signature)) {
          wordMatches.set(signature, []);
        }
        wordMatches.get(signature).push(ex);
      }
    }
  });

  console.log("================ DUPLICATAS EXATAS / MUITO SIMILARES ================\n");

  let exactDupesCount = 0;

  const dupesArr = [];

  for (const [key, group] of exactMatches.entries()) {
    if (group.length > 1) {
      exactDupesCount++;
      dupesArr.push(group);
      console.log(`[ALERTA] ${group.length} exercícios idênticos ou quase idênticos encontrados:`);
      group.forEach((g) => {
        console.log(`   - "${g.name}" (ID: ${g.id}) | Slug: ${g.slug}`);
      });
      console.log("");
    }
  }

  if (exactDupesCount === 0) {
    console.log("-> Nenhuma duplicata idêntica ou exata encontrada!\n");
  }

  console.log("================ SUSPEITOS DE SEREM O MESMO EXERCÍCIO ================\n");

  let susDupesCount = 0;
  for (const [signature, group] of wordMatches.entries()) {
    // Apenas mostrar se o grupo tem mais de 1, E se não forem TODOS exatamente a mesma string (que já apareceu acima)
    if (group.length > 1) {
      const uniqueNames = new Set(group.map((g) => normalizeString(g.name)));
      if (uniqueNames.size > 1 && group.length <= 4) {
        // Filtra grupos gigantes como "alongamento" (terá 30+)
        susDupesCount++;
        console.log(`[SUSPEITO] Grupo com palavra(s) chave '${signature}':`);
        group.forEach((g) => {
          console.log(`   - "${g.name}"`);
        });
        console.log("");
      }
    }
  }

  console.log(
    `Resumo: ${exactDupesCount} grupos de nomes idênticos | ${susDupesCount} grupos de nomes suspeitamente similares.`,
  );
}

findDuplicates().catch((err) => {
  console.error("Erro na consulta:", err);
  process.exit(1);
});
