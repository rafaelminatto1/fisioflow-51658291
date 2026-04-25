const fs = require("fs");
const path = require("path");

// REMOTE_EXERCISES received from DB query
const remoteExercises = [
  { name: "Espirometria Incentivada", slug: "espirometria-incentivada" },
  { name: "Eversão de Tornozelo com Faixa", slug: "eversao-de-tornozelo-com-faixa" },
  { name: "Exercício de Parede para Ombro", slug: "exercicio-de-parede-para-ombro" },
  { name: "Expansão Torácica unilateral", slug: "expansao-toracica-unilateral" },
  { name: "Extensão de Cotovelo (Tricep)", slug: "extensao-de-cotovelo-tricep" },
  { name: "Extensão de Cotovelo com Garrafa", slug: "extensao-de-cotovelo-com-garrafa" },
  { name: "Extensão de Dedos", slug: "extensao-de-dedos" },
  { name: "Extensão de Ombro em Pronação", slug: "extensao-de-ombro-em-pronacao" },
  { name: "Extensão de Punho", slug: "extensao-de-punho" },
  { name: "Extensão de Punho com Halter", slug: "extensao-de-punho-com-halter" },
  { name: "Face Pull", slug: "face-pull" },
  {
    name: "Farmer's Carry (Caminhada do Fazendeiro)",
    slug: "farmers-carry-caminhada-do-fazendeiro",
  },
  { name: "Flexão de Braço na Parede", slug: "flexao-de-braco-na-parede" },
  { name: "Flexão de Cotovelo (Bicep Curl)", slug: "flexao-de-cotovelo-bicep-curl" },
  { name: "Flexão de Punho", slug: "flexao-de-punho" },
  { name: "Flexão de Punho com Halter", slug: "flexao-de-punho-com-halter" },
  { name: "Flexão de Quadril com Vassoura", slug: "flexao-de-quadril-com-vassoura" },
  { name: "Gait Training com Obstáculos", slug: "gait-training-com-obstaculos" },
  { name: "Gato-Camelo", slug: "gato-camelo" },
  { name: "Heel Flicks (Calcanhar no Glúteo)", slug: "heel-flicks-calcanhar-no-gluteo" },
  { name: "Hip Airplane", slug: "hip-airplane" },
  { name: "Hollow Rock (Canoa)", slug: "hollow-rock-canoa" },
  { name: "Huff Cough", slug: "huff-cough" },
  { name: "Inversão de Tornozelo com Faixa", slug: "inversao-de-tornozelo-com-faixa" },
  { name: "Isometria Cervical (Extensão)", slug: "isometria-cervical-extensao" },
  { name: "Isometria Cervical (Inclinção Lateral)", slug: "isometria-cervical-inclincao-lateral" },
  { name: "L-Sit (Sustentação em L)", slug: "l-sit-sustentacao-em-l" },
  { name: "Leg Press 45°", slug: "leg-press-45" },
  { name: "Levantamento Terra", slug: "levantamento-terra" },
  { name: "Lunge com Rotação", slug: "lunge-com-rotacao" },
  { name: "Marcha Estacionária Alta", slug: "marcha-estacionaria-alta" },
  { name: "Marcha Supina de Quadril", slug: "marcha-supina-de-quadril" },
  { name: "Marcha com Padrões Cruzados", slug: "marcha-com-padroes-cruzados" },
  { name: "Medicine Ball Slam", slug: "medicine-ball-slam" },
  { name: "Mergulho no Banco (Tríceps)", slug: "mergulho-no-banco-triceps" },
  { name: "Mini-Landing Protocol", slug: "mini-landing-protocol" },
  { name: "Mobilidade de Tornozelo", slug: "mobilidade-de-tornozelo" },
  { name: "Mobilidade do Hálux", slug: "mobilidade-do-halux" },
  { name: "Mobilização Cervical com Toalha", slug: "mobilizacao-cervical-com-toalha" },
  { name: "Mobilização Patelar", slug: "mobilizacao-patelar" },
  {
    name: "Mobilização de Coluna Thorácica com Foam Roller",
    slug: "mobilizacao-de-coluna-thoracica-com-foam-roller",
  },
  { name: "Mobilização de Escápula (Wall Slides)", slug: "mobilizacao-de-escapula-wall-slides" },
  { name: "Mobilização de Nervo Ciático (Slump)", slug: "mobilizacao-de-nervo-ciatico-slump" },
  { name: "Mobilização de Nervo Ulnar", slug: "mobilizacao-de-nervo-ulnar" },
  { name: "Mobilização de Tornozelo em DF", slug: "mobilizacao-de-tornozelo-em-df" },
  { name: "Monster Walk (Caminhada Monster)", slug: "monster-walk-caminhada-monster" },
  { name: "Nordic Hamstring Curl", slug: "nordic-hamstring-curl" },
  { name: "Oposição de Dedos", slug: "oposicao-de-dedos" },
  { name: "Pallof Press", slug: "pallof-press" },
  { name: "Panturrilha em Pé", slug: "panturrilha-em-pe" },
  { name: "Perdigueiro (Bird Dog)", slug: "perdigueiro-bird-dog" },
  { name: "Polichinelo Adaptado", slug: "polichinelo-adaptado" },
  { name: "Ponte Unilateral", slug: "ponte-unilateral" },
  { name: "Ponte de Glúteo Bilateral", slug: "ponte-de-gluteo-bilateral" },
  { name: "Ponte de Glúteo Unilateral", slug: "ponte-de-gluteo-unilateral" },
  { name: "Postura da Criança", slug: "postura-da-crianca" },
  { name: "Prancha Abdominal (Plank)", slug: "prancha-abdominal-plank" },
  { name: "Prancha na Parede", slug: "prancha-na-parede" },
  { name: "Preensão de Toalha com os Dedos", slug: "preensao-de-toalha-com-os-dedos" },
  { name: "Pronação e Supinação de Punho", slug: "pronacao-e-supinacao-de-punho" },
  { name: "Prone Y-T-W", slug: "prone-y-t-w" },
  { name: "Propriocepção em Disco", slug: "propriocepcao-em-disco" },
  { name: "Pular Corda Imaginária", slug: "pular-corda-imaginaria" },
  { name: "Push-up Plus", slug: "push-up-plus" },
  { name: "RDL (Romanian Deadlift)", slug: "rdl-romanian-deadlift" },
  { name: "Relaxamento Progressivo de Jacobson", slug: "relaxamento-progressivo-de-jacobson" },
  { name: "Remada Curvada (Barbell Row)", slug: "remada-curvada-barbell-row" },
  { name: "Remada Sentada com Faixa", slug: "remada-sentada-com-faixa" },
  { name: "Respiração 4-7-8", slug: "respiracao-4-7-8" },
  { name: "Respiração Costal Inferior", slug: "respiracao-costal-inferior" },
  {
    name: "Respiração com Labios Franzidos (Pursed Lip)",
    slug: "respiracao-com-labios-franzidos-pursed-lip",
  },
  { name: "Rolling com Foam Roller", slug: "rolling-com-foam-roller" },
  { name: "Rotação Externa de Ombro com Faixa", slug: "rotacao-externa-de-ombro-com-faixa" },
  { name: "Rotação Interna de Ombro com Faixa", slug: "rotacao-interna-de-ombro-com-faixa" },
  { name: "Rotação Torácica Sentado", slug: "rotacao-toracica-sentado" },
  { name: "Rotação Torácica em 4 Apoios", slug: "rotacao-toracica-em-4-apoios" },
  { name: "Rotação de Ombro com Toalha", slug: "rotacao-de-ombro-com-toalha" },
  { name: "Rowing com Faixa Elástica", slug: "rowing-com-faixa-elastica" },
  { name: "SLR com Dorsiflexão Automática", slug: "slr-com-dorsiflexao-automatica" },
  { name: "Salto Horizontal (Broad Jump)", slug: "salto-horizontal-broad-jump" },
  { name: "Salto Unilateral na Caixa", slug: "salto-unilateral-na-caixa" },
  { name: "Scorpion Stretch", slug: "scorpion-stretch" },
  { name: "Side Plank (Prancha Lateral)", slug: "side-plank-prancha-lateral" },
  {
    name: "Single Leg Stance com Movimento de Braço",
    slug: "single-leg-stance-com-movimento-de-braco",
  },
  { name: "Sit-to-Stand", slug: "sit-to-stand" },
  { name: "Squat Jump", slug: "squat-jump" },
  { name: "Squeeze de Bola (Espalmar)", slug: "squeeze-de-bola-espalmar" },
  { name: "Star Excursion Balance Test (SEBT)", slug: "star-excursion-balance-test-sebt" },
  { name: "Step Down", slug: "step-down" },
  { name: "Step Touch com Braços", slug: "step-touch-com-bracos" },
  { name: "Step Up", slug: "step-up" },
  { name: "Stiff Unilateral", slug: "stiff-unilateral" },
  { name: "Stretching Global Ativo", slug: "stretching-global-ativo" },
  { name: "Subida de Escada", slug: "subida-de-escada" },
  { name: "Superman", slug: "superman" },
  { name: "Thomas Test Stretch", slug: "thomas-test-stretch" },
  { name: "V-Up (Abdominal Canivete)", slug: "v-up-abdominal-canivete" },
  { name: "World's Greatest Stretch", slug: "worlds-greatest-stretch" },
];

const localAssetsDir = "public/exercises/illustrations/";
const localFiles = fs.readdirSync(localAssetsDir).filter((f) => f.endsWith(".avif"));

console.log(
  `Auditing ${remoteExercises.length} remote exercises against ${localFiles.length} local files...\n`,
);

const matches = [];

remoteExercises.forEach((ex) => {
  // Strategy 1: Direct slug match
  let match = localFiles.find((f) => f === `${ex.slug}.avif`);

  // Strategy 2: Fuzzy slug match
  if (!match) {
    match = localFiles.find((f) => f.includes(ex.slug));
  }

  // Strategy 3: Manual overrides for known mismatches
  if (!match) {
    if (ex.slug === "gato-camelo") match = "cat-cow-gato-camelo.avif" || "gato-vaca.avif";
    if (ex.slug === "prancha-abdominal-plank") match = "prancha-abdominal.avif";
    if (ex.slug === "side-plank-prancha-lateral") match = "prancha-lateral.avif";
    if (ex.slug === "perdigueiro-bird-dog") match = "bird-dog.avif";
    if (ex.slug === "v-up-abdominal-canivete") match = "canivete-v-up.avif";
    if (ex.slug === "farmers-carry-caminhada-do-fazendeiro") match = "farmer_walk.avif";
    if (ex.slug === "flexao-de-cotovelo-bicep-curl") match = "bicep-curl-martelo.avif"; // Close enough for audit
    if (ex.slug === "flexao-de-punho-com-halter") match = "radial-deviation-wrist.avif"; // Need review
  }

  if (match && localFiles.includes(match)) {
    matches.push({
      slug: ex.slug,
      localFile: match,
      newUrl: `/exercises/illustrations/${match}`,
    });
  }
});

console.log("--- FOUND MATCHES ---");
matches.forEach((m) => {
  console.log(
    `UPDATE exercises SET image_url = '${m.newUrl}', thumbnail_url = '${m.newUrl}' WHERE slug = '${m.slug}' AND image_url LIKE 'http%';`,
  );
});
console.log(`\nTotal matches found: ${matches.length}`);
