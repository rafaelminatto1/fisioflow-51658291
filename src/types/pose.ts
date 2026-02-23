/**
 * Tipos e interfaces para Pose Detection no FisioFlow
 *
 * Este arquivo define todos os tipos TypeScript unificados
 * para detecção de pose, análise de exercícios e feedback biomecânico.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipos de análise de movimento disponíveis
 */
export enum AnalysisType {
  POSTURE = 'posture',          // Análise postural
  REPETITION = 'repetition',    // Contagem de repetições
  RANGE = 'range',              // Amplitude de movimento (ADM)
  FORM = 'form'                  // Análise de forma
}

/**
 * Tipos de exercícios suportados
 */
export enum ExerciseType {
  SQUAT = 'squat',                    // Agachamento
  PUSHUP = 'pushup',                  // Flexão de braço
  LATERAL_RAISE = 'lateral_raise',  // Levantamento lateral
  PLANK = 'plank',                    // Prancha
  LUNGE = 'lunge',                  // Avanço
  SHOULDER_PRESS = 'shoulder_press', // Desenvolvimento de ombro
  HIP_ABDUCTION = 'hip_abduction',  // Abdução de quadril
  KNEE_FLEXION = 'knee_flexion',  // Flexão de joelho
}

/**
 * Fases de movimento para contagem de repetições
 */
export enum MovementPhase {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  FLEXION = 'flexion',
  EXTENSION = 'extension',
  CONCENTRIC = 'concentric',
  ECCENTRIC = 'eccentric',
  HOLD = 'hold',
}

/**
 * Qualidade da execução baseada no score
 */
export enum ExecutionQuality {
  PERFECT = 'perfect',      // Score 90-100
  GOOD = 'good',          // Score 70-89
  FAIR = 'fair',          // Score 50-69
  POOR = 'poor',          // Score 0-49
  VERY_POOR = 'very_poor'  // Score 0-9
}

/**
 * Estados da sessão de exercício
 */
export enum SessionState {
  IDLE = 'idle',              // Não iniciado
  CALIBRATING = 'calibrating', // Calibrando pose/câmera
  EXERCISING = 'exercising',   // Em execução
  PAUSED = 'paused',          // Pausado
  COMPLETED = 'completed',    // Concluído
  ANALYZING = 'analyzing',     // Analisando gravação
  ERROR = 'error',            // Erro na execução
}

/**
 * Níveis de severidade para problemas posturais
 */
export enum SeverityLevel {
  NONE = 'none',
  MILD = 'mild',           // Problema menor, score -5
  MODERATE = 'moderate',   // Problema moderado, score -15
  SEVERE = 'severe',       // Problema severo, score -30
}

// ============================================================================
// POSE LANDMARKS (Consolidado com geometry.ts)
// ============================================================================

/**
 * Índices dos landmarks de pose do MediaPipe
 */
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
  LEFT_FOOT: 33,
  RIGHT_FOOT: 34,
} as const;

/**
 * Obter nome amigável do landmark
 */
export function getLandmarkName(index: number): string {
  return Object.entries(POSE_LANDMARKS).find(
    ([, name]) => index === Number(name)
  )?.[1] || `unknown_${index}`;
}

/**
 * Obter nome em português do landmark
 */
export function getLandmarkNamePT(index: number): string {
  const names: Record<number, string> = {
    0: 'nariz',
    1: 'canto_interno_esquerdo',
    2: 'olho_esquerdo',
    3: 'canto_externo_esquerdo',
    4: 'canto_interno_direito',
    5: 'olho_direito',
    6: 'canto_externo_direito',
    7: 'orelha_esquerda',
    8: 'orelha_direita',
    9: 'boca_esquerda',
    10: 'boca_direita',
    11: 'ombro_esquerdo',
    12: 'ombro_direito',
    13: 'cotovelo_esquerdo',
    14: 'cotovelo_direito',
    15: 'punho_esquerdo',
    16: 'punho_direito',
    17: 'dedo_mindinho_esquerdo',
    18: 'dedo_mindinho_direito',
    19: 'indicador_esquerdo',
    20: 'indicador_direito',
    21: 'polegar_esquerdo',
    22: 'polegar_direito',
    23: 'quadril_esquerdo',
    24: 'quadril_direito',
    25: 'joelho_esquerdo',
    26: 'joelho_direito',
    27: 'tornozelo_esquerdo',
    28: 'tornozelo_direito',
    29: 'calcanhar_esquerdo',
    30: 'calcanhar_direito',
    31: 'dedo_pe_esquerdo',
    32: 'dedo_pe_direito',
    33: 'pe_esquerdo',
    34: 'pe_direito',
  };
  return names[index] || `unknown_${index}`;
}

// ============================================================================
// POSE LANDMARK
// ============================================================================

/**
 * Landmark individual detectado pelo sistema de pose
 */
export interface PoseLandmark {
  /** Coordenada X normalizada (0-1) */
  x: number;
  /** Coordenada Y normalizada (0-1) */
  y: number;
  /** Coordenada Z em milímetros (profundidade) */
  z?: number;
  /** Probabilidade de detecção (0-1) */
  visibility?: number;
  /** Timestamp da detecção */
  timestamp?: number;
}

/**
 * Dados de uma detecção de pose completa
 */
export interface PoseDetection {
  /** Todos os landmarks detectados (33 para corpo completo) */
  landmarks: PoseLandmark[];
  /** Confiança média da detecção (0-1) */
  confidence: number;
  /** Timestamp da detecção */
  timestamp: number;
  /** Tipo de análise sendo realizada */
  analysisType: AnalysisType;
  /** Número de pessoas detectadas (MediaPipe suporta múltiplas) */
  personCount?: number;
}

// ============================================================================
// ANGULOS E ARTICULAÇÕES
// ============================================================================

/**
 * Dados de um ângulo de articulação
 */
export interface JointAngle {
  /** Identificador da articulação */
  joint: string;
  /** Ângulo atual em graus (0-180) */
  current: number;
  /** Ângulo mínimo na sessão */
  min: number;
  /** Ângulo máximo na sessão */
  max: number;
  /** Média de ângulo na sessão */
  average: number;
  /** Zona de movimento alvo */
  target: { min: number; max: number };
  /** Se o ângulo está dentro da zona alvo */
  inRange: boolean;
  /** Índice do landmark do vértice (primeiro ponto) */
  pivotIndex: number;
}

/**
 * Par de landmarks para calcular ângulo
 * (pivot, a, b) onde pivot é o vértice do ângulo
 */
export interface AngleTriad {
  pivot: number;
  a: number;
  b: number;
}

/**
 * Articulações principais para análise
 */
export enum MainJoint {
  LEFT_SHOULDER = 'left_shoulder',
  RIGHT_SHOULDER = 'right_shoulder',
  LEFT_ELBOW = 'left_elbow',
  RIGHT_ELBOW = 'right_elbow',
  LEFT_WRIST = 'left_wrist',
  RIGHT_WRIST = 'right_wrist',
  LEFT_HIP = 'left_hip',
  RIGHT_HIP = 'right_hip',
  LEFT_KNEE = 'left_knee',
  RIGHT_KNEE = 'right_knee',
  LEFT_ANKLE = 'left_ankle',
  RIGHT_ANKLE = 'right_ankle',
}

/**
 * Obter triângulo de ângulo para uma articulação
 */
export function getAngleTriad(joint: MainJoint): AngleTriad | null {
  switch (joint) {
    case LEFT_KNEE:
      return { pivot: POSE_LANDMARKS.LEFT_HIP, a: POSE_LANDMARKS.LEFT_KNEE, b: POSE_LANDMARKS.LEFT_ANKLE };
    case RIGHT_KNEE:
      return { pivot: POSE_LANDMARKS.RIGHT_HIP, a: POSE_LANDMARKS.RIGHT_KNEE, b: POSE_LANDMARKS.RIGHT_ANKLE };
    case LEFT_ELBOW:
      return { pivot: POSE_LANDMARKS.LEFT_SHOULDER, a: POSE_LANDMARKS.LEFT_ELBOW, b: POSE_LANDMARKS.LEFT_WRIST };
    case RIGHT_ELBOW:
      return { pivot: POSE_LANDMARKS.RIGHT_SHOULDER, a: POSE_LANDMARKS.RIGHT_ELBOW, b: POSE_LANDMARKS.RIGHT_WRIST };
    case LEFT_HIP:
      return { pivot: POSE_LANDMARKS.LEFT_SHOULDER, a: POSE_LANDMARKS.LEFT_HIP, b: POSE_LANDMARKS.LEFT_KNEE };
    case RIGHT_HIP:
      return { pivot: POSE_LANDMARKS.RIGHT_SHOULDER, a: POSE_LANDMARKS.RIGHT_HIP, b: POSE_LANDMARKS.RIGHT_KNEE };
    default:
      return null;
  }
}

/**
 * Obter nome da articulação em português
 */
export function getJointNamePT(joint: MainJoint): string {
  const names: Record<MainJoint, string> = {
    left_shoulder: 'ombro_esquerdo',
    right_shoulder: 'ombro_direito',
    left_elbow: 'cotovelo_esquerdo',
    right_elbow: 'cotovelo_direito',
    left_wrist: 'punho_esquerdo',
    right_wrist: 'punho_direito',
    left_hip: 'quadril_esquerdo',
    right_hip: 'quadril_direito',
    left_knee: 'joelho_esquerdo',
    right_knee: 'joelho_direito',
    left_ankle: 'tornozelo_esquerdo',
    right_ankle: 'tornozelo_direito',
  };
  return names[joint] || joint;
}

// ============================================================================
// PROBLEMAS POSTURAIS
// ============================================================================

/**
 * Problema postural detectado
 */
export interface PostureIssue {
  /** Tipo do problema */
  type: PostureIssueType;
  /** Nível de severidade */
  severity: SeverityLevel;
  /** Descrição do problema */
  description: string;
  /** Sugestão de correção */
  suggestion: string;
  /** Pontuação de impacto no score total */
  scoreImpact: number;
}

/**
 * Tipos de problemas posturais
 */
export enum PostureIssueType {
  HEAD_FORWARD = 'head_forward',           // Cabeça projetada para frente
  HEAD_BACKWARD = 'head_backward',         // Cabeça projetada para trás
  HEAD_TILTED = 'head_tilted',            // Cabeça inclinada
  SHOULDERS_ROUNDED = 'shoulders_rounded', // Ombros arredondados
  SHOULDERS_ELEVATED = 'shoulders_elevated', // Ombros elevados
  SHOULDERS_ASYMMETRICAL = 'shoulders_asymmetric', // Ombros assimétricos
  BACK_ROUNDED = 'back_rounded',           // Coluna arredondada (cifose)
  BACK_HYPEREXTENDED = 'back_hyperextended',   // Hiperlordose (excesso de lordose)
  BACK_FLEXED = 'back_flexed',           // Hipercifose (excesso de cifose)
  HIPS_ASYMMETRIC = 'hips_asymmetric',     // Quadris assimétricos
  HIPS_SHIFTED = 'hips_shifted',           // Quadril deslocado
  KNEES_VALGUS = 'knees_valgus',       // Joelhos em valgo (para dentro)
  KNEES_VARUS_INWARD = 'knees_valgus_inward', // Joelhos em valgo (para dentro)
  KNEES_CAVED = 'knees_caved',           // Joelhos para dentro (geno valgo)
  FLAT_FEET = 'flat_feet',                // Pés planos
  WEAK_CORE = 'weak_core',                // Core fraco
  EXCESSIVE_LEAN = 'excessive_lean',       // Excesso de inclinação anterior
  UNEVEN_PELVIS = 'uneven_pelvis',         // Pelve inclinada
}

/**
 * Verificar se um tipo de problema existe na lista
 */
export function isPostureIssueType(type: string): type is PostureIssueType {
  return Object.values(PostureIssueType).includes(type as PostureIssueType);
}

/**
 * Obter impacto no score baseado na severidade
 */
export function getSeverityScore(severity: SeverityLevel): number {
  switch (severity) {
    case SeverityLevel.NONE:
      return 0;
    case SeverityLevel.MILD:
      return 5;
    case SeverityLevel.MODERATE:
      return 15;
    case SeverityLevel.SEVERE:
      return 30;
    default:
      return 0;
  }
}

// ============================================================================
// REPETIÇÕES
// ============================================================================

/**
 * Dados de uma repetição detectada
 */
export interface Repetition {
  /** Timestamp de início da repetição */
  startTime: number;
  /** Timestamp de fim da repetição */
  endTime: number;
  /** Duração da repetição em ms */
  duration: number;
  /** Qualidade da repetição */
  quality: ExecutionQuality;
  /** Fase do movimento quando completou */
  endPhase: MovementPhase;
  /** Dados de pose no início */
  startPose?: PoseDetection;
  /** Dados de pose no fim */
  endPose?: PoseDetection;
  /** Se a repetição foi completada */
  completed: boolean;
}

/**
 * Estado do contador de repetições
 */
export interface RepCounterState {
  /** Contagem atual de repetições */
  currentCount: number;
  /** Estado atual do movimento */
  currentPhase: MovementPhase | null;
  /** Timestamp da última mudança de fase */
  lastPhaseChange: number;
  /** Histórico de repetições da sessão */
  repetitions: Repetition[];
  /** Thresholds de detecção para o exercício atual */
  thresholds: RepetitionThresholds;
}

/**
 * Thresholds de detecção de repetições por tipo de exercício
 */
export interface RepetitionThresholds {
  /** Ângulo para considerar "cima" */
  upThreshold: number;
  /** Ângulo para considerar "baixo" */
  downThreshold: number;
  /** Tempo mínimo para uma repetição (ms) */
  minDuration: number;
  /** Tempo máximo para uma repetição (ms) */
  maxDuration: number;
}

/**
 * Thresholds padrão para tipos de exercícios
 */
export const DEFAULT_THRESHOLDS: Record<ExerciseType, RepetitionThresholds> = {
  [ExerciseType.SQUAT]: {
    upThreshold: 130,    // Considerar acima de 130° como "cima"
    downThreshold: 70,    // Considerar abaixo de 70° como "baixo"
    minDuration: 1000,  // Mínimo 1 segundo
    maxDuration: 10000, // Máximo 10 segundos
  },
  [ExerciseType.PUSHUP]: {
    upThreshold: 150,    // Extensão completa
    downThreshold: 30,    // Flexão
    minDuration: 800,
    maxDuration: 8000,
  },
  [ExerciseType.LATERAL_RAISE]: {
    upThreshold: 90,     // Abdução até 90°
    downThreshold: 10,    // Retorno
    minDuration: 500,
    maxDuration: 5000,
  },
  [ExerciseType.PLANK]: {
    upThreshold: 180,    // Mantém plano
    downThreshold: 170,   // Tolerância
    minDuration: 5000,   // Mínimo 5 segundos
    maxDuration: 120000, // Máximo 2 minutos
  },
  [ExerciseType.LUNGE]: {
    upThreshold: 160,    // Avanço
    downThreshold: 20,     // Retorno
    minDuration: 800,
    maxDuration: 6000,
  },
};

// ============================================================================
// MÉTRICAS DE EXERCÍCIO
// ============================================================================

/**
 * Métricas calculadas durante uma sessão de exercício
 */
export interface ExerciseMetrics {
  /** Pontuação geral da forma (0-100) */
  formScore: number;
  /** Pontuação de estabilidade (0-100) */
  stabilityScore: number;
  /** Amplitude de movimento (em graus) */
  rangeOfMotion: number;
  /** Porcentagem do ROM atingido (0-100%) */
  romPercentage: number;
  /** Número de repetições completadas */
  repetitions: number;
  /** Média de ângulos de todas as articulações */
  avgAngles: Record<MainJoint, number>;
  /** Tempo total em milissegundos */
  duration: number;
  /** FPS médio da detecção */
  avgFps: number;
  /** Latência média em ms */
  avgLatency: number;
}

/**
 * Dados de ADM para uma articulação específica
 */
export interface RomData {
  /** Articulação */
  joint: MainJoint;
  /** Amplitude de movimento em graus */
  rom: number;
  /** ROM mínimo normal para a articulação */
  normalMin: number;
  /** ROM máximo normal para a articulação */
  normalMax: number;
  /** Porcentagem do normal atingido */
  percentageOfNormal: number;
}

// ============================================================================
// SESSÃO DE EXERCÍCIO
// ============================================================================

/**
 * Sessão completa de execução de exercício
 */
export interface ExerciseSession {
  /** ID único da sessão */
  id: string;
  /** ID do exercício */
  exerciseId: string;
  /** Tipo de exercício */
  exerciseType: ExerciseType;
  /** ID do paciente */
  patientId: string;
  /** Timestamp de início */
  startTime: Date;
  /** Timestamp de término */
  endTime?: Date;
  /** Duração total em segundos */
  duration: number;
  /** Número de repetições completadas */
  repetitions: number;
  /** Pontuação geral da sessão (0-100) */
  totalScore: number;
  /** Métricas detalhadas */
  metrics: ExerciseMetrics;
  /** Lista de repetições registradas */
  repetitionsList: Repetition[];
  /** Problemas posturais detectados */
  postureIssues: PostureIssue[];
  /** Dados de ROM calculados */
  romData: RomData[];
  /** URL do vídeo da execução (se gravado) */
  videoUrl?: string;
  /** URLs de thumbnails capturados */
  thumbnails?: string[];
  /** Se o exercício foi completado */
  completed: boolean;
  /** Notas/observações */
  notes?: string;
  /** Criado em */
  createdAt: Date;
}

/**
 * Criar nova sessão de exercício
 */
export function createExerciseSession(
  exerciseId: string,
  patientId: string,
  exerciseType: ExerciseType
): ExerciseSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    exerciseId,
    exerciseType,
    patientId,
    startTime: new Date(),
    duration: 0,
    repetitions: 0,
    totalScore: 100,
    metrics: {
      formScore: 100,
      stabilityScore: 100,
      rangeOfMotion: 0,
      romPercentage: 0,
      repetitions: 0,
      avgAngles: {},
      duration: 0,
      avgFps: 0,
      avgLatency: 0,
    },
    repetitionsList: [],
    postureIssues: [],
    romData: [],
    completed: false,
    createdAt: new Date(),
  };
}

/**
 * Calcular duração atual de uma sessão em andamento
 */
export function calculateSessionDuration(session: ExerciseSession): number {
  const end = session.endTime || new Date();
  return Math.floor((end.getTime() - session.startTime.getTime()) / 1000);
}

// ============================================================================
// EXERCÍCIO (TEMPLATE)
// ============================================================================

/**
 * Template de configuração de um tipo de exercício
 */
export interface ExerciseTemplate {
  /** Tipo do exercício */
  type: ExerciseType;
  /** Nome amigável */
  name: string;
  /** Descrição do exercício */
  description: string;
  /** Índices dos landmarks principais */
  primaryKeypoints: number[];
  /** Pares de landmarks para cálculo de ângulos */
  angleTriads: AngleTriad[];
  /** Lógica de contagem de repetições */
  countingLogic: CountingLogic;
  /** Thresholds de detecção */
  thresholds: RepetitionThresholds;
  /** Peso do exercício na pontuação final */
  scoreWeight: number;
  /** ROM mínimo esperado (em graus) */
  expectedRomMin: number;
  /** ROM máximo esperado (em graus) */
  expectedRomMax: number;
}

/**
 * Tipos de lógica de contagem
 */
export enum CountingLogic {
  /** Fase up/down simples (agachamento, levantamento) */
  PHASE_UP_DOWN = 'phase_up_down',
  /** Fase esquerda/direita (abdução/adução) */
  PHASE_LEFT_RIGHT = 'phase_left_right',
  /** Fase flexão/extensão */
  PHASE_FLEXION_EXTENSION = 'phase_flexion_extension',
  /** Detectar quando corpo está reto/plano (prancha) */
  HOLD_POSITION = 'hold_position',
}

/**
 * Templates de exercícios pré-configurados
 */
export const EXERCISE_TEMPLATES: Record<ExerciseType, ExerciseTemplate> = {
  [ExerciseType.SQUAT]: {
    type: ExerciseType.SQUAT,
    name: 'Agachamento',
    description: 'Fortalecimento de pernas, glúteos e isquiotibiais',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.RIGHT_ANKLE,
    ],
    angleTriads: [
      {
        pivot: POSE_LANDMARKS.LEFT_HIP,
        a: POSE_LANDMARKS.LEFT_KNEE,
        b: POSE_LANDMARKS.LEFT_ANKLE,
      },
      {
        pivot: POSE_LANDMARKS.RIGHT_HIP,
        a: POSE_LANDMARKS.RIGHT_KNEE,
        b: POSE_LANDMARKS.RIGHT_ANKLE,
      },
    ],
    countingLogic: CountingLogic.PHASE_UP_DOWN,
    thresholds: DEFAULT_THRESHOLDS[ExerciseType.SQUAT],
    scoreWeight: 1.0,       // 30% do score total
    expectedRomMin: 70,      // Mínimo esperado
    expectedRomMax: 130,     // Máximo esperado
  },
  [ExerciseType.PUSHUP]: {
    type: ExerciseType.PUSHUP,
    name: 'Flexão de Braço',
    description: 'Fortalecimento de peitoral, tríceps e deltoides',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.RIGHT_WRIST,
    ],
    angleTriads: [
      {
        pivot: POSE_LANDMARKS.LEFT_SHOULDER,
        a: POSE_LANDMARKS.LEFT_ELBOW,
        b: POSE_LANDMARKS.LEFT_WRIST,
      },
      {
        pivot: POSE_LANDMARKS.RIGHT_SHOULDER,
        a: POSE_LANDMARKS.RIGHT_ELBOW,
        b: POSE_LANDMARKS.RIGHT_WRIST,
      },
    ],
    countingLogic: CountingLogic.PHASE_FLEXION_EXTENSION,
    thresholds: DEFAULT_THRESHOLDS[ExerciseType.PUSHUP],
    scoreWeight: 0.8,       // 25% do score total
    expectedRomMin: 100,     // Extensão completa
    expectedRomMax: 180,
  },
  [ExerciseType.LATERAL_RAISE]: {
    type: ExerciseType.LATERAL_RAISE,
    name: 'Levantamento Lateral',
    description: 'Fortalecimento de deltoides laterais, abdutores de quadril',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
    ],
    angleTriads: [
      {
        pivot: POSE_LANDMARKS.LEFT_SHOULDER,
        a: POSE_LANDMARKS.LEFT_HIP,
        b: POSE_LANDMARKS.LEFT_KNEE,
      },
    ],
    countingLogic: CountingLogic.PHASE_LEFT_RIGHT,
    thresholds: DEFAULT_THRESHOLDS[ExerciseType.LATERAL_RAISE],
    scoreWeight: 0.6,
    expectedRomMin: 0,
    expectedRomMax: 90,
  },
  [ExerciseType.PLANK]: {
    type: ExerciseType.PLANK,
    name: 'Prancha',
    description: 'Fortalecimento de core, estabilizadores e glúteos',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_ANKLE,
    ],
    angleTriads: [],
    countingLogic: CountingLogic.HOLD_POSITION,
    thresholds: DEFAULT_THRESHOLDS[ExerciseType.PLANK],
    scoreWeight: 1.5,       // 40% do score total
    expectedRomMin: 175,
    expectedRomMax: 185,
  },
  [ExerciseType.LUNGE]: {
    type: ExerciseType.LUNGE,
    name: 'Avanço',
    description: 'Fortalecimento de quadríceps, glúteos e isquiotibiais',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.RIGHT_ANKLE,
    ],
    angleTriads: [
      {
        pivot: POSE_LANDMARKS.LEFT_HIP,
        a: POSE_LANDMARKS.LEFT_KNEE,
        b: POSE_LANDMARKS.LEFT_ANKLE,
      },
      {
        pivot: POSE_LANDMARKS.RIGHT_HIP,
        a: POSE_LANDMARKS.RIGHT_KNEE,
        b: POSE_LANDMARKS.RIGHT_ANKLE,
      },
    ],
    countingLogic: CountingLogic.PHASE_LEFT_RIGHT,
    thresholds: DEFAULT_THRESHOLDS[ExerciseType.LUNGE],
    scoreWeight: 0.7,
    expectedRomMin: 70,
    expectedRomMax: 130,
  },
  [ExerciseType.SHOULDER_PRESS]: {
    type: ExerciseType.SHOULDER_PRESS,
    name: 'Desenvolvimento de Ombros',
    description: 'Fortalecimento de deltoide, trapézio e romboides',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST,
    ],
    angleTriads: [
      {
        pivot: POSE_LANDMARKS.LEFT_SHOULDER,
        a: POSE_LANDMARKS.LEFT_ELBOW,
        b: POSE_LANDMARKS.LEFT_WRIST,
      },
    ],
    countingLogic: CountingLogic.PHASE_FLEXION_EXTENSION,
    thresholds: {
      upThreshold: 180,
      downThreshold: 60,
      minDuration: 1000,
      maxDuration: 4000,
    },
    scoreWeight: 0.5,
    expectedRomMin: 150,
    expectedRomMax: 180,
  },
  [ExerciseType.HIP_ABDUCTION]: {
    type: ExerciseType.HIP_ABDUCTION,
    name: 'Abdução de Quadril',
    description: 'Fortalecimento de glúteos médios e laterais do quadril',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
    ],
    angleTriads: [
      {
        pivot: POSE_LANDMARKS.LEFT_SHOULDER,
        a: POSE_LANDMARKS.LEFT_HIP,
        b: POSE_LANDMARKS.LEFT_KNEE,
      },
    ],
    countingLogic: CountingLogic.PHASE_LEFT_RIGHT,
    thresholds: DEFAULT_THRESHOLDS[ExerciseType.LATERAL_RAISE],
    scoreWeight: 0.5,
    expectedRomMin: 0,
    expectedRomMax: 45,
  },
  [ExerciseType.KNEE_FLEXION]: {
    type: ExerciseType.KNEE_FLEXION,
    name: 'Flexão de Joelho',
    description: 'Fortalecimento de isquiotibiais, gastrocnêmio e sóleo',
    primaryKeypoints: [
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
    ],
    angleTriads: [
      {
        pivot: POSE_LANDMARKS.LEFT_HIP,
        a: POSE_LANDMARKS.LEFT_KNEE,
        b: POSE_LANDMARKS.LEFT_ANKLE,
      },
    ],
    countingLogic: CountingLogic.PHASE_FLEXION_EXTENSION,
    thresholds: {
      upThreshold: 150,
      downThreshold: 30,
      minDuration: 500,
      maxDuration: 4000,
    },
    scoreWeight: 0.5,
    expectedRomMin: 0,
    expectedRomMax: 140,
  },
};

/**
 * Obter template de exercício
 */
export function getExerciseTemplate(type: ExerciseType): ExerciseTemplate {
  return EXERCISE_TEMPLATES[type] || EXERCISE_TEMPLATES[ExerciseType.SQUAT];
}

/**
 * Obter nome do exercício
 */
export function getExerciseName(type: ExerciseType): string {
  return getExerciseTemplate(type)?.name || 'Exercício Desconhecido';
}

// ============================================================================
// POSE PROVIDER INTERFACE
// ============================================================================

/**
 * Interface abstrata para provedores de detecção de pose
 * Permite trocar entre Web (MediaPipe via CDN) e Native
 */
export interface PoseProvider {
  /**
   * Inicializar o provedor de pose
   */
  initialize(): Promise<void>;

  /**
   * Detectar pose em um frame de vídeo ou imagem
   */
  detect(video: HTMLVideoElement | HTMLCanvasElement | ImageBitmap | HTMLImageElement): Promise<PoseDetection>;

  /**
   * Detectar pose em tempo real (stream)
   */
  startStream(video: HTMLVideoElement, callback: (result: PoseDetection) => void): void;

  /**
   * Parar detecção em stream
   */
  stopStream(): void;

  /**
   * Liberar recursos
   */
  close(): void;

  /**
   * Verificar se está inicializado
   */
  isInitialized(): boolean;
}

// ============================================================================
// ANALYSIS RESULT
// ============================================================================

/**
 * Resultado de uma análise biomecânica
 */
export interface AnalysisResult {
  /** Dados de pose detectados */
  pose: PoseDetection;
  /** Ângulos de articulações */
  jointAngles: Map<MainJoint, JointAngle>;
  /** Problemas posturais detectados */
  postureIssues: PostureIssue[];
  /** Contagem de repetições */
  repCount: number;
  /** Repetições registradas */
  repetitions: Repetition[];
  /** Métricas de performance */
  metrics: ExerciseMetrics;
  /** Timestamp da análise */
  timestamp: number;
}

/**
 * Criar resultado de análise vazio
 */
export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    pose: {
      landmarks: [],
      confidence: 0,
      timestamp: 0,
      analysisType: AnalysisType.FORM,
    },
    jointAngles: new Map(),
    postureIssues: [],
    repCount: 0,
    repetitions: [],
    metrics: {
      formScore: 0,
      stabilityScore: 0,
      rangeOfMotion: 0,
      romPercentage: 0,
      repetitions: 0,
      avgAngles: {},
      duration: 0,
      avgFps: 0,
      avgLatency: 0,
    },
    timestamp: Date.now(),
  };
}

