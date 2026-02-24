import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { ExerciseSession } from '@/types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';

const COLLECTION_NAME = 'exercise_sessions';

export const SessionService = {
  /**
   * Salva uma sessão de exercício completada no Firestore
   */
  async saveSession(session: ExerciseSession) {
    try {
      // Preparar dados para salvar (remover funções ou dados não serializáveis se houver)
      const sessionData = {
        patientId: session.patientId,
        exerciseId: session.exerciseId,
        exerciseType: session.exerciseType,
        startTime: session.startTime,
        endTime: session.endTime || new Date(),
        duration: session.duration,
        repetitions: session.repetitions,
        completed: session.completed,
        
        // Métricas Agregadas
        metrics: {
          formScore: session.metrics.formScore,
          stabilityScore: session.metrics.stabilityScore,
          rangeOfMotion: session.metrics.rangeOfMotion,
          romPercentage: session.metrics.romPercentage,
          avgFps: session.metrics.avgFps
        },

        // Lista simplificada de problemas detectados (apenas tipos e contagem)
        postureIssuesSummary: session.postureIssues.reduce((acc, issue) => {
          acc[issue.type] = (acc[issue.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), sessionData);
      
      logger.info('Sessão de exercício salva com sucesso', { sessionId: docRef.id }, 'SessionService');
      return docRef.id;
    } catch (error) {
      logger.error('Erro ao salvar sessão de exercício', error, 'SessionService');
      throw error;
    }
  },

  /**
   * Busca o histórico de sessões de um paciente para um exercício específico
   */
  async getPatientHistory(patientId: string, exerciseId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('patientId', '==', patientId),
        where('exerciseId', '==', exerciseId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Erro ao buscar histórico do paciente', error, 'SessionService');
      return [];
    }
  },

  /**
   * Busca estatísticas gerais do paciente
   */
  async getPatientStats(patientId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => doc.data());

      if (sessions.length === 0) return null;

      const totalSessions = sessions.length;
      const totalReps = sessions.reduce((acc, s) => acc + (s.repetitions || 0), 0);
      const avgScore = sessions.reduce((acc, s) => acc + (s.metrics?.formScore || 0), 0) / totalSessions;

      return {
        totalSessions,
        totalReps,
        avgScore: Math.round(avgScore),
        lastSession: sessions[0].createdAt
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas do paciente', error, 'SessionService');
      return null;
    }
  }
};
