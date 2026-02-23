/**
 * Repetition Counter - Contador de Repetições
 *
 * Este módulo contém toda a lógica de contagem de repetições
 * para diferentes tipos de exercícios (squat, pushup, plank, etc.)
 */

import {
  PoseLandmark,
  Repetition,
  RepCounterState,
  RepetitionThresholds,
  MovementPhase,
  ExerciseType,
  DEFAULT_THRESHOLDS,
  ExecutionQuality,
} from '@/types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const REP_COUNTER_CONFIG = {
  /** Tempo mínimo de permanência em uma fase para considerar válida */
  minPhaseDuration: 200, // 200ms

  /** Tempo máximo de permanência em uma fase antes de resetar */
  maxPhaseDuration: 10000, // 10 segundos

  /** Porcentagem do movimento que deve ser completada para contar */
  phaseCompletionThreshold: 0.6, // 60% do movimento

  /** Histerese para mudança de fase (evitar flutuação) */
  hysteresisAmount: 5, // ±5 graus para ângulos
} as const;

// ============================================================================
// TIPO DE EXERCÍCIO COM LÓGICA DE CONTAGEM
// ============================================================================

/**
 * Definição de como cada tipo de exercício conta repetições
 */
export type CountingMethod =
  | 'phase_up_down'           // Fase para cima/baixo (agachamento)
  | 'phase_left_right'         // Fase esquerda/direita (abdução/adução)
  | 'phase_flexion_extension' // Flexão/extensão
  | 'hold_position'           // Manter posição (prancha)
  | 'angle_threshold';         // Passar limiar de ângulo
;

// ============================================================================
// ESTADO DO CONTADOR
// ============================================================================

/**
 * Estado interno do contador de repetições
 */
interface RepCounterInternalState {
  /** Contagem atual */
  count: number;
  /** Fase atual do movimento */
  currentPhase: MovementPhase | null;
  /** Timestamp de entrada na fase atual */
  phaseStartTime: number;
  /** Fase anterior (para histerese) */
  previousPhase: MovementPhase | null;
  /** Ângulo atual (para lógica baseada em ângulo) */
  currentAngle: number;
  /** Histórico de ângulos na fase atual */
  angleHistory: number[];
  /** Se a repetição atual foi completada */
  currentRepCompleted: boolean;
  /** Thresholds configurados */
  thresholds: RepetitionThresholds;
  /** Método de contagem */
  method: CountingMethod;
  /** Valores máximo e mínimo atingidos */
  maxAngle: number;
  minAngle: number;
  /** Repetições da sessão */
  repetitions: Repetition[];
}

// ============================================================================
// REPEATITION COUNTER
// ============================================================================

/**
 * Contador de repetições para exercícios de fisioterapia
 */
export class RepetitionCounter {
  private state: RepCounterInternalState;
  private isPaused = false;
  private callbacks: {
    onRepCountChanged?: (count: number) => void;
    onRepCompleted?: (rep: Repetition) => void;
    onPhaseChanged?: (phase: MovementPhase) => void;
  };

  /**
   * Criar novo contador
   */
  constructor(exerciseType: ExerciseType = ExerciseType.SQUAT) {
    this.state = {
      count: 0,
      currentPhase: null,
      phaseStartTime: 0,
      previousPhase: null,
      currentAngle: 0,
      angleHistory: [],
      currentRepCompleted: false,
      thresholds: DEFAULT_THRESHOLDS[exerciseType] || DEFAULT_THRESHOLDS[ExerciseType.SQUAT],
      method: this.getMethodForExercise(exerciseType),
      maxAngle: 0,
      minAngle: 0,
      repetitions: [],
    };
  }

  /**
   * Obter método de contagem para o tipo de exercício
   */
  private getMethodForExercise(type: ExerciseType): CountingMethod {
    const template = DEFAULT_THRESHOLDS[type];
    if (!template) return 'phase_up_down';

    // Verificar qual método usar baseado no template
    switch (type) {
      case ExerciseType.SQUAT:
      case ExerciseType.PUSHUP:
        return 'phase_up_down';
      case ExerciseType.LATERAL_RAISE:
      case ExerciseType.LUNGE:
        return 'phase_left_right';
      case ExerciseType.SHOULDER_PRESS:
      case ExerciseType.KNEE_FLEXION:
        return 'phase_flexion_extension';
      case ExerciseType.PLANK:
        return 'hold_position';
      default:
        return 'phase_up_down';
    }
  }

  /**
   * Definir tipo de exercício
   */
  setExerciseType(type: ExerciseType): void {
    this.state.method = this.getMethodForExercise(type);
    this.state.thresholds = DEFAULT_THRESHOLDS[type] || DEFAULT_THRESHOLDS[ExerciseType.SQUAT];
    this.reset();
  }

  /**
   * Definir thresholds customizados
   */
  setThresholds(thresholds: Partial<RepetitionThresholds>): void {
    this.state.thresholds = { ...this.state.thresholds, ...thresholds };
  }

  /**
   * Obter contagem atual
   */
  getCount(): number {
    return this.state.count;
  }

  /**
   * Obter todas as repetições registradas
   */
  getRepetitions(): Repetition[] {
    return [...this.state.repetitions];
  }

  /**
   * Obter estado completo do contador
   */
  getState(): RepCounterState {
    return {
      currentCount: this.state.count,
      currentPhase: this.state.currentPhase,
      lastPhaseChange: this.state.phaseStartTime,
      repCount: this.state.count,
      repetitions: this.state.repetitions,
      thresholds: this.state.thresholds,
    };
  }

  /**
   * Resetar contador
   */
  reset(): void {
    this.state = {
      ...this.state,
      count: 0,
      currentPhase: null,
      phaseStartTime: 0,
      previousPhase: null,
      currentAngle: 0,
      angleHistory: [],
      currentRepCompleted: false,
      maxAngle: 0,
      minAngle: 0,
      repetitions: [],
    };
    this.isPaused = false;

    logger.info('[RepCounter] Resetado', undefined, 'RepCounter');
  }

  /**
   * Pausar contador
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Retomar contador
   */
  resume(): void {
    this.isPaused = false;
    this.state.phaseStartTime = Date.now();
  }

  /**
   * Verificar se está pausado
   */
  isCounterPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Atualizar ângulo atual (para métodos baseados em ângulo)
   */
  updateAngle(angle: number): void {
    this.state.currentAngle = angle;
    this.state.angleHistory.push(angle);

    // Atualizar max/min
    if (angle > this.state.maxAngle) {
      this.state.maxAngle = angle;
    }
    if (angle < this.state.minAngle || this.state.minAngle === 0) {
      this.state.minAngle = angle;
    }

    // Manter apenas últimos 100 valores
    if (this.state.angleHistory.length > 100) {
      this.state.angleHistory.shift();
    }
  }

  /**
   * Processar frame de pose e atualizar contador
   * Esta é a função principal chamada a cada frame
   */
  processFrame(landmarks: PoseLandmark[]): {
    count: number;
    phase: MovementPhase | null;
    repCompleted?: Repetition;
  } {
    if (this.isPaused) {
      return {
        count: this.state.count,
        phase: this.state.currentPhase,
      };
    }

    // Processar baseado no método de contagem
    switch (this.state.method) {
      case 'phase_up_down':
        return this.processPhaseUpDown(landmarks);
      case 'phase_left_right':
        return this.processPhaseLeftRight(landmarks);
      case 'phase_flexion_extension':
        return this.processPhaseFlexionExtension(landmarks);
      case 'hold_position':
        return this.processHoldPosition(landmarks);
      default:
        return this.processPhaseUpDown(landmarks); // Fallback
    }
  }

  /**
   * Processar método: Fase Up/Down (agachamento, pushup)
   */
  private processPhaseUpDown(landmarks: PoseLandmark[]): {
    count: number;
    phase: MovementPhase | null;
    repCompleted?: Repetition;
  } {
    const { upThreshold, downThreshold } = this.state.thresholds;

    if (!upThreshold || !downThreshold) {
      return {
        count: this.state.count,
        phase: this.state.currentPhase,
      };
    }

    // Detectar se está "em cima" ou "em baixo"
    // Para agachamento: y menor é "em cima" (quadril mais alto)
    const isUpPhase = this.state.currentAngle > upThreshold;
    const isDownPhase = this.state.currentAngle < downThreshold;

    const newPhase: MovementPhase = isUpPhase ? MovementPhase.UP : MovementPhase.DOWN;

    // Histerese: só mudar fase se estiver bem além do threshold
    const phaseChanged = this.state.currentPhase !== null &&
      newPhase !== this.state.currentPhase;

    // Se mudou de fase E estamos na fase oposta, contar uma repetição
    if (phaseChanged) {
      const previousPhase = this.state.previousPhase;

      // Só conta se foi UP -> DOWN ou DOWN -> UP (completou ciclo)
      const shouldCount = (previousPhase === MovementPhase.UP && newPhase === MovementPhase.DOWN) ||
                        (previousPhase === MovementPhase.DOWN && newPhase === MovementPhase.UP);

      if (shouldCount) {
        const rep = this.completeRepetition();
        this.state.currentRepCompleted = true;

        return {
          count: this.state.count,
          phase: newPhase,
          repCompleted: rep,
        };
      }
    }

    // Notificar mudança de fase se aplicável
    if (phaseChanged) {
      this.state.previousPhase = this.state.currentPhase;
      this.notifyPhaseChange(newPhase);
    }

    this.state.currentPhase = newPhase;

    return {
      count: this.state.count,
      phase: newPhase,
    };
  }

  /**
   * Processar método: Fase Left/Right (abdução/adução)
   */
  private processPhaseLeftRight(landmarks: PoseLandmark[]): {
    count: number;
    phase: MovementPhase | null;
    repCompleted?: Repetition;
  } {
    const { upThreshold, downThreshold } = this.state.thresholds;

    if (!upThreshold || !downThreshold) {
      return {
        count: this.state.count,
        phase: this.state.currentPhase,
      };
    }

    // Detectar se está "esquerda" ou "direita"
    const isLeftPhase = this.state.currentAngle > upThreshold;
    const isRightPhase = this.state.currentAngle < downThreshold;

    const newPhase: MovementPhase = isLeftPhase ? MovementPhase.LEFT : MovementPhase.RIGHT;

    // Histerese: só mudar fase se estiver bem além do threshold
    const phaseChanged = this.state.currentPhase !== null &&
      newPhase !== this.state.currentPhase;

    if (phaseChanged) {
      const previousPhase = this.state.previousPhase;

      // Só conta se completou ciclo
      const shouldCount = (previousPhase === MovementPhase.LEFT && newPhase === MovementPhase.RIGHT) ||
                        (previousPhase === MovementPhase.RIGHT && newPhase === MovementPhase.LEFT);

      if (shouldCount) {
        const rep = this.completeRepetition();
        this.state.currentRepCompleted = true;

        return {
          count: this.state.count,
          phase: newPhase,
          repCompleted: rep,
        };
      }
    }

    if (phaseChanged) {
      this.state.previousPhase = this.state.currentPhase;
      this.notifyPhaseChange(newPhase);
    }

    this.state.currentPhase = newPhase;

    return {
      count: this.state.count,
      phase: newPhase,
    };
  }

  /**
   * Processar método: Flexão/Extensão (ombro, joelho)
   */
  private processPhaseFlexionExtension(landmarks: PoseLandmark[]): {
    count: number;
    phase: MovementPhase | null;
    repCompleted?: Repetition;
  } {
    const { upThreshold, downThreshold } = this.state.thresholds;

    if (!upThreshold || !downThreshold) {
      return {
        count: this.state.count,
        phase: this.state.currentPhase,
      };
    }

    // Detectar flexão (ângulo menor) ou extensão (ângulo maior)
    const isExtension = this.state.currentAngle > upThreshold;
    const isFlexion = this.state.currentAngle < downThreshold;

    const newPhase: MovementPhase = isExtension ? MovementPhase.EXTENSION : MovementPhase.FLEXION;

    // Histerese: só mudar fase se estiver bem além do threshold
    const phaseChanged = this.state.currentPhase !== null &&
      newPhase !== this.state.currentPhase;

    if (phaseChanged) {
      const previousPhase = this.state.previousPhase;

      const shouldCount = (previousPhase === MovementPhase.FLEXION && newPhase === MovementPhase.EXTENSION) ||
                        (previousPhase === MovementPhase.EXTENSION && newPhase === MovementPhase.FLEXION);

      if (shouldCount) {
        const rep = this.completeRepetition();
        this.state.currentRepCompleted = true;

        return {
          count: this.state.count,
          phase: newPhase,
          repCompleted: rep,
        };
      }
    }

    if (phaseChanged) {
      this.state.previousPhase = this.state.currentPhase;
      this.notifyPhaseChange(newPhase);
    }

    this.state.currentPhase = newPhase;

    return {
      count: this.state.count,
      phase: newPhase,
    };
  }

  /**
   * Processar método: Manter Posição (prancha)
   */
  private processHoldPosition(landmarks: PoseLandmark[]): {
    count: number;
    phase: MovementPhase | null;
    repCompleted?: Repetition;
  } {
    const { minDuration, maxDuration } = this.state.thresholds;

    const now = Date.now();
    const timeInPhase = this.state.phaseStartTime ? now - this.state.phaseStartTime : 0;

    // Verificar se completou o tempo mínimo
    if (timeInPhase >= minDuration && !this.state.currentRepCompleted) {
      this.state.currentRepCompleted = true;
      const rep = this.completeRepetition();

      return {
        count: this.state.count,
        phase: MovementPhase.HOLD,
        repCompleted: rep,
      };
    }

    // Verificar se excedeu tempo máximo (pausar?)
    if (timeInPhase >= maxDuration) {
      // Reset para próxima repetição
      this.state.phaseStartTime = now;
    }

    return {
      count: this.state.count,
      phase: MovementPhase.HOLD,
    };
  }

  /**
   * Completar repetição atual e iniciar nova
   */
  private completeRepetition(): Repetition {
    const now = Date.now();

    // Calcular duração da repetição
    const duration = this.state.phaseStartTime ?
      now - this.state.phaseStartTime :
      0;

    // Calcular qualidade da repetição
    const quality = this.calculateRepQuality(duration);

    const rep: Repetition = {
      startTime: this.state.phaseStartTime,
      endTime: now,
      duration,
      quality,
      endPhase: this.state.currentPhase || MovementPhase.HOLD,
      completed: true,
    };

    this.state.count++;
    this.state.repetitions.push(rep);
    this.state.currentRepCompleted = false;
    this.state.phaseStartTime = now;

    this.notifyRepCountChanged(this.state.count);
    this.notifyRepCompleted(rep);

    return rep;
  }

  /**
   * Calcular qualidade de uma repetição
   */
  private calculateRepQuality(duration: number): ExecutionQuality {
    const { minDuration, maxDuration } = this.state.thresholds;

    // Verificar se duração está dentro do esperado
    if (duration >= minDuration && duration <= maxDuration) {
      return ExecutionQuality.PERFECT;
    } else if (duration < minDuration) {
      // Muito rápido
      return ExecutionQuality.POOR;
    } else if (duration > maxDuration) {
      // Muito lento
      return ExecutionQuality.FAIR;
    } else {
      return ExecutionQuality.GOOD;
    }
  }

  /**
   * Calcular pontuação média das repetições
   */
  getAverageQualityScore(): number {
    if (this.state.repetitions.length === 0) return 0;

    const scores = this.state.repetitions.map(rep => {
      switch (rep.quality) {
        case ExecutionQuality.PERFECT:
          return 100;
        case ExecutionQuality.GOOD:
          return 85;
        case ExecutionQuality.FAIR:
          return 65;
        case ExecutionQuality.POOR:
          return 40;
        case ExecutionQuality.VERY_POOR:
          return 20;
        default:
          return 50;
      }
    });

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  /**
   * Registrar callbacks
   */
  on(event: string, callback: Function): void {
    switch (event) {
      case 'repCountChanged':
        this.callbacks.onRepCountChanged = callback as any;
        break;
      case 'repCompleted':
        this.callbacks.onRepCompleted = callback as any;
        break;
      case 'phaseChanged':
        this.callbacks.onPhaseChanged = callback as any;
        break;
    }
  }

  /**
   * Notificar mudança de contagem
   */
  private notifyRepCountChanged(count: number): void {
    if (this.callbacks.onRepCountChanged) {
      this.callbacks.onRepCountChanged(count);
    }
  }

  /**
   * Notificar repetição completada
   */
  private notifyRepCompleted(rep: Repetition): void {
    if (this.callbacks.onRepCompleted) {
      this.callbacks.onRepCompleted(rep);
    }
  }

  /**
   * Notificar mudança de fase
   */
  private notifyPhaseChange(phase: MovementPhase): void {
    if (this.callbacks.onPhaseChanged) {
      this.callbacks.onPhaseChanged(phase);
    }
  }

  /**
   * Criar instância com configuração customizada
   */
  static create(
    exerciseType: ExerciseType,
    config?: Partial<RepetitionThresholds>
  ): RepetitionCounter {
    const counter = new RepetitionCounter(exerciseType);
    if (config) {
      counter.setThresholds(config);
    }
    return counter;
  }
}

export type {
  CountingMethod,
};
