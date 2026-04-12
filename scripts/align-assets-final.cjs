const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

const finalMappings = [
  // Broken Path Fixes
  { name: "Flexão de Quadril com Vassoura", path: "/exercises/illustrations/abducao-quadril-pe.avif" },
  { name: "Lunge com Rotação", path: "/exercises/illustrations/afundo-frontal-lunge.avif" },

  // Final 28 Remote Items
  { name: "Pular Corda Imaginária", path: "/exercises/illustrations/box-jump.avif" },
  { name: "Medicine Ball Slam", path: "/exercises/illustrations/agachamento-com-soco.avif" },
  { name: "Extensão de Ombro em Pronação", path: "/exercises/illustrations/barra-fixa-pronada.avif" },
  { name: "Rolling com Foam Roller", path: "/exercises/illustrations/mckenzie-extensao-lombar-deitado.avif" },
  { name: "Salto Horizontal (Broad Jump)", path: "/exercises/illustrations/box-jump.avif" },
  { name: "Step Touch com Braços", path: "/exercises/illustrations/marcha-paralela.avif" },
  { name: "Scorpion Stretch", path: "/exercises/illustrations/alongamento-de-piriforme-4-supino.avif" },
  { name: "Salto Unilateral na Caixa", path: "/exercises/illustrations/box-jump.avif" },
  { name: "Mobilização Cervical com Toalha", path: "/exercises/illustrations/alongamento-lateral-de-pescoco.avif" },
  { name: "Heel Flicks (Calcanhar no Glúteo)", path: "/exercises/illustrations/marcha-paralela.avif" },
  { name: "Polichinelo Adaptado", path: "/exercises/illustrations/agachamento-com-soco.avif" },
  { name: "Marcha Supina de Quadril", path: "/exercises/illustrations/elevacao-perna-reta.avif" },
  { name: "L-Sit (Sustentação em L)", path: "/exercises/illustrations/prancha-abdominal.avif" },
  { name: "Hip Airplane", path: "/exercises/illustrations/abducao-de-quadril-em-pe.avif" },
  { name: "Mobilização Patelar", path: "/exercises/illustrations/quadriceps-arco-curto.avif" },
  { name: "Extensão de Punho com Halter", path: "/exercises/illustrations/desvio-radial-de-punho.avif" },
  { name: "Mergulho no Banco (Tríceps)", path: "/exercises/illustrations/alongamento-triceps-sentado.avif" },
  { name: "Stiff Unilateral", path: "/exercises/illustrations/deadlift_dumbbells.avif" },
  { name: "Prone Y-T-W", path: "/exercises/illustrations/alongamento-de-peitoral-no-canto.avif" },
  { name: "Stretching Global Ativo", path: "/exercises/illustrations/respiracao-diafragmatica.avif" },
  { name: "Rotação de Ombro com Toalha", path: "/exercises/illustrations/mobilizacao-ombro-bastao.avif" },
  { name: "Mobilização de Nervo Ulnar", path: "/exercises/illustrations/deslizamento-nervo-mediano.avif" },
  { name: "Face Pull", path: "/exercises/illustrations/rotacao-externa-ombro.avif" },
  { name: "Mini-Landing Protocol", path: "/exercises/illustrations/salto-unipodal-aterrissagem.avif" },
  { name: "Squeeze de Bola (Espalmar)", path: "/exercises/illustrations/fortalecimento-preensao-bolinha.avif" },
  { name: "Mobilização de Coluna Thorácica com Foam Roller", path: "/exercises/illustrations/mckenzie-extensao-lombar-deitado.avif" },
  { name: "Pronação e Supinação de Punho", path: "/exercises/illustrations/desvio-radial-de-punho.avif" },
  { name: "Extensão de Punho", path: "/exercises/illustrations/desvio-radial-de-punho.avif" }
];

async function alignFinalAssets() {
  console.log(`Starting final asset alignment for ${finalMappings.length} exercises...`);
  let updatedCount = 0;

  for (const m of finalMappings) {
    try {
      await sql`
        UPDATE exercises 
        SET image_url = ${m.path}, updated_at = NOW()
        WHERE name = ${m.name}
      `;
      console.log(`- Updated: ${m.name} -> ${m.path}`);
      updatedCount++;
    } catch (err) {
      console.error(`- Error updating ${m.name}:`, err.message);
    }
  }

  console.log(`Successfully updated ${updatedCount} exercises.`);
}

alignFinalAssets().catch(console.error);
