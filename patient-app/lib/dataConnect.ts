/**
 * Firebase DataConnect Configuration
 *
 * Configuração para Firebase DataConnect - uma camada de abstração
 * sobre Firestore que fornece queries otimizadas e type-safe.
 *
 * @module lib/dataConnect
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getConnectors, ConnectorConfig } from 'firebase/data-connect';

/**
 * Configuração do DataConnect
 *
 * NOTA: Para usar o DataConnect, você precisa:
 * 1. Instalar o pacote: npm install firebase firebase-data-connect
 * 2. Configurar o connector no Firebase Console
 * 3. Gerar os tipos TypeScript com: firebase-data-connect generate
 *
 * Documentação: https://firebase.google.com/docs/data-connect
 */

// Reutilizar a configuração do Firebase existente
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Configuração do Connector para DataConnect
 *
 * Esta configuração será usada quando o DataConnect estiver plenamente implementado.
 * Atualmente, o app usa Firestore diretamente como fallback.
 */
export const dataConnectConfig: ConnectorConfig = {
  connector: 'fisioflow-patient',
  location: 'us-central1', // ou a região do seu projeto
  service: 'firestore-default', // ou o nome do seu serviço
};

/**
 * Inicializa o DataConnect
 *
 * @returns Instância do DataConnect ou null se não disponível
 */
export function initializeDataConnect() {
  try {
    // Verifica se o pacote data-connect está disponível
    const connectors = getConnectors(app);
    return connectors;
  } catch (error) {
    console.warn('Firebase DataConnect not available, using Firestore fallback:', error);
    return null;
  }
}

/**
 * Interface para query do DataConnect
 */
export interface DataConnectQuery<T> {
  execute: (variables?: Record<string, any>) => Promise<T>;
}

/**
 * Interface para mutation do DataConnect
 */
export interface DataConnectMutation<T> {
  execute: (variables: Record<string, any>) => Promise<T>;
}

/**
 * Tipos para as operações do DataConnect
 * Estes tipos seriam gerados automaticamente pelo firebase-data-connect CLI
 */

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  videoUrl?: string;
  imageUrl?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface PatientExercise {
  id: string;
  patientId: string;
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  holdTime?: number;
  restTime?: number;
  notes?: string;
  completed: boolean;
  completedAt?: Date;
  prescribedAt: Date;
  validUntil?: Date;
}

export interface GetPatientExercisesVariables {
  patientId: string;
  includeCompleted?: boolean;
  includeExpired?: boolean;
  limit?: number;
}

export interface GetPatientExercisesResult {
  exercises: PatientExercise[];
}

/**
 * Queries do DataConnect
 *
 * NOTA: Estas funções são stubs que serão implementadas
 * quando o DataConnect estiver configurado no backend.
 */

/**
 * Busca exercícios prescritos ao paciente
 */
export async function getPatientExercises(
  variables: GetPatientExercisesVariables
): Promise<GetPatientExercisesResult> {
  // TODO: Implementar com DataConnect quando disponível
  // Por enquanto, usa Firestore (implementado no hook useDataConnect)
  console.warn('getPatientExercises: DataConnect not implemented, using Firestore fallback');
  return { exercises: [] };
}

/**
 * Marca um exercício como completo
 */
export async function completeExercise(
  variables: { patientExerciseId: string; feedback?: { difficulty: number; pain: number } }
): Promise<{ success: boolean }> {
  // TODO: Implementar com DataConnect quando disponível
  console.warn('completeExercise: DataConnect not implemented');
  return { success: false };
}

/**
 * Atualiza feedback de um exercício
 */
export async function updateExerciseFeedback(
  variables: {
    patientExerciseId: string;
    difficulty: number;
    pain: number;
    notes?: string;
  }
): Promise<{ success: boolean }> {
  // TODO: Implementar com DataConnect quando disponível
  console.warn('updateExerciseFeedback: DataConnect not implemented');
  return { success: false };
}

/**
 * Busca estatísticas do paciente
 */
export async function getPatientStats(variables: { patientId: string }): Promise<{
  totalExercises: number;
  completedExercises: number;
  currentStreak: number;
  totalSessions: number;
}> {
  // TODO: Implementar com DataConnect quando disponível
  console.warn('getPatientStats: DataConnect not implemented');
  return {
    totalExercises: 0,
    completedExercises: 0,
    currentStreak: 0,
    totalSessions: 0,
  };
}

/**
 * Cache local para otimizar queries
 */
class DataConnectCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutos

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const dataConnectCache = new DataConnectCache();

/**
 * Helper para criar cache key
 */
export function createCacheKey(operation: string, variables: Record<string, any>): string {
  return `${operation}:${JSON.stringify(variables)}`;
}

/**
 * Verifica se DataConnect está disponível
 */
export function isDataConnectAvailable(): boolean {
  try {
    return getConnectors(app) !== undefined;
  } catch {
    return false;
  }
}

export default {
  initializeDataConnect,
  getPatientExercises,
  completeExercise,
  updateExerciseFeedback,
  getPatientStats,
  dataConnectCache,
  isDataConnectAvailable,
};
