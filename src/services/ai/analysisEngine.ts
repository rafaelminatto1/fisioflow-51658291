/**
 * Analysis Engine - Motor de Análise Biomecânica
 *
 * Este módulo contém toda a lógica de análise de pose para o FisioFlow:
 * - Cálculo de ângulos de articulações
 * - Detecção de problemas posturais
 * - Análise de estabilidade
 * - Cálculo de amplitude de movimento (ADM)
 * - Score de forma/execução
 */

import {
  PoseLandmark,
  PoseDetection,
  AnalysisResult,
  PostureIssue,
  SeverityLevel,
  PostureIssueType,
  MainJoint,
  ExerciseType,
  ExerciseTemplate,
  getExerciseTemplate,
  RomData,
} from '@/types/pose';
import { calculateAngle } from '@/utils/geometry';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

/**
 * Configurações padrão para análise biomecânica
 */
export const DEFAULT_CONFIG = {
  /** Limiar de visibilidade para considerar um landmark válido */
  visibilityThreshold: 0.5,

  /** Fator de suavização de landmarks */
  smoothingFactor: 0.7,

  /** Limiar para considerar mudança significativa de ângulo */
  angleChangeThreshold: 5,

  /** Número mínimo de frames para cálculo estável */
  minFramesForStableReading: 3,

  /** Limiar de instabilidade (variação entre frames) */
  instabilityThreshold: 15, // 15 graus de variação
} as const;

// ============================================================================
// ESTADO DO ANALYSIS ENGINE
// ============================================================================

interface AnalysisEngineState {
  /** Landmarks do frame anterior (para suavização) */
  previousLandmarks: PoseLandmark[];
  /** Contador de frames processados */
  frameCount: number;
  /** Média móvel de valores */
  movingAverages: Map<string, number[]>;
  /** Última atualização de score */
  lastScoreUpdate: number;
  /** Histórico de ângulos para cálculo de estabilidade */
  angleHistory: Map<string, number[]>;
  /** Timestamp do início da análise */
  analysisStartTime: number;
  /** Callbacks registrados */
  callbacks: {
    onPoseDetected?: (result: AnalysisResult) => void;
    onRepCountChanged?: (count: number) => void;
    onFormScoreChanged?: (score: number) => void;
  };
}

/**
 * Engine de Análise Biomecânica
 */
export class AnalysisEngine {
  private state: AnalysisEngineState;
  private exerciseType: ExerciseType;
  private exerciseTemplate: ExerciseTemplate;
  private isActive = false;

  constructor(exerciseType: ExerciseType = ExerciseType.SQUAT) {
    this.exerciseType = exerciseType;
    this.exerciseTemplate = getExerciseTemplate(exerciseType) ||
      getExerciseTemplate(ExerciseType.SQUAT);

    this.state = {
      previousLandmarks: [],
      frameCount: 0,
      movingAverages: new Map(),
      angleHistory: new Map(),
      lastScoreUpdate: Date.now(),
      analysisStartTime: Date.now(),
      callbacks: {},
    };
  }

  /**
   * Registrar callback para eventos de análise
   */
  on(event: 'poseDetected', callback: (result: AnalysisResult) => void): void;
  on(event: 'repCountChanged', callback: (count: number) => void): void;
  on(event: 'formScoreChanged', callback: (score: number) => void): void;

  on(event: string, callback: Function): void {
    switch (event) {
      case 'poseDetected':
        this.state.callbacks.onPoseDetected = callback as any;
        break;
      case 'repCountChanged':
        this.state.callbacks.onRepCountChanged = callback as any;
        break;
      case 'formScoreChanged':
        this.state.callbacks.onFormScoreChanged = callback as any;
        break;
    }
  }

  /**
   * Atualizar tipo de exercício
   */
  setExerciseType(type: ExerciseType): void {
    this.exerciseType = type;
    this.exerciseTemplate = getExerciseTemplate(type) || this.exerciseTemplate;
    this.reset();
  }

  /**
   * Iniciar análise
   */
  start(): void {
    this.isActive = true;
    this.reset();
  }

  /**
   * Parar análise
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Resetar estado da análise
   */
  private reset(): void {
    this.state.previousLandmarks = [];
    this.state.frameCount = 0;
    this.state.movingAverages.clear();
    this.state.angleHistory.clear();
    this.state.analysisStartTime = Date.now();
  }

  /**
   * Detectar orientação do usuário (Frente, Lado, Costas)
   */
  private detectOrientation(landmarks: PoseLandmark[]): 'FRONT' | 'SIDE_LEFT' | 'SIDE_RIGHT' | 'BACK' {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 'FRONT';

    // Calcular largura dos ombros vs largura quadril
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipWidth = Math.abs(leftHip.x - rightHip.x);

    // Se a largura dos ombros for muito pequena em relação à altura, está de lado
    // Altura do tronco (aproximada)
    const trunkHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);
    
    // Razão largura/altura
    const ratio = shoulderWidth / trunkHeight;

    if (ratio < 0.25) {
      // Provavelmente de lado. Verificar qual lado usando o nariz (se visível)
      if (nose && nose.x < leftShoulder.x) return 'SIDE_LEFT';
      return 'SIDE_RIGHT';
    }

    // Verificar profundidade (z) para distinguir frente/costas (se disponível e confiável)
    // MediaPipe: z negativo é "perto da câmera". Nariz deve ter z < ombros se de frente.
    if (nose && nose.z !== undefined && leftShoulder.z !== undefined) {
       if (nose.z > leftShoulder.z) return 'BACK'; // Nariz "atrás" dos ombros
    }

    return 'FRONT';
  }

  /**
   * Processar frame de vídeo e gerar análise
   */
  processFrame(poseDetection: PoseDetection): AnalysisResult {
    if (!this.isActive || !poseDetection.landmarks || poseDetection.landmarks.length === 0) {
      return createEmptyAnalysisResult();
    }

    this.state.frameCount++;

    // Suavizar landmarks
    const smoothedLandmarks = this.smoothLandmarks(poseDetection.landmarks);

    // Detectar orientação
    const orientation = this.detectOrientation(smoothedLandmarks);

    // Calcular ângulos de articulações
    const jointAngles = this.calculateJointAngles(smoothedLandmarks);

    // Detectar problemas posturais
    const postureIssues = this.detectPostureIssues(smoothedLandmarks, jointAngles);

    // Calcular score de forma
    const formScore = this.calculateFormScore(jointAngles, postureIssues);

    // Calcular estabilidade
    const stabilityScore = this.calculateStability(jointAngles);

    // Calcular amplitude de movimento
    const romData = this.calculateRangeOfMotion(jointAngles);

    // Notificar callbacks
    this.notifyCallbacks({
      pose: poseDetection,
      jointAngles,
      postureIssues,
      formScore,
      stabilityScore,
      romData,
    });

    // Atualizar estado para próximo frame
    this.updateState(smoothedLandmarks, jointAngles);

    return {
      pose: poseDetection,
      jointAngles: new Map(Object.entries(jointAngles).map(([k, v]) => [k, v] as [MainJoint, any])),
      postureIssues,
      repCount: 0, // RepCount gerenciado por classe separada
      repetitions: [],
      metrics: {
        formScore,
        stabilityScore,
        rangeOfMotion: romData.rom,
        romPercentage: romData.percentageOfNormal,
        repetitions: 0,
        avgAngles: Object.fromEntries(
          Object.entries(jointAngles).map(([k, v]) => [k, v.average])
        ) as Record<string, number>,
        duration: this.state.frameCount / 30, // Aprox. 30fps
        avgFps: 0,
        avgLatency: 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Suavizar landmarks usando média móvel
   */
  private smoothLandmarks(landmarks: PoseLandmark[]): PoseLandmark[] {
    if (this.state.previousLandmarks.length === 0) {
      this.state.previousLandmarks = landmarks;
      return landmarks;
    }

    return landmarks.map((lm, index) => {
      const prev = this.state.previousLandmarks[index];
      if (!prev) return lm;

      return {
        x: lm.x * (1 - DEFAULT_CONFIG.smoothingFactor) + prev.x * DEFAULT_CONFIG.smoothingFactor,
        y: lm.y * (1 - DEFAULT_CONFIG.smoothingFactor) + prev.y * DEFAULT_CONFIG.smoothingFactor,
        z: lm.z ? (lm.z! * (1 - DEFAULT_CONFIG.smoothingFactor) + prev.z! * DEFAULT_CONFIG.smoothingFactor) : undefined,
        visibility: (lm.visibility || 0) * (1 - DEFAULT_CONFIG.smoothingFactor) + (prev.visibility || 0) * DEFAULT_CONFIG.smoothingFactor,
      };
    });
  }

  /**
   * Calcular ângulos de todas as articulações principais
   */
  private calculateJointAngles(landmarks: PoseLandmark[]): Record<MainJoint, any> {
    const angles: Record<MainJoint, any> = {};

    // Calcular para cada triângulo de ângulo definido no template
    for (const triad of this.exerciseTemplate.angleTriads || []) {
      const pivot = landmarks[triad.pivot];
      const a = landmarks[triad.a];
      const b = landmarks[triad.b];

      if (pivot && a && b &&
          (pivot.visibility || 0) > DEFAULT_CONFIG.visibilityThreshold &&
          (a.visibility || 0) > DEFAULT_CONFIG.visibilityThreshold &&
          (b.visibility || 0) > DEFAULT_CONFIG.visibilityThreshold) {

        const angle = calculateAngle(
          { x: pivot.x, y: pivot.y },
          { x: a.x, y: a.y },
          { x: b.x, y: b.y }
        );

        angles[this.exerciseTemplate.primaryKeypoints?.[triad.pivot] as MainJoint] = {
          current: angle,
          min: Math.min(angle, this.getMinAngleFromHistory(triad.pivot)),
          max: Math.max(angle, this.getMaxAngleFromHistory(triad.pivot)),
          average: this.getAverageAngleFromHistory(triad.pivot),
          target: this.exerciseTemplate.thresholds?.[triad.pivot as string] || { min: 0, max: 180 },
          inRange: this.isAngleInTargetRange(angle, triad.pivot),
          pivotIndex: triad.pivot,
        };
      }
    }

    return angles;
  }

  /**
   * Detectar problemas posturais
   */
  private detectPostureIssues(landmarks: PoseLandmark[], jointAngles: Record<MainJoint, any>): PostureIssue[] {
    const issues: PostureIssue[] = [];
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];

    // Verificar alinhamento de cabeça
    if (nose && leftShoulder && rightShoulder) {
      const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
      const headOffset = Math.abs(nose.x - midShoulderX);

      if (headOffset > 0.08) {
        // Cabeça muito à frente
        issues.push({
          type: PostureIssueType.HEAD_FORWARD,
          severity: SeverityLevel.MODERATE,
          description: 'Cabeça projetada para frente dos ombros',
          suggestion: 'Mantenha a cabeça alinhada com os ombros',
          scoreImpact: getSeverityScore(SeverityLevel.MODERATE),
        });
      } else if (headOffset > 0.05) {
        // Cabeça um pouco à frente
        issues.push({
          type: PostureIssueType.HEAD_FORWARD,
          severity: SeverityLevel.MILD,
          description: 'Cabeça levemente projetada para frente',
          suggestion: 'Puxe levemente o queixo para trás',
          scoreImpact: getSeverityScore(SeverityLevel.MILD),
        });
      }
    }

    // Verificar nível dos ombros
    if (leftShoulder && rightShoulder) {
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
      if (shoulderDiff > 0.05) {
        issues.push({
          type: PostureIssueType.SHOULDERS_ASYMMETRICAL,
          severity: SeverityLevel.MILD,
          description: 'Ombros em níveis diferentes',
          suggestion: 'Tente manter os ombros nivelados',
          scoreImpact: getSeverityScore(SeverityLevel.MILD),
        });
      }
    }

    // Verificar nível dos quadris
    if (leftHip && rightHip) {
      const hipDiff = Math.abs(leftHip.y - rightHip.y);
      if (hipDiff > 0.05) {
        issues.push({
          type: PostureIssueType.HIPS_ASYMMETRIC,
          severity: SeverityLevel.MILD,
          description: 'Quadris em níveis diferentes',
          suggestion: 'Distribua o peso igualmente',
          scoreImpact: getSeverityScore(SeverityLevel.MILD),
        });
      }
    }

    // Verificar alinhamento de orelhas e ombros (vista lateral)
    if (leftEar && leftShoulder) {
      const earOffset = leftEar.y - leftShoulder.y;
      if (earOffset > 0.03) {
        issues.push({
          type: PostureIssueType.HEAD_BACKWARD,
          severity: SeverityLevel.MILD,
          description: 'Orelhas mais baixas que os ombros',
          suggestion: 'Alongue o pescoço lateralmente',
          scoreImpact: getSeverityScore(SeverityLevel.MILD),
        });
      }
    }

    return issues;
  }

  /**
   * Calcular score de forma (0-100)
   */
  private calculateFormScore(jointAngles: Record<MainJoint, any>, issues: PostureIssue[]): number {
    let score = 100;

    // Penalidades por problemas posturais
    for (const issue of issues) {
      score -= issue.scoreImpact;
    }

    // Avaliar alinhamento de articulações principais
    for (const [joint, angleData] of Object.entries(jointAngles)) {
      if (angleData && typeof angleData === 'object') {
        const angle = angleData as { current: number; target: any; inRange: boolean };
        if (!angle.inRange && angle.target) {
          const target = angle.target as { min: number; max: number };
          const deviation = this.calculateAngleDeviation(angle.current, target.min, target.max);
          const penalty = Math.min(deviation / 2, 20); // Máx 20 pontos de penalidade
          score -= penalty;
        }
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calcular desvio de ângulo em relação ao alvo
   */
  private calculateAngleDeviation(current: number, min: number, max: number): number {
    if (current >= min && current <= max) {
      return 0;
    }
    const range = max - min;
    const deviationFromMin = Math.max(0, min - current);
    const deviationFromMax = Math.max(0, current - max);
    return deviationFromMin + deviationFromMax;
  }

  /**
   * Verificar se ângulo está dentro da zona alvo
   */
  private isAngleInTargetRange(angle: number, pivotIndex: number): boolean {
    const target = this.exerciseTemplate.thresholds?.[pivotIndex as string];
    if (!target || typeof target !== 'object') return true;

    const targetRange = target as { min: number; max: number };
    return angle >= targetRange.min && angle <= targetRange.max;
  }

  /**
   * Calcular score de estabilidade (0-100)
   */
  private calculateStability(jointAngles: Record<MainJoint, any>): number {
    let stabilityScore = 100;
    let unstableJoints = 0;

    for (const [joint, angleData] of Object.entries(jointAngles)) {
      if (angleData && typeof angleData === 'object') {
        const data = angleData as { min: number; max: number };
        const range = data.max - data.min;

        // Se houver muita variação (instabilidade)
        if (range > DEFAULT_CONFIG.instabilityThreshold) {
          unstableJoints++;
          const penalty = Math.min(range / 2, 25);
          stabilityScore -= penalty;
        }
      }
    }

    return Math.max(0, Math.min(100, Math.round(stabilityScore)));
  }

  /**
   * Calcular amplitude de movimento (ADM)
   */
  private calculateRangeOfMotion(jointAngles: Record<MainJoint, any>): RomData {
    const romData: RomData[] = [];

    // Para cada triângulo de ângulo no template
    for (const triad of this.exerciseTemplate.angleTriads || []) {
      const angleData = jointAngles[this.exerciseTemplate.primaryKeypoints?.[triad.pivot] as MainJoint];

      if (angleData && typeof angleData === 'object') {
        const data = angleData as { min: number; max: number };
        const rom = data.max - data.min;

        const expected = this.exerciseTemplate;
        let normalMin = 0;
        let normalMax = 180;

        if (expected && typeof expected === 'object') {
          const exp = expected as any;
          normalMin = exp.expectedRomMin || 0;
          normalMax = exp.expectedRomMax || 180;
        }

        // Calcular porcentagem do normal atingido
        const normalRange = normalMax - normalMin;
        const percentage = normalRange > 0 ? (rom / normalRange) * 100 : 0;

        romData.push({
          joint: this.exerciseTemplate.primaryKeypoints?.[triad.pivot] as MainJoint,
          rom: Math.round(rom * 10) / 10, // Arredondar para 1 casa decimal
          normalMin,
          normalMax,
          percentageOfNormal: Math.min(100, Math.round(percentage * 10) / 10),
        });
      }
    }

    // Calcular ADM médio (média das articulações principais)
    if (romData.length > 0) {
      const avgRom = romData.reduce((sum, r) => sum + r.rom, 0) / romData.length;
      const avgPercentage = romData.reduce((sum, r) => sum + r.percentageOfNormal, 0) / romData.length;

      return {
        joint: MainJoint.LEFT_KNEE, // Joint genérico para ADM médio
        rom: Math.round(avgRom * 10) / 10,
        normalMin: 0,
        normalMax: 0,
        percentageOfNormal: Math.round(avgPercentage * 10) / 10,
      };
    }

    // Fallback se não houver dados de ROM
    return {
      joint: MainJoint.LEFT_KNEE,
      rom: 0,
      normalMin: 0,
      normalMax: 0,
      percentageOfNormal: 0,
    };
  }

  /**
   * Obter ângulo mínimo do histórico
   */
  private getMinAngleFromHistory(pivotIndex: number): number {
    const history = this.state.angleHistory.get(pivotIndex.toString());
    if (!history || history.length === 0) return 180;
    return Math.min(...history);
  }

  /**
   * Obter ângulo máximo do histórico
   */
  private getMaxAngleFromHistory(pivotIndex: number): number {
    const history = this.state.angleHistory.get(pivotIndex.toString());
    if (!history || history.length === 0) return 0;
    return Math.max(...history);
  }

  /**
   * Obter média do histórico
   */
  private getAverageAngleFromHistory(pivotIndex: number): number {
    const history = this.state.angleHistory.get(pivotIndex.toString());
    if (!history || history.length === 0) return 90;
    return history.reduce((sum, angle) => sum + angle, 0) / history.length;
  }

  /**
   * Atualizar estado interno
   */
  private updateState(landmarks: PoseLandmark[], jointAngles: Record<MainJoint, any>): void {
    this.state.previousLandmarks = [...landmarks];

    // Atualizar histórico de ângulos
    for (const triad of this.exerciseTemplate.angleTriads || []) {
      const angleData = jointAngles[this.exerciseTemplate.primaryKeypoints?.[triad.pivot] as MainJoint];
      if (angleData && typeof angleData === 'object') {
        const data = angleData as { current: number };
        const key = triad.pivot.toString();
        const history = this.state.angleHistory.get(key) || [];
        history.push(data.current);

        // Manter apenas últimos 30 frames
        if (history.length > 30) {
          history.shift();
        }

        this.state.angleHistory.set(key, history);
      }
    }

    // Atualizar score periodicamente (não a cada frame)
    const now = Date.now();
    if (now - this.state.lastScoreUpdate > 500) { // A cada 500ms
      this.state.lastScoreUpdate = now;
    }
  }

  /**
   * Notificar callbacks registrados
   */
  private notifyCallbacks(data: {
    pose: PoseDetection;
    jointAngles: Record<MainJoint, any>;
    postureIssues: PostureIssue[];
    formScore: number;
    stabilityScore: number;
    romData: RomData;
  }): void {
    if (this.state.callbacks.onPoseDetected) {
      this.state.callbacks.onPoseDetected({
        pose: data.pose,
        jointAngles: new Map(Object.entries(data.jointAngles) as [MainJoint, any]),
        postureIssues: data.postureIssues,
        repCount: 0,
        repetitions: [],
        metrics: {
          formScore: data.formScore,
          stabilityScore: data.stabilityScore,
          rangeOfMotion: data.romData.rom || 0,
          romPercentage: data.romData.percentageOfNormal,
          repetitions: 0,
          avgAngles: Object.fromEntries(
            Object.entries(data.jointAngles).map(([k, v]) => [k, v?.average])
          ) as Record<string, number>,
          duration: (Date.now() - this.state.analysisStartTime) / 1000,
          avgFps: 0,
          avgLatency: 0,
        },
        timestamp: Date.now(),
      });
    }
  }
}

// ============================================================================
// FUNÇÕES DE APOIO
// ============================================================================

/**
 * Criar resultado de análise vazio
 */
export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    pose: {
      landmarks: [],
      confidence: 0,
      timestamp: 0,
      analysisType: 'form' as any,
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

/**
 * Obter score de severidade
 */
function getSeverityScore(severity: SeverityLevel): number {
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

/**
 * Verificar se ângulo está dentro da zona alvo
 */
export function isAngleInTargetRange(
  current: number,
  targetMin: number,
  targetMax: number
): boolean {
  return current >= targetMin && current <= targetMax;
}

/**
 * Calcular desvio de ângulo do alvo
 */
export function calculateAngleDeviation(
  current: number,
  targetMin: number,
  targetMax: number
): number {
  if (current >= targetMin && current <= targetMax) {
    return 0;
  }
  const range = targetMax - targetMin;
  const deviationFromMin = Math.max(0, targetMin - current);
  const deviationFromMax = Math.max(0, current - targetMax);
  return deviationFromMin + deviationFromMax;
}

/**
 * Calcular score combinado de forma e estabilidade
 */
export function calculateCombinedScore(
  formScore: number,
  stabilityScore: number
): number {
  return Math.round((formScore + stabilityScore) / 2);
}

export type { AnalysisEngineState };
