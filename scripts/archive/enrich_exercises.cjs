const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const CATEGORIES = {
  STRENGTHENING: "44c277c4-8272-48b1-bf8f-aae2960f903f",
  STRETCHING: "e85d719c-f5d4-434e-baa7-64000d6f86b5",
  MOBILITY: "be227fb7-ee05-4264-ad69-98beb7929409",
  CORE: "c4a6c77a-6159-4d39-ad2b-256c1793f36f",
  FUNCTIONAL: "4fc4e9f0-6e88-4084-9b7b-922e0e91b2ba",
  NEURO: "8bdf8734-e8fc-4e4c-9978-793a0f2c45d6",
  SPORT: "15fd4b20-e2b6-4028-929c-4870bb94daae",
};

// Mapping rules: keywords in name -> Category ID
const MAPPING_RULES = [
  // Mobility & Stretching
  {
    keywords: [
      "alongamento",
      "stretching",
      "tensor",
      "piriforme",
      "psoas",
      "fascia",
      "peitoral",
      "isquios",
      "quadriceps alongamento",
      "adutores alongamento",
    ],
    category: CATEGORIES.STRETCHING,
  },
  {
    keywords: [
      "mobilidade",
      "mobilizacao",
      "glide",
      "pendular",
      "gato-camelo",
      "wall angels",
      "tendon glides",
      "nerve glide",
      "deslizamento",
      "desvio radial",
      "rolling",
    ],
    category: CATEGORIES.MOBILITY,
  },
  { keywords: ["chin tucks", "prone y-t-w", "cobra prona"], category: CATEGORIES.MOBILITY },

  // Core & Stabilization
  {
    keywords: [
      "core",
      "estabilizacao",
      "plank",
      "prancha",
      "bridge",
      "ponte",
      "dead bug",
      "bird-dog",
      "hollow rock",
      "canoa",
      "l-sit",
      "rollout",
      "kegel",
      "4 apoios",
      "autocorrecao-3d",
      "jacobson",
    ],
    category: CATEGORIES.CORE,
  },

  // Neurological & Coordination
  {
    keywords: [
      "coordenacao",
      "cross crawl",
      "digital",
      "manual",
      "oculo-manual",
      "padroes cruzados",
    ],
    category: CATEGORIES.NEURO,
  },

  // Functional & ADLs / Balance
  {
    keywords: [
      "avd",
      "funcional",
      "equilibrio",
      "tandem",
      "propriocepcao",
      "marça",
      "step touch",
      "degrau",
      "sentar",
      "levantar",
      "oposicao de dedos",
      "tapete",
      "bola",
      "squeeze",
      "preensao",
      "clock reach",
      "big steps",
    ],
    category: CATEGORIES.FUNCTIONAL,
  },

  // Return to Sport / High Intensity
  {
    keywords: [
      "sport",
      "esporte",
      "plyo",
      "salto",
      "jump",
      "sebt",
      "shuffle",
      "slam",
      "boxing",
      "landing",
      "alcance em y",
    ],
    category: CATEGORIES.SPORT,
  },

  // Strengthening (Default if others don't match or specific keywords)
  {
    keywords: [
      "fortalecimento",
      "strengthening",
      "resistencia",
      "peso",
      "faixa",
      "elastico",
      "dumbbell",
      "kettlebell",
      "medicine ball",
      "agachamento",
      "lunges",
      "afundo",
      "push-up",
      "flexao",
      "extensao de cotovelo",
      "rdl",
      "deadlift",
      "face pull",
      "quad sets",
      "isometria de quadriceps",
      "rowing",
      "bosu ball squat",
      "push-up plus",
    ],
    category: CATEGORIES.STRENGTHENING,
  },
];

async function enrich() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`--- Starting Clinical Data Enrichment ${isDryRun ? "(DRY RUN)" : ""} ---`);

  const exercises = await sql`SELECT id, name, slug, category_id FROM exercises`;
  console.log(`Analyzing ${exercises.length} exercises.`);

  let updatedCount = 0;
  let preservedCount = 0;
  let skippedCount = 0;

  for (const exercise of exercises) {
    const nameLower = exercise.name.toLowerCase();
    const slugLower = exercise.slug.toLowerCase();
    const combined = `${nameLower} ${slugLower}`;

    let clinicalCategoryId = null;

    // Apply rules in order of specificity
    for (const rule of MAPPING_RULES) {
      if (rule.keywords.some((k) => combined.includes(k))) {
        clinicalCategoryId = rule.category;
        break;
      }
    }

    if (clinicalCategoryId && clinicalCategoryId !== exercise.category_id) {
      if (!isDryRun) {
        await sql`UPDATE exercises SET category_id = ${clinicalCategoryId}, updated_at = NOW() WHERE id = ${exercise.id}`;
      }
      console.log(`[CLINICAL] ${exercise.name}: ${exercise.category_id} -> ${clinicalCategoryId}`);
      updatedCount++;
    } else if (clinicalCategoryId === exercise.category_id) {
      // Already matches or already clinical
      skippedCount++;
    } else {
      // console.log(`[PRESERVED] ${exercise.name} (Body part category kept)`);
      preservedCount++;
    }
  }

  console.log("--- Summary ---");
  console.log(`Total Recategorized to Clinical: ${updatedCount}`);
  console.log(`Total Preserved (Body Part): ${preservedCount}`);
  console.log(`Total Already Correct/Skipped: ${skippedCount}`);
  console.log("----------------");
  if (isDryRun) {
    console.log("NOTE: This was a dry run. No changes were made to the database.");
  }
}

enrich().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
