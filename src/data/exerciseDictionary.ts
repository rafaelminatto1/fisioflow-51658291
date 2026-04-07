/**
 * Exercise Dictionary - Extended bilingual catalog for physiotherapy exercises.
 * Organized by body region and movement pattern, with detailed descriptions.
 * This is a FREE, LOCAL dictionary — no external APIs needed.
 */

import type { PhysioDictionaryEntry } from "./physioDictionary";

function ex(
	id: string, pt: string, en: string,
	aliases_pt: string[] = [], aliases_en: string[] = [],
	subcategory = "", description_pt = "", description_en = "",
): PhysioDictionaryEntry {
	return { id, pt, en, aliases_pt, aliases_en, category: "exercise", subcategory, description_pt, description_en };
}

// ─── MEMBROS INFERIORES ─────────────────────────────────────
const lowerBody: PhysioDictionaryEntry[] = [
	// Joelho
	ex("exd-agachamento", "Agachamento", "Squat", ["agachamento livre", "agachamento bilateral"], ["bodyweight squat", "air squat"], "Joelho / Quadril", "Exercício multiarticular para quadríceps, glúteos e core.", "Multi-joint exercise targeting quads, glutes, and core."),
	ex("exd-agachamento-bulgaro", "Agachamento Búlgaro", "Bulgarian Split Squat", ["split squat com elevação"], ["rear foot elevated split squat", "rfess"], "Joelho / Quadril"),
	ex("exd-agachamento-sumô", "Agachamento Sumô", "Sumo Squat", ["agachamento amplo"], ["wide stance squat"], "Joelho / Quadril"),
	ex("exd-agachamento-goblet", "Agachamento Goblet", "Goblet Squat", [], [], "Joelho / Quadril"),
	ex("exd-agachamento-pistol", "Agachamento Pistol", "Pistol Squat", ["agachamento unipodal"], ["single leg squat"], "Joelho / Quadril"),
	ex("exd-agachamento-parede", "Agachamento na Parede", "Wall Sit", ["cadeirinha", "isométrico de parede"], ["wall squat"], "Joelho", "Isométrico para fortalecimento de quadríceps.", "Isometric hold for quad strengthening."),
	ex("exd-afundo", "Afundo", "Lunge", ["avanço", "passada"], ["forward lunge"], "Joelho / Quadril"),
	ex("exd-afundo-lateral", "Afundo Lateral", "Lateral Lunge", ["avanço lateral"], ["side lunge"], "Joelho / Quadril"),
	ex("exd-afundo-reverso", "Afundo Reverso", "Reverse Lunge", ["avanço reverso"], ["backward lunge"], "Joelho / Quadril"),
	ex("exd-afundo-caminando", "Afundo Caminhando", "Walking Lunge", ["passada caminhando"], ["walking lunge"], "Joelho / Quadril"),
	ex("exd-leg-press", "Leg Press", "Leg Press", ["prensa de perna"], [], "Joelho / Quadril"),
	ex("exd-cadeira-extensora", "Cadeira Extensora", "Leg Extension", ["extensora", "extensão de joelho"], ["knee extension", "quad extension"], "Joelho", "Isolamento de quadríceps em cadeia cinética aberta.", "Quadriceps isolation in open kinetic chain."),
	ex("exd-cadeira-flexora", "Cadeira Flexora", "Leg Curl", ["flexora", "mesa flexora"], ["hamstring curl", "prone leg curl"], "Joelho"),
	ex("exd-stiff", "Stiff", "Romanian Deadlift", ["levantamento terra romeno", "rdl"], ["rdl", "stiff leg deadlift"], "Posterior / Quadril"),
	ex("exd-step-up", "Step-Up", "Step-Up", ["subida no step", "subida em degrau"], [], "Joelho / Quadril"),
	ex("exd-step-down", "Step-Down", "Step-Down", ["descida do step", "step down excêntrico"], ["eccentric step-down"], "Joelho", "Exercício excêntrico para controle de valgo dinâmico.", "Eccentric exercise for dynamic valgus control."),
	ex("exd-nordico", "Nordic Hamstring", "Nordic Hamstring Curl", ["nórdico", "exercício nórdico"], ["nordic curl", "nhc"], "Posterior da Coxa", "Prevenção de lesões em isquiotibiais.", "Hamstring injury prevention exercise."),
	ex("exd-ponte-gluteo", "Ponte de Glúteo", "Glute Bridge", ["ponte", "elevação pélvica"], ["hip bridge", "bridge"], "Quadril / Glúteo", "Ativação de glúteo máximo e estabilidade lombo-pélvica.", "Glute max activation and lumbopelvic stability."),
	ex("exd-hip-thrust", "Hip Thrust", "Hip Thrust", ["elevação de quadril com barra"], ["barbell hip thrust"], "Quadril / Glúteo"),
	ex("exd-single-leg-bridge", "Ponte Unilateral", "Single Leg Bridge", ["ponte unipodal"], ["single leg glute bridge"], "Quadril / Glúteo"),
	ex("exd-leg-raise-lateral", "Abdução de Quadril Deitado", "Side-Lying Hip Abduction", ["elevação lateral deitado"], ["side lying leg raise", "clamshell leg raise"], "Quadril"),
	ex("exd-clamshell", "Clamshell", "Clamshell", ["concha", "abertura de quadril"], [], "Quadril", "Fortalecimento de rotadores externos do quadril.", "Hip external rotator strengthening."),
	ex("exd-monster-walk", "Monster Walk", "Monster Walk", ["caminhada com faixa", "banda lateral"], ["banded walk", "lateral band walk"], "Quadril"),
	ex("exd-kickback", "Extensão de Quadril", "Hip Extension Kickback", ["coice", "glute kickback"], ["donkey kick"], "Quadril / Glúteo"),
	ex("exd-pant-em-pe", "Panturrilha em Pé", "Standing Calf Raise", ["elevação de panturrilha", "plantiflexão em carga"], ["heel raise", "calf raise"], "Tornozelo / Perna"),
	ex("exd-pant-sentado", "Panturrilha Sentado", "Seated Calf Raise", ["sóleo sentado"], ["seated heel raise"], "Tornozelo / Perna"),
	ex("exd-tibial-ant", "Dorsiflexão Resistida", "Tibialis Anterior Raise", ["fortalecimento de tibial anterior", "tib raise"], ["tib bar raise", "dorsiflexion exercise"], "Tornozelo / Perna"),
	ex("exd-inversao-tornozelo", "Inversão Resistida", "Resisted Inversion", ["inversão com faixa"], ["banded inversion"], "Tornozelo"),
	ex("exd-eversao-tornozelo", "Eversão Resistida", "Resisted Eversion", ["eversão com faixa"], ["banded eversion"], "Tornozelo"),
	// Propriocepção
	ex("exd-apoio-unipodal", "Apoio Unipodal", "Single Leg Stance", ["equilíbrio unipodal", "apoio em um pé"], ["single leg balance", "one leg stand"], "Propriocepção", "Treino de equilíbrio e propriocepção.", "Balance and proprioception training."),
	ex("exd-bosu-balance", "Equilíbrio no BOSU", "BOSU Balance", ["bosu", "meia esfera"], [], "Propriocepção"),
	ex("exd-disco-proprioceptivo", "Disco Proprioceptivo", "Wobble Board", ["disco de equilíbrio", "disco instável"], ["balance disc", "wobble cushion"], "Propriocepção"),
	ex("exd-salto-unipodal", "Salto Unipodal", "Single Leg Hop", ["hop unilateral", "pulo em uma perna"], ["single leg hop", "hop for distance"], "Pliometria / RTS"),
];

// ─── MEMBROS SUPERIORES ─────────────────────────────────────
const upperBody: PhysioDictionaryEntry[] = [
	// Ombro
	ex("exd-elevacao-lateral", "Elevação Lateral", "Lateral Raise", ["abdução de ombro com halter"], ["dumbbell lateral raise", "shoulder abduction"], "Ombro"),
	ex("exd-elevacao-frontal", "Elevação Frontal", "Front Raise", ["flexão de ombro"], ["shoulder flexion"], "Ombro"),
	ex("exd-rot-ext-ombro", "Rotação Externa de Ombro", "Shoulder External Rotation", ["rotação externa com faixa", "re de ombro"], ["banded er", "sidelying er", "cable er"], "Ombro", "Fortalecimento do manguito rotador.", "Rotator cuff strengthening."),
	ex("exd-rot-int-ombro", "Rotação Interna de Ombro", "Shoulder Internal Rotation", ["rotação interna com faixa", "ri de ombro"], ["banded ir", "cable ir"], "Ombro"),
	ex("exd-full-can", "Full Can", "Full Can Exercise", ["elevação no plano da escápula"], ["scaption", "scapular plane elevation"], "Ombro"),
	ex("exd-crucifixo-reverso", "Crucifixo Reverso", "Reverse Fly", ["voador reverso", "posterior de ombro"], ["rear delt fly", "bent over reverse fly"], "Ombro"),
	ex("exd-pendular-codman", "Exercício Pendular de Codman", "Codman Pendulum Exercise", ["pendular", "exercício de codman"], ["pendulum exercise"], "Ombro", "Mobilização passiva de ombro para fase inicial de reabilitação.", "Passive shoulder mobilization for early rehabilitation."),
	ex("exd-wall-slides", "Deslizamento na Parede", "Wall Slides", ["wall angel", "slide na parede"], ["wall angel", "wall slide"], "Ombro / Escápula"),
	ex("exd-serratus-punch", "Serrátil Punch", "Serratus Punch", ["protração de escápula", "push plus"], ["push up plus", "scapular protraction"], "Escápula"),
	ex("exd-retracão-escapular", "Retração Escapular", "Scapular Retraction", ["adução de escápulas", "squeeze"], ["scapular squeeze", "band pull apart"], "Escápula"),
	// Cotovelo
	ex("exd-rosca-biceps", "Rosca Bíceps", "Bicep Curl", ["rosca direta", "curl de bíceps"], ["biceps curl", "dumbbell curl", "barbell curl"], "Cotovelo / Braço"),
	ex("exd-extensao-triceps", "Extensão de Tríceps", "Triceps Extension", ["tríceps testa", "extensão overhead"], ["skull crusher", "overhead tricep extension"], "Cotovelo / Braço"),
	ex("exd-flexao-punho", "Flexão de Punho", "Wrist Curl", ["rosca de punho", "flexor de punho"], ["wrist flexion"], "Antebraço"),
	ex("exd-extensao-punho", "Extensão de Punho", "Reverse Wrist Curl", ["extensor de punho"], ["wrist extension"], "Antebraço"),
	ex("exd-supinacao-pronacao", "Supinação e Pronação", "Supination and Pronation", ["giro de antebraço"], ["forearm rotation"], "Antebraço"),
	ex("exd-flexbar-tyler", "Tyler Twist", "Tyler Twist", ["flexbar", "excêntrico de punho"], ["flexbar exercise", "reverse tyler twist"], "Cotovelo", "Exercício excêntrico para epicondilite lateral.", "Eccentric exercise for lateral epicondylitis."),
	// Mão
	ex("exd-grip-strengthening", "Fortalecimento de Preensão", "Grip Strengthening", ["fortalecimento de mão", "aperto de mão"], ["hand grip", "grip training"], "Mão"),
	ex("exd-finger-extension", "Extensão de Dedos", "Finger Extension", ["extensão com elástico"], ["rubber band finger extension"], "Mão"),
];

// ─── CORE E COLUNA ──────────────────────────────────────────
const coreSpine: PhysioDictionaryEntry[] = [
	ex("exd-prancha-ventral", "Prancha Ventral", "Front Plank", ["prancha abdominal", "prancha isométrica"], ["plank", "forearm plank"], "Core", "Estabilização isométrica do core.", "Isometric core stabilization."),
	ex("exd-prancha-lateral", "Prancha Lateral", "Side Plank", [], [], "Core"),
	ex("exd-dead-bug", "Dead Bug", "Dead Bug", [], [], "Core", "Dissociação de membros com estabilização lombar.", "Limb dissociation with lumbar stabilization."),
	ex("exd-bird-dog", "Bird Dog", "Bird Dog", ["cachorro-pássaro", "quadrúpede"], ["quadruped arm-leg raise"], "Core"),
	ex("exd-pallof-press", "Pallof Press", "Pallof Press", ["anti-rotação"], ["anti-rotation press"], "Core"),
	ex("exd-stir-the-pot", "Stir the Pot", "Stir the Pot", ["mexer a panela na bola"], [], "Core"),
	ex("exd-abdominal-crunch", "Abdominal", "Crunch", ["abdominal parcial", "crunch"], ["sit-up", "curl-up"], "Core"),
	ex("exd-abdominal-reverso", "Abdominal Reverso", "Reverse Crunch", [], [], "Core"),
	ex("exd-bicycle-crunch", "Abdominal Bicicleta", "Bicycle Crunch", ["bicicleta", "abdominal cruzado"], ["bicycle"], "Core"),
	ex("exd-russian-twist", "Giro Russo", "Russian Twist", ["rotação de tronco sentado"], ["seated trunk rotation"], "Core"),
	ex("exd-leg-raise", "Elevação de Pernas", "Leg Raise", ["elevação de membros inferiores"], ["hanging leg raise", "lying leg raise"], "Core"),
	// Coluna
	ex("exd-cat-cow", "Gato e Vaca", "Cat-Cow", ["gato-camelo", "flexão-extensão da coluna"], ["cat camel", "spinal flexion-extension"], "Coluna", "Mobilidade da coluna em posição quadrúpede.", "Spinal mobility in quadruped position."),
	ex("exd-superman", "Superman", "Superman", ["extensão de tronco", "hiperextensão no solo"], ["back extension", "prone superman"], "Coluna"),
	ex("exd-extensao-lombar", "Extensão Lombar", "Back Extension", ["hiperextensão", "extensão no romano"], ["hyperextension", "roman chair"], "Coluna"),
	ex("exd-child-pose", "Postura da Criança", "Child's Pose", ["posição de oração", "repouso"], ["prayer stretch"], "Coluna", "Alongamento de eretores e relaxamento da coluna.", "Erector spinae stretch and spinal relaxation."),
	ex("exd-mckenzie", "Extensão de McKenzie", "McKenzie Extension", ["mckenzie", "press up"], ["prone press-up", "mckenzie exercise"], "Coluna", "Protocolo de centralização para hérnia de disco.", "Centralization protocol for disc herniation."),
	ex("exd-flexao-williams", "Flexão de Williams", "Williams Flexion Exercise", ["williams", "exercícios de williams"], ["williams exercise"], "Coluna"),
	ex("exd-rotacao-tronco", "Rotação de Tronco", "Trunk Rotation", ["rotação torácica", "open book"], ["thoracic rotation", "open book stretch"], "Coluna Torácica"),
	ex("exd-chin-tuck", "Retração Cervical", "Chin Tuck", ["retração do queixo", "chin tuck"], ["cervical retraction", "deep neck flexor"], "Cervical", "Ativação de flexores cervicais profundos.", "Deep cervical flexor activation."),
	ex("exd-retração-cervical-isometrica", "Isométrico Cervical", "Cervical Isometric", ["isométrico de pescoço"], ["neck isometric"], "Cervical"),
];

// ─── FUNCIONAIS E COMPOSTOS ─────────────────────────────────
const functional: PhysioDictionaryEntry[] = [
	ex("exd-flexao-bracos", "Flexão de Braços", "Push-Up", ["apoio", "flexão no solo"], ["push up", "press up"], "Funcional"),
	ex("exd-flexao-joelho", "Flexão de Braços no Joelho", "Knee Push-Up", ["apoio modificado"], ["modified push-up"], "Funcional"),
	ex("exd-flexao-inclinada", "Flexão Inclinada", "Incline Push-Up", ["apoio na parede", "push-up na parede"], ["wall push-up"], "Funcional"),
	ex("exd-remada", "Remada", "Row", ["remada curvada", "remada com halter"], ["bent over row", "cable row", "dumbbell row"], "Funcional"),
	ex("exd-terra", "Levantamento Terra", "Deadlift", ["terra", "levantamento do chão"], ["conventional deadlift"], "Funcional"),
	ex("exd-farmer-walk", "Farmer Walk", "Farmer Walk", ["caminhada do fazendeiro", "loaded carry"], ["farmer carry"], "Funcional"),
	ex("exd-turkish-getup", "Turkish Get-Up", "Turkish Get-Up", ["levantamento turco", "tgu"], ["tgu"], "Funcional"),
	ex("exd-carry-unilateral", "Carregamento Unilateral", "Suitcase Carry", ["mala", "loaded carry unilateral"], ["single arm carry"], "Funcional"),
	// Pliometria
	ex("exd-box-jump", "Box Jump", "Box Jump", ["salto na caixa"], [], "Pliometria"),
	ex("exd-jump-squat", "Agachamento com Salto", "Jump Squat", ["salto vertical"], ["squat jump"], "Pliometria"),
	ex("exd-drop-jump", "Drop Jump", "Drop Jump", ["salto em profundidade", "depth jump"], ["depth jump"], "Pliometria"),
	ex("exd-skipping", "Skipping", "Skipping", ["marcha alta", "joelho alto"], ["high knees", "a-skip"], "Pliometria / Corrida"),
	ex("exd-lateral-hop", "Salto Lateral", "Lateral Hop", ["hop lateral"], [], "Pliometria"),
];

// ─── ALONGAMENTOS ───────────────────────────────────────────
const stretching: PhysioDictionaryEntry[] = [
	ex("exd-along-isquiotibiais", "Alongamento de Isquiotibiais", "Hamstring Stretch", ["alongamento posterior da coxa"], ["hamstring stretch"], "Alongamento"),
	ex("exd-along-quadriceps", "Alongamento de Quadríceps", "Quadriceps Stretch", ["alongamento de coxa anterior"], ["quad stretch"], "Alongamento"),
	ex("exd-along-iliopsoas", "Alongamento de Iliopsoas", "Hip Flexor Stretch", ["alongamento do psoas", "lunge stretch"], ["kneeling hip flexor stretch", "thomas stretch"], "Alongamento"),
	ex("exd-along-piriforme", "Alongamento de Piriforme", "Piriformis Stretch", ["piriforme", "posterior do quadril"], ["figure 4 stretch"], "Alongamento"),
	ex("exd-along-adutores", "Alongamento de Adutores", "Adductor Stretch", ["alongamento de virilha"], ["groin stretch", "butterfly stretch"], "Alongamento"),
	ex("exd-along-panturrilha", "Alongamento de Panturrilha", "Calf Stretch", ["alongamento de gastrocnêmio"], ["gastroc stretch", "wall calf stretch"], "Alongamento"),
	ex("exd-along-soleo", "Alongamento de Sóleo", "Soleus Stretch", ["alongamento sóleo joelho flexionado"], ["knee bent calf stretch"], "Alongamento"),
	ex("exd-along-peitoral", "Alongamento de Peitoral", "Pec Stretch", ["alongamento de peito", "doorway stretch"], ["chest stretch", "doorway pec stretch"], "Alongamento"),
	ex("exd-along-trapezio", "Alongamento de Trapézio", "Upper Trapezius Stretch", ["alongamento cervical lateral"], ["neck side stretch"], "Alongamento"),
	ex("exd-along-dorsal", "Alongamento de Grande Dorsal", "Lat Stretch", ["alongamento de latíssimo"], ["lat stretch", "overhead lat stretch"], "Alongamento"),
	ex("exd-along-rotadores", "Alongamento de Rotadores de Ombro", "Shoulder Rotator Stretch", ["sleeper stretch", "cross body stretch"], ["sleeper stretch", "cross body posterior capsule stretch"], "Alongamento"),
	ex("exd-along-tfl-it", "Alongamento de TFL e Banda IT", "IT Band Stretch", ["alongamento do trato iliotibial"], ["it band foam roll"], "Alongamento"),
	ex("exd-foam-rolling", "Liberação Miofascial com Rolo", "Foam Rolling", ["rolo de liberação", "auto-liberação miofascial"], ["self-myofascial release", "smr"], "Liberação", "Auto-liberação miofascial para reduzir tensão muscular.", "Self-myofascial release to reduce muscle tension."),
	ex("exd-lacrosse-ball", "Liberação com Bola de Lacrosse", "Lacrosse Ball Release", ["bola de liberação", "trigger point release"], ["ball release", "trigger point therapy"], "Liberação"),
];

// ─── MOBILIDADE ─────────────────────────────────────────────
const mobility: PhysioDictionaryEntry[] = [
	ex("exd-mob-tornozelo", "Mobilização de Tornozelo", "Ankle Mobilization", ["mobilidade de tornozelo", "dorsiflexão em carga"], ["ankle dorsiflexion mobilization", "knee-to-wall"], "Mobilidade"),
	ex("exd-mob-quadril", "Mobilização de Quadril", "Hip Mobilization", ["mobilidade de quadril", "hip 90/90"], ["hip 90/90", "hip capsule mobilization"], "Mobilidade"),
	ex("exd-mob-toracica", "Mobilização Torácica", "Thoracic Mobilization", ["mobilidade torácica", "foam roller torácico"], ["thoracic spine mobility", "t-spine extension"], "Mobilidade"),
	ex("exd-mob-ombro", "Mobilização de Ombro", "Shoulder Mobilization", ["mobilidade de ombro", "sleeper stretch"], ["shoulder mobility drill"], "Mobilidade"),
	ex("exd-world-greatest", "World's Greatest Stretch", "World's Greatest Stretch", ["maior alongamento do mundo"], ["wgs"], "Mobilidade"),
	ex("exd-hip-cars", "CARs de Quadril", "Hip CARs", ["rotação articular controlada", "hip cars"], ["controlled articular rotations"], "Mobilidade"),
	ex("exd-shoulder-cars", "CARs de Ombro", "Shoulder CARs", ["rotação articular de ombro"], ["shoulder controlled articular rotations"], "Mobilidade"),
];

// ─── RESPIRATÓRIO ───────────────────────────────────────────
const respiratory: PhysioDictionaryEntry[] = [
	ex("exd-respiracao-diafragmatica", "Respiração Diafragmática", "Diaphragmatic Breathing", ["respiração abdominal", "respiração profunda"], ["belly breathing", "deep breathing"], "Respiratório", "Padrão respiratório correto com ativação do diafragma.", "Correct breathing pattern with diaphragm activation."),
	ex("exd-expansao-costal", "Expansão Costal", "Rib Cage Expansion", ["expansão torácica", "respiração lateral"], ["lateral costal breathing"], "Respiratório"),
	ex("exd-respiracao-360", "Respiração 360", "360 Breathing", ["respiração circunferencial"], ["circumferential breathing"], "Respiratório"),
];

export const exerciseDictionary: PhysioDictionaryEntry[] = [
	...lowerBody,
	...upperBody,
	...coreSpine,
	...functional,
	...stretching,
	...mobility,
	...respiratory,
];
