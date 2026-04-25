/**
 * Seed Neon PostgreSQL — FisioFlow
 * Exercícios, Protocolos e Wiki com dados reais de fisioterapia
 *
 * Run: DATABASE_URL="..." npx tsx scripts/seed-neon.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/server/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL não definida");

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// ============================================================
// CATEGORIAS DE EXERCÍCIOS
// ============================================================

const CATEGORIES = [
  { slug: "joelho", name: "Joelho", icon: "🦵", color: "#3B82F6", orderIndex: 1 },
  { slug: "ombro", name: "Ombro", icon: "💪", color: "#8B5CF6", orderIndex: 2 },
  { slug: "coluna", name: "Coluna", icon: "🦴", color: "#10B981", orderIndex: 3 },
  { slug: "quadril", name: "Quadril", icon: "🏃", color: "#F59E0B", orderIndex: 4 },
  { slug: "tornozelo", name: "Tornozelo / Pé", icon: "👣", color: "#EF4444", orderIndex: 5 },
  { slug: "neurologia", name: "Neurologia", icon: "🧠", color: "#6366F1", orderIndex: 6 },
  { slug: "respiratorio", name: "Respiratório", icon: "🫁", color: "#06B6D4", orderIndex: 7 },
  { slug: "core", name: "Core / Estabilização", icon: "⚡", color: "#84CC16", orderIndex: 8 },
  { slug: "funcional", name: "Funcional / AVDs", icon: "🎯", color: "#F97316", orderIndex: 9 },
  { slug: "esportivo", name: "Retorno ao Esporte", icon: "⚽", color: "#EC4899", orderIndex: 10 },
];

// ============================================================
// EXERCÍCIOS
// ============================================================

const EXERCISES = [
  // ── JOELHO ──────────────────────────────────────────────
  {
    slug: "agachamento-parede",
    name: "Agachamento na Parede (Wall Squat)",
    categorySlug: "joelho",
    difficulty: "iniciante" as const,
    description:
      "Exercício isométrico para fortalecimento do quadríceps com apoio de parede. Ideal para as fases iniciais de reabilitação de joelho.",
    instructions: `1. Posicione-se de costas para a parede com os pés afastados na largura dos ombros\n2. Deslize a coluna pela parede até os joelhos formarem ângulo de 60-90°\n3. Mantenha os joelhos alinhados com os 2º e 3º dedos dos pés\n4. Segure por 30-60 segundos sem prender a respiração\n5. Retorne à posição inicial deslizando a coluna para cima`,
    tips: "Não ultrapasse 90° de flexão nas fases iniciais. Progrida o ângulo conforme tolerância.",
    musclesPrimary: ["Quadríceps (reto femoral, vasto medial, vasto lateral)", "Glúteo médio"],
    musclesSecondary: ["Isquiotibiais", "Gastrocnêmio"],
    bodyParts: ["Joelho", "Quadril"],
    equipment: ["Parede"],
    setsRecommended: 3,
    repsRecommended: 10,
    durationSeconds: 30,
    restSeconds: 45,
    pathologiesIndicated: [
      "Condromalácia patelar",
      "Tendinopatia patelar",
      "Pós-operatório LCA",
      "Artrose de joelho",
    ],
    tags: ["isometrico", "quadriceps", "cadeia_fechada", "sem_equipamento"],
  },
  {
    slug: "elevacao-perna-reta",
    name: "Elevação de Perna Reta (SLR)",
    categorySlug: "joelho",
    difficulty: "iniciante" as const,
    description:
      "Exercício clássico de fortalecimento do quadríceps em cadeia aberta, indicado nas fases pós-operatórias precoces.",
    instructions: `1. Deite em decúbito dorsal com uma perna fletida (apoio) e a outra estendida\n2. Contraia o quadríceps da perna a ser elevada (joelho "trancado")\n3. Eleve a perna a 45° em relação ao solo\n4. Mantenha por 2-3 segundos na posição elevada\n5. Desça lentamente (4 segundos)`,
    tips: "Mantenha o joelho estendido durante todo o movimento. Se houver dor na virilha, verifique posicionamento.",
    musclesPrimary: ["Quadríceps", "Reto femoral", "Iliopsoas"],
    musclesSecondary: ["Vasto medial oblíquo (VMO)", "Tensor da fáscia lata"],
    bodyParts: ["Joelho", "Quadril"],
    equipment: [],
    setsRecommended: 3,
    repsRecommended: 15,
    restSeconds: 30,
    pathologiesIndicated: [
      "Pós-operatório LCA fase 1",
      "Condromalácia patelar",
      "Síndrome patelofemoral",
    ],
    tags: ["cadeia_aberta", "quadriceps", "pos_operatorio_precoce", "sem_equipamento"],
  },
  {
    slug: "extensao-joelho-cadeira",
    name: "Extensão de Joelho na Cadeira",
    categorySlug: "joelho",
    difficulty: "iniciante" as const,
    description:
      "Fortalecimento do quadríceps em cadeia aberta com resistência progressiva. Use amplitude reduzida (90-40°) em casos patelofemoral.",
    instructions: `1. Sente na borda de uma cadeira com a coluna ereta\n2. Encaixe o peso (caneleira) no tornozelo\n3. Estenda o joelho de 90° até a extensão completa\n4. Mantenha por 2 segundos com joelho estendido\n5. Retorne lentamente em 4 segundos`,
    musclesPrimary: ["Quadríceps (4 porções)"],
    musclesSecondary: ["Reto femoral"],
    bodyParts: ["Joelho"],
    equipment: ["Cadeira", "Caneleira"],
    setsRecommended: 3,
    repsRecommended: 12,
    restSeconds: 60,
    pathologiesIndicated: ["Artrose leve a moderada", "Pós-operatório LCA fase 2-3"],
    pathologiesContraindicated: ["Síndrome patelofemoral (amplitude completa)"],
    tags: ["cadeia_aberta", "quadriceps", "caneleira"],
  },
  {
    slug: "step-up-frontal",
    name: "Step Up Frontal",
    categorySlug: "joelho",
    difficulty: "intermediario" as const,
    description:
      "Exercício funcional de subida de degrau para fortalecimento de quadríceps e glúteos em cadeia fechada. Excelente para retorno às AVDs.",
    instructions: `1. Posicione-se na frente de um step ou degrau de 15-20cm\n2. Apoie o pé da perna trabalhada sobre o step\n3. Empurre o calcanhar contra o step e suba\n4. Coloque o outro pé ao lado no alto do step\n5. Desça controladamente — a perna exercitada faz o excêntrico`,
    tips: "Controle o joelho para não cair em valgo. Progrida a altura do step gradualmente.",
    musclesPrimary: ["Quadríceps", "Glúteo máximo"],
    musclesSecondary: ["Glúteo médio", "Isquiotibiais", "Gêmeos"],
    bodyParts: ["Joelho", "Quadril"],
    equipment: ["Step", "Degrau"],
    setsRecommended: 3,
    repsRecommended: 10,
    restSeconds: 60,
    pathologiesIndicated: [
      "Pós-operatório LCA fase 3-4",
      "Artrose leve",
      "Fraqueza funcional de MMII",
    ],
    tags: ["cadeia_fechada", "funcional", "step", "gluteo", "quadriceps"],
  },
  {
    slug: "tke-thera-band",
    name: "Terminal Knee Extension (TKE) com Thera-Band",
    categorySlug: "joelho",
    difficulty: "intermediario" as const,
    description:
      "Ativação específica do VMO nos últimos 30° de extensão. Fundamental na reabilitação patelofemoral e pós-LCA.",
    instructions: `1. Prenda a Thera-Band em suporte na altura do joelho, ancore no joelho flexionado\n2. Dê um passo para trás criando tensão na banda\n3. Estenda o joelho completamente contraindo o VMO\n4. Mantenha 2 segundos e retorne controladamente\n5. Não hiperestenda o joelho`,
    musclesPrimary: ["Vasto medial oblíquo (VMO)", "Quadríceps"],
    musclesSecondary: ["Glúteo médio", "Tibial anterior"],
    bodyParts: ["Joelho"],
    equipment: ["Thera-Band", "Faixa elástica"],
    setsRecommended: 3,
    repsRecommended: 15,
    restSeconds: 45,
    pathologiesIndicated: ["Síndrome patelofemoral", "Condromalácia patelar", "Pós-operatório LCA"],
    tags: ["VMO", "thera_band", "cadeia_fechada", "patelofemoral"],
  },

  // ── OMBRO ───────────────────────────────────────────────
  {
    slug: "pendulo-codman",
    name: "Exercício Pêndulo de Codman",
    categorySlug: "ombro",
    difficulty: "iniciante" as const,
    description:
      "Exercício de mobilização passiva precoce do ombro pela gravidade. Indicado nas primeiras 24-48h pós-cirurgia ou trauma.",
    instructions: `1. Incline-se para frente apoiando o braço saudável em uma mesa\n2. Deixe o braço afetado pender livremente pela gravidade\n3. Realize movimentos circulares suaves (sentido horário e anti-horário)\n4. Movimentos de frente-atrás e lado a lado\n5. Amplitude de 20-30cm de diâmetro inicialmente`,
    tips: "NÃO use musculatura do ombro — a força vem do balanço do tronco. Inicie com movimentos mínimos.",
    musclesPrimary: ["Passivo — sem ativação muscular"],
    musclesSecondary: ["Capsular glenoumeral"],
    bodyParts: ["Ombro"],
    equipment: ["Mesa ou cadeira para apoio"],
    setsRecommended: 3,
    repsRecommended: 20,
    pathologiesIndicated: [
      "Pós-operatório de ombro precoce",
      "Capsulite adesiva fase 1",
      "Luxação glenoumeral",
    ],
    tags: ["mobilizacao_passiva", "pos_operatorio_precoce", "codman", "capsulite"],
  },
  {
    slug: "rotacao-externa-ombro",
    name: "Rotação Externa de Ombro com Thera-Band",
    categorySlug: "ombro",
    difficulty: "intermediario" as const,
    description:
      "Fortalecimento do manguito rotador (infraespinhal e redondo menor). Essencial para estabilização dinâmica glenoumeral.",
    instructions: `1. Posicione o cotovelo a 90° ao lado do corpo com uma toalha dobrada entre o cotovelo e o tórax\n2. Segure a Thera-Band com a mão do lado exercitado\n3. Gire o antebraço para fora (rotação externa) sem mover o cotovelo\n4. Mantenha 2 segundos no final da amplitude\n5. Retorne controladamente — 4 segundos`,
    tips: 'A toalha mantém o ombro em 0° de abdução. Não deixe o cotovelo "voar" para fora.',
    musclesPrimary: ["Infraespinhal", "Redondo menor"],
    musclesSecondary: ["Deltoide posterior", "Supraespinhal"],
    bodyParts: ["Ombro"],
    equipment: ["Thera-Band", "Toalha"],
    setsRecommended: 3,
    repsRecommended: 15,
    restSeconds: 45,
    pathologiesIndicated: [
      "Lesão de manguito rotador",
      "Instabilidade glenoumeral",
      "Pós-operatório de ombro fase 2",
    ],
    tags: ["manguito_rotador", "thera_band", "rotacao_externa", "estabilizacao"],
  },
  {
    slug: "rotacao-interna-ombro",
    name: "Rotação Interna de Ombro com Thera-Band",
    categorySlug: "ombro",
    difficulty: "intermediario" as const,
    description:
      "Fortalecimento do subescapular — principal rotador interno e estabilizador anterior do ombro.",
    instructions: `1. Prenda a Thera-Band em suporte lateral\n2. Cotovelo a 90° ao lado do corpo\n3. Inicie com antebraço apontando para frente (posição neutra)\n4. Gire o antebraço em direção ao abdome (rotação interna)\n5. Retorne lentamente`,
    musclesPrimary: ["Subescapular"],
    musclesSecondary: ["Redondo maior", "Peitoral maior", "Latíssimo do dorso"],
    bodyParts: ["Ombro"],
    equipment: ["Thera-Band"],
    setsRecommended: 3,
    repsRecommended: 15,
    restSeconds: 45,
    pathologiesIndicated: ["Instabilidade posterior", "Reabilitação de ombro fase 2-3"],
    tags: ["manguito_rotador", "thera_band", "rotacao_interna", "subescapular"],
  },

  // ── COLUNA ──────────────────────────────────────────────
  {
    slug: "bird-dog",
    name: "Bird Dog (Cão Pássaro)",
    categorySlug: "coluna",
    difficulty: "iniciante" as const,
    description:
      "Exercício de estabilização da coluna com ativação de multífidos, transverso e extensores do quadril. Base de qualquer protocolo de lombalgia.",
    instructions: `1. Posicione-se em 4 apoios (joelhos e mãos) — "posição de mesa"\n2. Mantenha a coluna lombar em posição neutra (nem lordose exagerada nem cifose)\n3. Estenda simultaneamente o braço direito e a perna esquerda\n4. Mantenha 5-10 segundos sem perder o alinhamento pélvico\n5. Retorne e alterne os lados`,
    tips: "Imagine um copo d'água sobre as costas — não deixe cair. Ative o assoalho pélvico antes de elevar.",
    musclesPrimary: ["Multífidos", "Transverso do abdome", "Glúteo máximo"],
    musclesSecondary: ["Extensores da coluna", "Deltóide", "Isquiotibiais"],
    bodyParts: ["Coluna lombar", "Core"],
    equipment: ["Colchonete"],
    setsRecommended: 3,
    repsRecommended: 10,
    durationSeconds: 10,
    restSeconds: 30,
    pathologiesIndicated: [
      "Lombalgia crônica",
      "Hérnia de disco lombar",
      "Instabilidade lombar",
      "Pós-operatório lombar",
    ],
    tags: ["core", "estabilizacao_lombar", "multifidos", "sem_equipamento"],
  },
  {
    slug: "ponte-gluteo",
    name: "Ponte de Glúteo (Glute Bridge)",
    categorySlug: "coluna",
    difficulty: "iniciante" as const,
    description:
      "Ativação de glúteo máximo e isquiotibiais com estabilização lombar. Um dos exercícios mais versáteis da reabilitação.",
    instructions: `1. Deite em decúbito dorsal com joelhos fletidos a 90° e pés apoiados no solo\n2. Ative o assoalho pélvico (contração leve)\n3. Eleve o quadril formando uma linha reta do joelho ao ombro\n4. Contraia glúteos no topo — mantenha 2 segundos\n5. Desça controladamente vértebra por vértebra`,
    tips: "Não hiperextenda a lombar no topo. Progrida para single-leg bridge ou com peso no abdome.",
    musclesPrimary: ["Glúteo máximo", "Isquiotibiais"],
    musclesSecondary: ["Multífidos", "Transverso do abdome", "Glúteo médio"],
    bodyParts: ["Coluna lombar", "Quadril", "Core"],
    equipment: ["Colchonete"],
    setsRecommended: 3,
    repsRecommended: 15,
    restSeconds: 30,
    pathologiesIndicated: ["Lombalgia crônica", "Insuficiência de glúteo", "Dor sacroilíaca"],
    tags: ["gluteo", "core", "sem_equipamento", "funcional", "estabilizacao_lombar"],
  },
  {
    slug: "cat-camel",
    name: "Cat-Camel (Mobilização Lombar)",
    categorySlug: "coluna",
    difficulty: "iniciante" as const,
    description:
      "Mobilização em flexão-extensão da coluna para manutenção da hidratação discal e mobilidade segmentar.",
    instructions: `1. Posição de 4 apoios com coluna neutra\n2. "Gato": arqueie a coluna para cima (flexão — cifose)\n3. Mantenha 3 segundos\n4. "Camelo": deixe a barriga cair (extensão — lordose)\n5. Mantenha 3 segundos\n6. Realize o movimento de forma lenta e controlada`,
    musclesPrimary: ["Extensores da coluna", "Reto abdominal"],
    musclesSecondary: ["Multífidos", "Eretores"],
    bodyParts: ["Coluna"],
    equipment: ["Colchonete"],
    setsRecommended: 2,
    repsRecommended: 10,
    restSeconds: 20,
    pathologiesIndicated: [
      "Lombalgia aguda",
      "Rigidez matinal",
      "Hérnia de disco (exceto extensão aguda)",
    ],
    tags: ["mobilizacao", "coluna", "sem_equipamento", "flexibilidade"],
  },

  // ── QUADRIL ─────────────────────────────────────────────
  {
    slug: "clamshell",
    name: "Clamshell (Concha do Mar)",
    categorySlug: "quadril",
    difficulty: "iniciante" as const,
    description:
      "Isolamento do glúteo médio em rotação externa. Essencial para correção de valgo dinâmico e síndrome da dor femoropatelar.",
    instructions: `1. Deite de lado com quadris e joelhos fletidos a 45°\n2. Mantenha os pés juntos e a pelve estável\n3. Abra o joelho superior como uma concha abrindo\n4. Mantenha 2 segundos no topo sem rotar o tronco\n5. Desça controladamente`,
    tips: 'Se o quadril "fugir" para trás, reduza a amplitude. Adicione Thera-Band para progressão.',
    musclesPrimary: ["Glúteo médio", "Glúteo mínimo"],
    musclesSecondary: ["Piriforme", "Obturador externo", "Gemelos"],
    bodyParts: ["Quadril"],
    equipment: ["Colchonete"],
    setsRecommended: 3,
    repsRecommended: 15,
    restSeconds: 30,
    pathologiesIndicated: [
      "Síndrome patelofemoral",
      "Tendinopatia glútea",
      "Síndrome do piriforme",
      "Dor femoropatelar",
    ],
    tags: ["gluteo_medio", "quadril", "sem_equipamento", "estabilizacao"],
  },
  {
    slug: "abducao-quadril-pe",
    name: "Abdução de Quadril em Pé com Thera-Band",
    categorySlug: "quadril",
    difficulty: "intermediario" as const,
    description:
      "Fortalecimento funcional do glúteo médio em cadeia fechada. Fundamental para marcha e controle pélvico.",
    instructions: `1. Prenda a Thera-Band nos tornozelos\n2. Apoie-se em uma superfície para equilíbrio se necessário\n3. Afaste a perna para o lado sem inclinação do tronco\n4. Mantenha 2 segundos no máximo da amplitude\n5. Retorne controladamente — não junte os pés com impacto`,
    musclesPrimary: ["Glúteo médio", "Glúteo mínimo", "Tensor da fáscia lata"],
    musclesSecondary: ["Glúteo máximo (porção superior)"],
    bodyParts: ["Quadril"],
    equipment: ["Thera-Band"],
    setsRecommended: 3,
    repsRecommended: 12,
    restSeconds: 45,
    pathologiesIndicated: ["Fraqueza de glúteo médio", "Valgo dinâmico", "Síndrome do TFL"],
    tags: ["gluteo_medio", "thera_band", "marcha", "funcional"],
  },

  // ── TORNOZELO ───────────────────────────────────────────
  {
    slug: "elevacao-calcanhares",
    name: "Elevação de Calcanhares (Heel Raises)",
    categorySlug: "tornozelo",
    difficulty: "iniciante" as const,
    description:
      "Fortalecimento do complexo sural (gastrocnêmio e sóleo) em cadeia fechada. Fundamental na reabilitação de tendinopatia de Aquiles.",
    instructions: `1. Posicione-se em pé com os pés paralelos, largura dos ombros\n2. Suba na ponta dos pés elevando ao máximo os calcanhares\n3. Mantenha 2 segundos no topo\n4. Desça LENTAMENTE em 4-6 segundos (componente excêntrico é o mais importante)\n5. Progrida para unipodal quando fortalecer`,
    tips: "O componente excêntrico (descida lenta) é mais terapêutico que a subida. No degrau, pode baixar o calcanhar abaixo do nível do step.",
    musclesPrimary: ["Gastrocnêmio", "Sóleo"],
    musclesSecondary: ["Fibulares", "Flexores longos dos dedos"],
    bodyParts: ["Tornozelo", "Pé"],
    equipment: ["Step (opcional para progressão)"],
    setsRecommended: 3,
    repsRecommended: 15,
    restSeconds: 60,
    pathologiesIndicated: [
      "Tendinopatia de Aquiles",
      "Fascite plantar",
      "Pós-entorse de tornozelo fase 2-3",
    ],
    tags: ["sural", "excentrico", "aquiles", "funcional"],
  },

  // ── NEUROLOGIA ──────────────────────────────────────────
  {
    slug: "marcha-paralela",
    name: "Treino de Marcha na Barra Paralela",
    categorySlug: "neurologia",
    difficulty: "iniciante" as const,
    description:
      "Reeducação da marcha em ambiente seguro com suporte bilateral. Indicado para pacientes com déficit neuromotor.",
    instructions: `1. Paciente posicionado entre as barras paralelas\n2. Terapeuta ao lado para supervisão e suporte\n3. Instrua: "Peso no pé direito, passe o pé esquerdo"\n4. Enfatize o padrão calcanhar-ponta\n5. Corrija desvios de tronco e valgo de joelho em tempo real`,
    tips: "Observe a simetria do passo. Use espelho anterior para feedback visual. Registre número de passos e distância.",
    musclesPrimary: ["Glúteo máximo", "Quadríceps", "Tibial anterior", "Flexores plantares"],
    musclesSecondary: ["Glúteo médio", "Isquiotibiais", "Core"],
    bodyParts: ["MMII", "Core"],
    equipment: ["Barra paralela"],
    setsRecommended: 3,
    repsRecommended: 1,
    durationSeconds: 120,
    restSeconds: 60,
    pathologiesIndicated: [
      "Hemiplegia pós-AVC",
      "Parkinson estágio 2-3",
      "Lesão medular incompleta",
      "Pós-artroplastia",
    ],
    tags: ["marcha", "neurologia", "reeducacao", "barra_paralela"],
  },

  // ── RESPIRATÓRIO ────────────────────────────────────────
  {
    slug: "respiracao-diafragmatica",
    name: "Respiração Diafragmática",
    categorySlug: "respiratorio",
    difficulty: "iniciante" as const,
    description:
      "Técnica fundamental de controle respiratório com ativação do diafragma. Base de toda fisioterapia respiratória.",
    instructions: `1. Paciente em decúbito dorsal ou sentado confortavelmente\n2. Coloque uma mão no tórax e outra no abdome\n3. Inspire pelo nariz por 4 segundos — o abdome deve elevar, não o tórax\n4. Expire lentamente pela boca por 6-8 segundos\n5. Realize 5-10 respirações conscientes`,
    tips: "A mão no tórax deve permanecer quase imóvel. Se o paciente tem DPOC, ajuste a relação I:E para 1:3 ou 1:4.",
    musclesPrimary: ["Diafragma"],
    musclesSecondary: ["Intercostais", "Escalenos (acessórios)"],
    bodyParts: ["Tórax", "Abdome"],
    equipment: [],
    setsRecommended: 1,
    repsRecommended: 10,
    pathologiesIndicated: [
      "DPOC",
      "Asma",
      "Ansiedade",
      "Pós-COVID",
      "Dor lombar (respiração deficiente)",
    ],
    tags: ["diafragma", "respiratorio", "sem_equipamento", "relaxamento"],
  },

  // ── CORE ────────────────────────────────────────────────
  {
    slug: "prancha-frontal",
    name: "Prancha Frontal (Plank)",
    categorySlug: "core",
    difficulty: "intermediario" as const,
    description:
      "Exercício isométrico de alta ativação do core global. Progressão natural após estabilização básica.",
    instructions: `1. Apoio nos antebraços e pontas dos pés\n2. Coluna em posição neutra — não arqueie ou arredonde\n3. Ative o abdome como se fosse receber um soco\n4. Mantenha a respiração — não prenda o ar\n5. Mantenha por 20-60 segundos conforme capacidade`,
    tips: "Se quadril caindo: reduza o tempo. Se lombar arqueando: coloque joelhos no solo primeiro. Progrida com elevação alternada de membros.",
    musclesPrimary: ["Transverso do abdome", "Reto abdominal", "Oblíquos"],
    musclesSecondary: ["Glúteo máximo", "Eretores da coluna", "Serrátil anterior"],
    bodyParts: ["Core", "Coluna"],
    equipment: ["Colchonete"],
    setsRecommended: 3,
    repsRecommended: 1,
    durationSeconds: 30,
    restSeconds: 45,
    pathologiesIndicated: ["Instabilidade lombar (progressão)", "Disfunção do assoalho pélvico"],
    pathologiesContraindicated: ["Lombalgia aguda com irradiação", "Hipertensão não controlada"],
    tags: ["core", "isometrico", "sem_equipamento", "progressao"],
  },

  // ── FUNCIONAL ───────────────────────────────────────────
  {
    slug: "sentar-levantar",
    name: "Sentar e Levantar da Cadeira (Sit-to-Stand)",
    categorySlug: "funcional",
    difficulty: "iniciante" as const,
    description:
      "AVD fundamental que avalia e treina força funcional de MMII. Usado como teste (5-repetition STS test) e como exercício.",
    instructions: `1. Sente na borda de uma cadeira com os pés na largura dos ombros\n2. Incline levemente o tronco para frente (nariz sobre os pés)\n3. Empurre os calcanhares no solo e levante\n4. Estenda completamente joelhos e quadril na posição em pé\n5. Desça controladamente — não "caia" na cadeira`,
    tips: "Para dificultar: sem usar os braços, mais rápido, da altura do joelho, ou com peso. Como teste: cronometre 5 repetições — < 12s é normal para adultos.",
    musclesPrimary: ["Quadríceps", "Glúteo máximo"],
    musclesSecondary: ["Isquiotibiais", "Sóleo", "Core"],
    bodyParts: ["MMII", "Quadril", "Joelho"],
    equipment: ["Cadeira"],
    setsRecommended: 3,
    repsRecommended: 10,
    restSeconds: 45,
    pathologiesIndicated: [
      "Fraqueza funcional geral",
      "Pós-artroplastia",
      "Sarcopenia",
      "Parkinson",
      "Pós-AVC",
    ],
    tags: ["funcional", "avd", "quadriceps", "gluteo", "teste_funcional"],
  },
];

// ============================================================
// PROTOCOLOS
// ============================================================

const PROTOCOLS = [
  {
    slug: "protocolo-lca-pos-cirurgico",
    name: "Protocolo de Reabilitação Pós-Cirurgia de LCA",
    conditionName: "Reconstrução do Ligamento Cruzado Anterior (LCA)",
    protocolType: "pos_operatorio" as const,
    evidenceLevel: "A" as const,
    weeksTotal: 24,
    description:
      "Protocolo baseado em evidências para reabilitação após reconstrução do LCA com enxerto autólogo (tendão patelar ou isquiotibiais). Critérios de progressão baseados em função, não tempo.",
    objectives:
      "Restaurar amplitude de movimento, força e função neuromuscular para retorno seguro ao esporte.",
    contraindications: "Infecção da ferida cirúrgica, rupturas de enxerto confirmadas por imagem.",
    icd10Codes: ["M23.61", "S83.5"],
    tags: ["lca", "pos_cirurgico", "ortopedia", "joelho"],
    phases: [
      {
        name: "Fase 1 — Inflamatória/Proteção",
        weekStart: 1,
        weekEnd: 2,
        goals: [
          "Controle da dor e edema",
          "Extensão completa passiva",
          "Ativação do quadríceps (SLR)",
          "Marcha com auxílio",
        ],
        precautions: [
          "Evitar flexão ativa de joelho acima de 90°",
          "Gelo 20min 3-4x/dia",
          "Elevação do membro",
        ],
      },
      {
        name: "Fase 2 — Fortalecimento Inicial",
        weekStart: 3,
        weekEnd: 6,
        goals: ["Flexão de 120°", "Força de quadríceps ≥ 50% contra-lateral", "Marcha sem auxílio"],
        precautions: ["Sem impacto", "Sem pivô", "Progressão gradual de carga"],
      },
      {
        name: "Fase 3 — Fortalecimento Funcional",
        weekStart: 7,
        weekEnd: 12,
        goals: ["Flexão completa", "Bicicleta ergométrica", "Exercícios proprioceptivos avançados"],
        precautions: ["Sem corrida até semana 12", "Avalie derrame articular antes de progredir"],
      },
      {
        name: "Fase 4 — Retorno Progressivo ao Esporte",
        weekStart: 13,
        weekEnd: 20,
        goals: [
          "Corrida progressiva",
          "Saltos e aterrissagens",
          "Exercícios específicos da modalidade",
        ],
        precautions: ["Limb Symmetry Index (LSI) ≥ 80% antes de iniciar corrida"],
      },
      {
        name: "Fase 5 — Retorno ao Esporte",
        weekStart: 21,
        weekEnd: 24,
        goals: ["LSI ≥ 90%", "Testes funcionais aprovados", "Confiança psicológica"],
        precautions: ["Tampa Return to Sport Score ≥ 22 pontos"],
      },
    ],
    milestones: [
      {
        week: 2,
        title: "Extensão Completa",
        criteria: [
          "0° de déficit de extensão",
          "Controle ativo do quadríceps (SLR sem extensor lag)",
        ],
        notes: "Crítico — déficit de extensão preditivo de síndrome patelofemoral",
      },
      {
        week: 6,
        title: "Marcha Normal sem Dispositivo",
        criteria: ["Padrão de marcha simétrico", "Sem antálgica", "Escada subindo sem apoio"],
      },
      {
        week: 12,
        title: "Iniciando Corrida",
        criteria: [
          "Isocinético: 70% do contra-lateral",
          "Sem derrame articular",
          "Hop test unipodal ≥ 85%",
        ],
      },
      {
        week: 20,
        title: "Treino Específico",
        criteria: ["LSI ≥ 85%", "Sem dor", "Confiança subjetiva > 7/10"],
      },
      {
        week: 24,
        title: "Alta para Esporte",
        criteria: ["LSI ≥ 90% em todos os testes", "Tampa Scale < 17", "ACL-RSI ≥ 56"],
      },
    ],
    restrictions: [
      {
        weekStart: 1,
        weekEnd: 6,
        description: "Sem impacto de qualquer tipo",
        type: "activity" as const,
      },
      { weekStart: 1, weekEnd: 12, description: "Sem corrida ou pivô", type: "activity" as const },
      {
        weekStart: 1,
        weekEnd: 4,
        description: "Peso parcial — progressão conforme tolerância",
        type: "weight_bearing" as const,
      },
    ],
    references: [
      {
        title: "Criteria for return to sport after anterior cruciate ligament reconstruction",
        authors: "Grindem H, Snyder-Mackler L, Moksnes H et al.",
        year: 2016,
        journal: "British Journal of Sports Medicine",
        doi: "10.1136/bjsports-2016-096825",
      },
      {
        title: "ACL Study Group Recommendations",
        authors: "Wilk KE, Macrina LC, Cain EL et al.",
        year: 2012,
        journal: "Journal of Orthopaedic & Sports Physical Therapy",
      },
    ],
    progressionCriteria: [
      {
        phase: "Fase 1 → 2",
        criteria: [
          "Sem derrame articular",
          "Extensão completa",
          "Flexão ≥ 90°",
          "Controle do quadríceps",
        ],
      },
      {
        phase: "Fase 2 → 3",
        criteria: ["Flexão ≥ 120°", "Marcha normal", "Força ≥ 50% contra-lateral"],
      },
      {
        phase: "Fase 3 → 4",
        criteria: ["Flexão completa", "Força ≥ 70% contra-lateral", "Sem derrame"],
      },
    ],
  },
  {
    slug: "protocolo-lombalgia-cronica",
    name: "Protocolo para Lombalgia Crônica Inespecífica",
    conditionName: "Lombalgia Crônica Inespecífica",
    protocolType: "patologia" as const,
    evidenceLevel: "A" as const,
    weeksTotal: 8,
    description:
      "Protocolo multimodal para lombalgia crônica (> 12 semanas) baseado em exercício ativo, educação em dor e ativação progressiva.",
    objectives:
      "Redução da dor, melhora da funcionalidade e autoeficácia para manejo da dor crônica.",
    icd10Codes: ["M54.5"],
    tags: ["lombalgia", "coluna", "dor_cronica", "core"],
    phases: [
      {
        name: "Fase 1 — Ativação e Educação",
        weekStart: 1,
        weekEnd: 2,
        goals: [
          "Educação em neurociência da dor",
          "Exercícios suaves de mobilidade",
          "Redução do medo de movimento",
        ],
        precautions: ["Evitar repouso prolongado", "Manter nível de atividade"],
      },
      {
        name: "Fase 2 — Estabilização",
        weekStart: 3,
        weekEnd: 5,
        goals: [
          "Ativação do transverso e multífidos",
          "Bird Dog, Dead Bug, Ponte",
          "Progressão de carga gradual",
        ],
        precautions: ["Iniciar com carga mínima", "Sem exercícios de alta carga se dor > 5/10"],
      },
      {
        name: "Fase 3 — Fortalecimento e Funcionalidade",
        weekStart: 6,
        weekEnd: 8,
        goals: [
          "Exercícios funcionais (agachamento, step)",
          "Retorno às atividades de vida diária",
          "Plano de manutenção",
        ],
        precautions: ["Monitorar flare-ups", "Estratégia de retorno à atividade"],
      },
    ],
    milestones: [
      {
        week: 2,
        title: "Mudança na Percepção da Dor",
        criteria: [
          "Compreensão do modelo biopsicossocial",
          "Redução do medo de movimento (TSK < 37)",
        ],
      },
      {
        week: 5,
        title: "Estabilidade Core",
        criteria: ["Bird Dog 10s sem compensação", "Ponte unipodal 10 reps"],
      },
      {
        week: 8,
        title: "Alta com Plano de Manutenção",
        criteria: ["PSFS ≥ 6/10", "Retorno ao trabalho/atividades", "Plano de exercícios autônomo"],
      },
    ],
    references: [
      {
        title: "Exercise therapy for chronic nonspecific low-back pain",
        authors: "Hayden JA, van Tulder MW, Malmivaara A, Koes BW",
        year: 2005,
        journal: "Cochrane Database of Systematic Reviews",
      },
    ],
    restrictions: [],
    progressionCriteria: [
      {
        phase: "Fase 1 → 2",
        criteria: [
          "Compreensão da neurofisiologia da dor",
          "Dor ≤ 4/10 no repouso",
          "Engajamento ativo",
        ],
      },
    ],
  },
  {
    slug: "protocolo-capsulite-adesiva",
    name: "Protocolo para Capsulite Adesiva (Ombro Congelado)",
    conditionName: "Capsulite Adesiva Glenoumeral",
    protocolType: "patologia" as const,
    evidenceLevel: "B" as const,
    weeksTotal: 16,
    description:
      "Protocolo progressivo para as 3 fases da capsulite adesiva: dolorosa, rígida e de recuperação.",
    objectives:
      "Recuperação gradual da amplitude de movimento glenoumeral e função do membro superior.",
    icd10Codes: ["M75.0"],
    tags: ["ombro", "capsulite", "mobilizacao", "fase_dolorosa"],
    phases: [
      {
        name: "Fase Dolorosa (Freezing)",
        weekStart: 1,
        weekEnd: 4,
        goals: ["Controle da dor", "Manutenção da amplitude disponível", "Pêndulo de Codman"],
        precautions: ["Não forçar amplitude", "Evitar movimentos bruscos", "Calor antes/gelo após"],
      },
      {
        name: "Fase Rígida (Frozen)",
        weekStart: 5,
        weekEnd: 12,
        goals: [
          "Mobilização articular grau I-III",
          "Deslizamentos capsulares",
          "Alongamentos progressivos",
        ],
        precautions: ["Mobilização abaixo do limiar de dor", "Progredir amplitude semanalmente"],
      },
      {
        name: "Fase de Recuperação (Thawing)",
        weekStart: 13,
        weekEnd: 16,
        goals: [
          "Fortalecimento do manguito rotador",
          "Exercícios funcionais acima da cabeça",
          "Retorno às atividades",
        ],
        precautions: ["Monitorar dor nas amplitudes extremas"],
      },
    ],
    milestones: [
      {
        week: 4,
        title: "Controle da Dor",
        criteria: ["Dor < 4/10 no repouso", "Sono sem despertar álgico"],
      },
      { week: 8, title: "Amplitude Mínima", criteria: ["Abdução ≥ 90°", "Rotação externa ≥ 20°"] },
      {
        week: 16,
        title: "Recuperação Funcional",
        criteria: ["Abdução ≥ 150°", "Rotação externa ≥ 50°", "Mão atrás das costas — L3"],
      },
    ],
    references: [
      {
        title:
          "Adhesive capsulitis of the shoulder: review of pathophysiology and current clinical treatments",
        authors: "Neviaser AS, Hannafin JA",
        year: 2010,
        journal: "Sports Health",
      },
    ],
    restrictions: [
      {
        weekStart: 1,
        weekEnd: 4,
        description: "Sem mobilização forçada ou passiva vigorosa",
        type: "activity" as const,
      },
    ],
    progressionCriteria: [],
  },
];

// ============================================================
// WIKI PAGES
// ============================================================

const WIKI_PAGES = [
  {
    slug: "guia-soap",
    title: "Guia de Evolução SOAP",
    icon: "📋",
    category: "clinico",
    tags: ["soap", "evolucao", "documentacao"],
    content: `# Guia de Evolução SOAP

O método SOAP é o padrão de documentação clínica em fisioterapia. Cada letra representa uma seção da evolução.

## S — Subjetivo
O que o **paciente relata**. Inclua:
- Queixa principal do dia
- Nível de dor (EVA/NPRS 0-10)
- Modificação dos sintomas desde a última sessão
- Limitações funcionais relatadas

**Exemplo:**
> "Paciente refere melhora de 30% da dor desde a última sessão. EVA 4/10 (era 6/10). Conseguiu dormir melhor, mas ainda sente dor ao subir escada."

## O — Objetivo
**Achados clínicos mensuráveis**:
- Amplitude de movimento (goniometria)
- Força muscular (escala MRC 0-5)
- Testes especiais realizados
- Observações posturais e de marcha
- Sinais vitais quando relevantes

**Exemplo:**
> "Flexão de joelho: 110° (ADM passiva). Força quadríceps: MRC 4-. Teste de Lachman: negativo."

## A — Avaliação
**Análise clínica** do terapeuta:
- Interpretação dos achados S + O
- Progresso em relação às metas
- Raciocínio clínico
- Diagnóstico cinesiológico-funcional

**Exemplo:**
> "Paciente evolui bem na fase 2 do protocolo LCA. Ganho de 20° de flexão na semana. Ainda com déficit de força que limita progressão para exercícios em cadeia fechada completa."

## P — Plano
**Próximas intervenções**:
- Exercícios para a próxima sessão
- Modificações no protocolo
- Orientações domiciliares
- Previsão de alta/reavaliação

**Exemplo:**
> "Progredir para TKE com thera-band. Iniciar bicicleta ergométrica 10min sem resistência. Orientar exercícios domiciliares (SLR 3x15). Reavaliar em 2 semanas."

---

## Dicas Importantes

⚠️ **Seja objetivo e mensurável** — "Melhorou" não é suficiente. Use números.

✅ **Use terminologia padronizada** — ADM em graus, força em MRC, dor em EVA.

📱 **Registre em até 24h** — Memória é falível, documente logo após a sessão.

🔒 **LGPD** — A evolução é documento médico legal. Mantenha sigilo e backup.
`,
  },
  {
    slug: "escalas-de-dor",
    title: "Escalas de Avaliação de Dor",
    icon: "📊",
    category: "avaliacao",
    tags: ["dor", "eva", "nprs", "escalas"],
    content: `# Escalas de Avaliação de Dor

## EVA — Escala Visual Analógica

Régua de 10cm onde o paciente marca a intensidade da dor.

- **0** = Sem dor
- **1-3** = Dor leve
- **4-6** = Dor moderada
- **7-9** = Dor intensa
- **10** = Pior dor imaginável

**Vantagem:** Simples, rápida, amplamente validada.
**Limitação:** Requer que o paciente compreenda o conceito de escala linear.

---

## NPRS — Numeric Pain Rating Scale

Versão verbal da EVA (0 a 10). Pergunte: "Em uma escala de 0 a 10, sendo 0 sem dor e 10 a pior dor possível, qual é sua dor agora?"

**Diferença Mínima Clinicamente Importante (DMCI):** 2 pontos (ou 30% de redução)

---

## PSFS — Patient-Specific Functional Scale

O paciente lista 3 atividades limitadas pela dor/incapacidade e pontua cada uma (0-10).

| Atividade | Inicial | Sessão 5 | Alta |
|---|---|---|---|
| Subir escada | 3/10 | 6/10 | 9/10 |
| Dirigir | 2/10 | 5/10 | 8/10 |
| Trabalhar | 1/10 | 4/10 | 8/10 |

**Vantagem:** Centrado no paciente, captura objetivos individuais.

---

## Escala de Catastrofização da Dor (PCS)

13 itens que avaliam pensamentos e sentimentos durante a dor. Pontuação total 0-52.
- > 30: Catastrofização clinicamente significativa
- > 38: Alta probabilidade de cronificação

**Use quando:** Suspeita de componente psicossocial relevante.

---

## Tampa Scale of Kinesiophobia (TSK)

17 itens, 0-68 pontos. Avalia medo de movimento/re-lesão.
- < 37: Baixo kinesiofobia
- ≥ 37: Kinesiofobia clinicamente relevante → trabalhar educação em dor

---

## Quando Usar Cada Escala

| Situação | Escala Recomendada |
|---|---|
| Avaliação rápida de rotina | NPRS |
| Funcionalidade específica do paciente | PSFS |
| Suspeita de catastrofização | PCS |
| Medo de movimento | TSK |
| Dor crônica complexa | NPRS + PCS + TSK |
`,
  },
  {
    slug: "testes-ortopedicos-joelho",
    title: "Testes Ortopédicos Especiais — Joelho",
    icon: "🦵",
    category: "avaliacao",
    tags: ["joelho", "testes_especiais", "ortopedia", "avaliacao"],
    content: `# Testes Ortopédicos Especiais — Joelho

## Ligamento Cruzado Anterior (LCA)

### Teste de Lachman
**Sensibilidade:** 87% | **Especificidade:** 93%

**Técnica:** Paciente em decúbito dorsal com joelho a 20-30° de flexão. Estabilize o fêmur distal com uma mão e aplique força anterior na tíbia com a outra.

**Positivo:** Translação anterior aumentada e/ou sem end-feel firme.

---

### Teste da Gaveta Anterior
**Sensibilidade:** 62% | **Especificidade:** 88%

**Técnica:** Joelho a 90°, pé fixo no leito. Aplicar força anterior na tíbia proximal.

**Positivo:** Translação anterior > 5mm em relação ao contra-lateral.

---

### Pivot Shift Test
**Sensibilidade:** 24-48% consciente / 87% sob anestesia | **Especificidade:** 98%

Teste mais específico para lesão de LCA mas de difícil realização em paciente com espasmo de defesa.

---

## Ligamento Cruzado Posterior (LCP)

### Sag Sign (Sinal do Afundamento)
**Sensibilidade:** 79% | **Especificidade:** 100%

**Técnica:** Joelhos a 90° com pés apoiados. Observe lateralmente se há afundamento posterior da tíbia.

---

## Meniscos

### McMurray
**Sensibilidade:** 53-70% | **Especificidade:** 59-98%

**Técnica:** Decúbito dorsal. Flexão máxima do joelho → Rotação externa + extensão (menisco medial) / Rotação interna + extensão (menisco lateral).

**Positivo:** Clique ou dor articular.

---

### Thessaly
**Sensibilidade:** 89% | **Especificidade:** 97%

**Técnica:** Apoio unipodal com joelho a 20° de flexão. Paciente realiza rotação do tronco 3x.

**Positivo:** Dor ou locked knee.

---

## Ligamento Colateral

### Valgo Estresse (LCM)
Joelho a 0° e 30° de flexão. Aplique valgismo. Positivo: abertura medial > 5mm.

### Varo Estresse (LCL)
Joelho a 0° e 30° de flexão. Aplique varismo. Positivo: abertura lateral > 5mm.

---

## Síndrome Patelofemoral

### Clarke (Inibição Patelar)
Pressione a patela superiormente enquanto o paciente contrai o quadríceps. **Positivo:** Dor retropatelar (baixa especificidade).

### J-Sign
Observe a patela durante extensão ativa. Positivo: movimento em "J" lateral no final da extensão → sugere disfunção de tracking patelar.
`,
  },
  {
    slug: "principios-progressao-carga",
    title: "Princípios de Progressão de Carga em Reabilitação",
    icon: "📈",
    category: "clinico",
    tags: ["progressao", "carga", "principios", "fortalecimento"],
    content: `# Princípios de Progressão de Carga em Reabilitação

## A Regra dos 10%

Nunca aumente a carga total de treino em mais de **10% por semana**. Aplicável a:
- Volume (séries × repetições)
- Intensidade (peso)
- Frequência (sessões/semana)
- Complexidade do movimento

---

## Princípio SAID (Specific Adaptation to Imposed Demands)

O corpo se adapta especificamente ao estresse imposto. Para a reabilitação:
- Exercícios devem progressivamente simular as demandas da atividade alvo
- A especificidade aumenta com as fases do protocolo
- Fase final = exercícios específicos da modalidade/trabalho

---

## Progressão por Parâmetros

### 1. Amplitude de Movimento
Inicie com amplitude indolor → progrida gradualmente → amplitude completa

### 2. Carga (Resistência)
Sem peso → peso corporal → resistência elástica → pesos livres → equipamentos

### 3. Velocidade
Lento e controlado → velocidade moderada → velocidade funcional/esportiva

### 4. Plano de Movimento
Sagital → Frontal → Transversal → Multiplanar

### 5. Base de Suporte
Bilateral → Semitândem → Unipodal → Superfície instável

### 6. Feedback Sensorial
Com visão → olhos fechados → superfície instável

---

## Regra da Dor na Progressão

| Dor durante o exercício | Ação |
|---|---|
| 0-2/10 | Progrida normalmente |
| 3-4/10 | Mantenha a carga atual |
| 5-6/10 | Reduza 20% da carga |
| ≥ 7/10 | Pare o exercício |

**24h após o exercício:** Dor ≤ 3/10 e resolução em ≤ 24h = progressão adequada.

---

## Sinais de Sobrecarga

🔴 **PARE e reavalie:**
- Derrame articular após treino
- Dor em repouso noturno aumentando
- Perda de amplitude de movimento
- Inflamação visível

---

## Overload Progressivo vs. Periodização

Para reabilitação de longa duração (> 8 semanas), use periodização:
- **Semanas 1-3:** Progressão de carga
- **Semana 4:** Deload (60-70% do volume)
- **Semanas 5-7:** Nova progressão
- **Semana 8:** Deload

O deload previne overreaching e permite supercompensação.
`,
  },
];

// ============================================================
// SEED FUNCTION
// ============================================================

async function seed() {
  console.log("🌱 Iniciando seed do Neon PostgreSQL (São Paulo)...\n");

  // 1. Categorias
  console.log("📁 Criando categorias de exercícios...");
  const insertedCategories = await db
    .insert(schema.exerciseCategories)
    .values(
      CATEGORIES.map((c) => ({
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        color: c.color,
        orderIndex: c.orderIndex,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: schema.exerciseCategories.id, slug: schema.exerciseCategories.slug });

  const categoryMap = new Map(insertedCategories.map((c) => [c.slug, c.id]));
  console.log(`   ✅ ${insertedCategories.length} categorias criadas`);

  // 2. Exercícios
  console.log("\n🏋️  Criando exercícios...");
  const exercisesToInsert = EXERCISES.map((ex) => {
    const { categorySlug, ...rest } = ex;
    return {
      ...rest,
      categoryId: categoryMap.get(categorySlug),
      isActive: true,
      isPublic: true,
    };
  });

  const insertedExercises = await db
    .insert(schema.exercises)
    .values(exercisesToInsert)
    .onConflictDoNothing()
    .returning({ id: schema.exercises.id, name: schema.exercises.name });

  console.log(`   ✅ ${insertedExercises.length} exercícios criados`);

  // 3. Protocolos
  console.log("\n📋 Criando protocolos clínicos...");
  const insertedProtocols = await db
    .insert(schema.exerciseProtocols)
    .values(
      PROTOCOLS.map((p) => ({
        ...p,
        isActive: true,
        isPublic: true,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: schema.exerciseProtocols.id, name: schema.exerciseProtocols.name });

  console.log(`   ✅ ${insertedProtocols.length} protocolos criados`);

  // 4. Wiki Pages
  console.log("\n📚 Criando páginas wiki...");
  const insertedWiki = await db
    .insert(schema.wikiPages)
    .values(
      WIKI_PAGES.map((p) => ({
        ...p,
        isPublished: true,
        isPublic: true,
        viewCount: 0,
        version: 1,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: schema.wikiPages.id, title: schema.wikiPages.title });

  console.log(`   ✅ ${insertedWiki.length} páginas wiki criadas`);

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("✅ SEED CONCLUÍDO");
  console.log("═".repeat(50));
  console.log(`   📁 Categorias: ${insertedCategories.length}`);
  console.log(`   🏋️  Exercícios: ${insertedExercises.length}`);
  console.log(`   📋 Protocolos: ${insertedProtocols.length}`);
  console.log(`   📚 Wiki pages: ${insertedWiki.length}`);
  console.log("═".repeat(50));
}

seed().catch(console.error);
