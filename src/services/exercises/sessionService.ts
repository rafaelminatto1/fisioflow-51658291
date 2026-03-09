import { exerciseSessionsApi } from '@/lib/api/workers-client';
import { ExerciseSession } from '@/types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const SessionService = {
  async saveSession(session: ExerciseSession) {
    try {
      const result = await exerciseSessionsApi.create({
        patient_id: session.patientId,
        exercise_id: session.exerciseId,
        exercise_type: session.exerciseType,
        start_time: session.startTime instanceof Date ? session.startTime.toISOString() : String(session.startTime),
        end_time: session.endTime ? (session.endTime instanceof Date ? session.endTime.toISOString() : String(session.endTime)) : undefined,
        duration: session.duration,
        repetitions: session.repetitions,
        completed: session.completed,
        metrics: {
          formScore: session.metrics.formScore,
          stabilityScore: session.metrics.stabilityScore,
          rangeOfMotion: session.metrics.rangeOfMotion,
          romPercentage: session.metrics.romPercentage,
          avgFps: session.metrics.avgFps,
        },
        posture_issues_summary: session.postureIssues.reduce((acc, issue) => {
          acc[issue.type] = (acc[issue.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });
      logger.info('Sessão de exercício salva', { sessionId: result.data?.id }, 'SessionService');
      return result.data?.id;
    } catch (error) {
      logger.error('Erro ao salvar sessão de exercício', error, 'SessionService');
      throw error;
    }
  },

  async getPatientHistory(patientId: string, exerciseId: string) {
    try {
      const result = await exerciseSessionsApi.list({ patientId, exerciseId, limit: 20 });
      return result.data ?? [];
    } catch (error) {
      logger.error('Erro ao buscar histórico do paciente', error, 'SessionService');
      return [];
    }
  },

  async getPatientStats(patientId: string) {
    try {
      const result = await exerciseSessionsApi.stats(patientId);
      const s = result.data;
      if (!s || Number(s.total_sessions) === 0) return null;
      return {
        totalSessions: Number(s.total_sessions),
        totalReps: Number(s.total_reps),
        avgScore: Math.round(Number(s.avg_score)),
        lastSession: s.last_session,
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas do paciente', error, 'SessionService');
      return null;
    }
  },
};
