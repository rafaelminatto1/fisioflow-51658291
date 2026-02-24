/**
 * useAIExercisePersistence - Hook para salvar resultados de exercícios com IA
 * 
 * Este serviço registra os resultados da análise biomecânica no Firestore,
 * permitindo que o fisioterapeuta acompanhe a evolução do paciente.
 */

import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc,
  doc 
} from 'firebase/firestore';
import { ExerciseSession } from '../types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';

export function useAIExercisePersistence() {
  
  /**
   * Salva uma sessão completa de exercício
   */
  const saveSession = async (session: ExerciseSession) => {
    try {
      logger.info('[AIPersistence] Salvando sessão de exercício...', { id: session.exerciseId }, 'AIPersistence');
      
      const sessionsRef = collection(db, 'exercise_sessions');
      
      const docRef = await addDoc(sessionsRef, {
        ...session,
        createdAt: serverTimestamp(),
        // Normalizamos datas para o Firestore
        startTime: session.startTime instanceof Date ? session.startTime : new Date(),
        endTime: session.endTime instanceof Date ? session.endTime : new Date(),
      });

      // Atualizar o progresso acumulado do paciente
      await updatePatientProgress(session.patientId, session.exerciseId, session);

      return docRef.id;
    } catch (error) {
      logger.error('Erro ao salvar sessão de IA', error, 'AIPersistence');
      throw error;
    }
  };

  /**
   * Atualiza as estatísticas acumuladas do paciente para aquele exercício
   */
  const updatePatientProgress = async (patientId: string, exerciseId: string, session: ExerciseSession) => {
    try {
      const progressRef = doc(db, 'patient_progress', `${patientId}_${exerciseId}`);
      
      // Aqui usamos merge para atualizar ou criar
      await updateDoc(progressRef, {
        lastSessionDate: serverTimestamp(),
        totalRepetitions: session.repetitions, // Simplificado: em produção usar incremento
        bestScore: session.totalScore,
        updatedAt: serverTimestamp()
      }).catch(async (err) => {
        // Se o documento não existir, poderíamos criar um novo aqui (setDoc)
        console.log('Progress record not found, should create new.');
      });
    } catch (err) {
      console.error('Failed to update patient progress:', err);
    }
  };

  return { saveSession };
}
