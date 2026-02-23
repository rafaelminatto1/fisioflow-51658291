/**
 * Pose Analytics - Analytics para Exercícios com Pose Detection
 *
 * Integra os eventos de execução de exercícios com o Firebase Analytics
 * existente no projeto.
 */

import { analytics } from '@/lib/analytics/events';
import { ExerciseSession, ExerciseType, Repetition } from '@/types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// EVENTOS DE ANALYTICS
// ============================================================================

/**
 * Eventos customizados para execução de exercícios
 */
export const EXERCISE_EVENTS = {
  SESSION_STARTED: 'exercise_session_started',
  SESSION_PAUSED: 'exercise_session_paused',
  SESSION_RESUMED: 'exercise_session_resumed',
  SESSION_COMPLETED: 'exercise_session_completed',
  SESSION_ABANDONED: 'exercise_session_abandoned',

  REPETITION_COMPLETED: 'exercise_repetition_completed',
  REPETITION_INCOMPLETE: 'exercise_repetition_incomplete',

  FORM_QUALITY_LOGGED: 'exercise_form_quality_logged',
  ROM_MEASURED: 'exercise_rom_measured',

  STABILITY_LOGGED: 'exercise_stability_logged',
  POSTURE_ISSUE_DETECTED: 'exercise_posture_issue_detected',
} as const;

// ============================================================================
// SERVIÇO DE ANALYTICS
// ============================================================================

/**
 * Serviço de analytics para exercícios
 */
export class PoseAnalytics {
  private currentSession: ExerciseSession | null = null;
  private sessionStartTime: number = 0;

  /**
   * Iniciar uma nova sessão de exercício
   */
  startSession(session: ExerciseSession): void {
    this.currentSession = session;
    this.sessionStartTime = Date.now();

    analytics.logEvent(EXERCISE_EVENTS.SESSION_STARTED, {
      exercise_id: session.exerciseId,
      exercise_type: session.exerciseType,
      user_type: 'patient',
      target_repetitions: session.repetitions,
    });

    logger.info('[PoseAnalytics] Sessão iniciada', {
      sessionId: session.id,
      exerciseType: session.exerciseType,
    }, 'PoseAnalytics');
  }

  /**
   * Pausar sessão
   */
  pauseSession(): void {
    if (!this.currentSession) return;

    const duration = Date.now() - this.sessionStartTime;

    analytics.logEvent(EXERCISE_EVENTS.SESSION_PAUSED, {
      exercise_id: this.currentSession.exerciseId,
      duration_seconds: duration / 1000,
    });

    logger.info('[PoseAnalytics] Sessão pausada', {
      sessionId: this.currentSession.id,
      duration: duration / 1000,
    }, 'PoseAnalytics');
  }

  /**
   * Retomar sessão
   */
  resumeSession(): void {
    if (!this.currentSession) return;

    analytics.logEvent(EXERCISE_EVENTS.SESSION_RESUMED, {
      exercise_id: this.currentSession.exerciseId,
      exercise_type: this.currentSession.exerciseType,
    });

    logger.info('[PoseAnalytics] Sessão retomada', {
      sessionId: this.currentSession.id,
    }, 'PoseAnalytics');
  }

  /**
   * Completar sessão de exercício
   */
  completeSession(session: ExerciseSession): void {
    this.currentSession = session;
    const endTime = Date.now();
    const duration = (endTime - this.sessionStartTime) / 1000;

    analytics.logEvent(EXERCISE_EVENTS.SESSION_COMPLETED, {
      exercise_id: session.exerciseId,
      exercise_type: session.exerciseType,
      repetitions: session.repetitions,
      duration_seconds: duration,
      form_score: session.totalScore,
      rom_percentage: session.metrics.romPercentage,
    });

    logger.info('[PoseAnalytics] Sessão completada', {
      sessionId: session.id,
      duration,
      repetitions: session.repetitions,
      score: session.totalScore,
    }, 'PoseAnalytics');
  }

  /**
   * Abandonar sessão (não completou)
   */
  abandonSession(session: ExerciseSession): void {
    this.currentSession = session;
    const endTime = Date.now();
    const duration = (endTime - this.sessionStartTime) / 1000;

    analytics.logEvent(EXERCISE_EVENTS.SESSION_ABANDONED, {
      exercise_id: session.exerciseId,
      exercise_type: session.exerciseType,
      duration_seconds: duration,
      repetitions: session.repetitions,
      abandonment_reason: 'user_aborted',
    });

    logger.info('[PoseAnalytics] Sessão abandonada', {
      sessionId: session.id,
      duration,
    }, 'PoseAnalytics');
  }

  /**
   * Logar repetição completada
   */
  logRepetition(repetition: Repetition, index: number): void {
    analytics.logEvent(EXERCISE_EVENTS.REPETITION_COMPLETED, {
      exercise_id: this.currentSession?.exerciseId,
      repetition_number: index + 1,
      duration_ms: repetition.duration,
      quality: repetition.quality,
      end_phase: repetition.endPhase,
    });
  }

  /**
   * Logar repetição incompleta
   */
  logIncompleteRepetition(): void {
    analytics.logEvent(EXERCISE_EVENTS.REPETITION_INCOMPLETE, {
      exercise_id: this.currentSession?.exerciseId,
      current_repetitions: this.currentSession?.repetitions || 0,
    });
  }

  /**
   * Logar qualidade de forma
   */
  logFormQuality(score: number, details?: Record<string, any>): void {
    analytics.logEvent(EXERCISE_EVENTS.FORM_QUALITY_LOGGED, {
      exercise_id: this.currentSession?.exerciseId,
      form_score: score,
      ...details,
    });
  }

  /**
   * Logar amplitude de movimento (ADM)
   */
  logRomMeasurement(rom: number, joint: string, percentageOfNormal: number): void {
    analytics.logEvent(EXERCISE_EVENTS.ROM_MEASURED, {
      exercise_id: this.currentSession?.exerciseId,
      rom_degrees: rom,
      joint,
      percentage_of_normal: percentageOfNormal,
    });
  }

  /**
   * Logar estabilidade
   */
  logStability(score: number, details?: Record<string, any>): void {
    analytics.logEvent(EXERCISE_EVENTS.STABILITY_LOGGED, {
      exercise_id: this.currentSession?.exerciseId,
      stability_score: score,
      ...details,
    });
  }

  /**
   * Logar problema postural detectado
   */
  logPostureIssue(issueType: string, severity: string, description: string): void {
    analytics.logEvent(EXERCISE_EVENTS.POSTURE_ISSUE_DETECTED, {
      exercise_id: this.currentSession?.exerciseId,
      issue_type: issueType,
      severity,
      description,
    });
  }

  /**
   * Obter métricas de execução do usuário
   * Média de score por exercício nos últimos 7 dias
   */
  async getUserMetrics(exerciseId: string): Promise<{
    avgScore: number;
    bestScore: number;
    totalSessions: number;
  }> {
    // Nota: Isso requer acesso ao Firestore
    // Implementação básica que pode ser expandida
    try {
      // Em produção, buscar dados do Firestore
      // Por enquanto, retornar valores padrão
      return {
        avgScore: 75,
        bestScore: 90,
        totalSessions: 10,
      };
    } catch (error) {
      logger.error('Erro ao buscar métricas do usuário', error, 'PoseAnalytics');
      return {
        avgScore: 75,
        bestScore: 90,
        totalSessions: 0,
      };
    }
  }

  /**
   * Obter streak de exercícios
   */
  async getExerciseStreak(patientId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    // Nota: Requer acesso ao Firestore
    return {
      currentStreak: 3,
      longestStreak: 7,
    };
  }

  /**
   * Limpar sessão atual
   */
  clearSession(): void {
    this.currentSession = null;
    this.sessionStartTime = 0;
  }
}

// ============================================================================
// INSTÂNCIA SINGLETON
// ============================================================================

let analyticsInstance: PoseAnalytics | null = null;

export function getPoseAnalytics(): PoseAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new PoseAnalytics();
  }
  return analyticsInstance;
}

/**
 * Criar nova instância (para testes)
 */
export function createPoseAnalyticsInstance(): PoseAnalytics {
  return new PoseAnalytics();
}

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA (SINGLETON)
// ============================================================================

/**
 * Logar início de exercício
 */
export function logExerciseStarted(
  exerciseId: string,
  exerciseType: ExerciseType,
  userType: string = 'patient'
): void {
  const session: any = {
    id: `temp_${Date.now()}`,
    exerciseId,
    exerciseType,
    repetitions: 0,
    metrics: { romPercentage: 0 }
  };
  getPoseAnalytics().startSession(session);
}

/**
 * Logar conclusão de exercício
 */
export function logExerciseCompleted(
  exerciseId: string,
  repetitions: number,
  score: number,
  duration: number
): void {
  const session: any = {
    exerciseId,
    repetitions,
    totalScore: score,
    metrics: { romPercentage: 0 }
  };
  getPoseAnalytics().completeSession(session);
}

/**
 * Logar repetição completada
 */
export function logRepetitionCompleted(
  exerciseId: string,
  repNumber: number,
  quality: any
): void {
  const rep: any = {
    duration: 0,
    quality,
    endPhase: 'completed'
  };
  getPoseAnalytics().logRepetition(rep, repNumber - 1);
}

