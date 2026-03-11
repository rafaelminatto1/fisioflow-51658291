import { patientApi } from './api';
import { log } from '@/lib/logger';

interface ConnectorConfig {
  connector: string;
  location: string;
  service: string;
}

export const dataConnectConfig: ConnectorConfig = {
  connector: 'patient-api',
  location: 'cloudflare',
  service: 'workers-patient-portal',
};

export function initializeDataConnect() {
  return null;
}

export interface DataConnectQuery<T> {
  execute: (variables?: Record<string, any>) => Promise<T>;
}

export interface DataConnectMutation<T> {
  execute: (variables: Record<string, any>) => Promise<T>;
}

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

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeExercise(row: any): PatientExercise {
  return {
    id: String(row.id ?? ''),
    patientId: String(row.patient_id ?? row.patientId ?? ''),
    exerciseId: String(row.exercise_id ?? row.exerciseId ?? row.id ?? ''),
    exercise: {
      id: String(row.exercise_id ?? row.exerciseId ?? row.id ?? ''),
      name: row.name ?? row.exercise_name ?? 'Exercicio',
      description: row.description ?? undefined,
      videoUrl: row.video_url ?? row.videoUrl ?? undefined,
      imageUrl: row.image_url ?? row.imageUrl ?? undefined,
      category: row.category ?? undefined,
      difficulty: row.difficulty ?? undefined,
    },
    sets: Number(row.sets ?? row.series ?? 0),
    reps: Number(row.reps ?? row.repetitions ?? 0),
    holdTime: row.hold_time ? Number(row.hold_time) : undefined,
    restTime: row.rest_time ? Number(row.rest_time) : undefined,
    notes: row.notes ?? undefined,
    completed: row.completed === true,
    completedAt: parseDate(row.completed_at ?? row.completedAt),
    prescribedAt: parseDate(row.assigned_at ?? row.prescribed_at ?? row.created_at) ?? new Date(),
    validUntil: parseDate(row.valid_until ?? row.expires_at),
  };
}

export async function getPatientExercises(
  variables: GetPatientExercisesVariables,
): Promise<GetPatientExercisesResult> {
  const exercises = await patientApi.getExercises();
  const normalized = exercises.map(normalizeExercise);

  return {
    exercises: normalized
      .filter((exercise) => variables.includeCompleted !== false || !exercise.completed)
      .slice(0, variables.limit ?? normalized.length),
  };
}

export async function completeExercise(
  variables: { patientExerciseId: string; feedback?: { difficulty: number; pain: number } },
): Promise<{ success: boolean }> {
  try {
    await patientApi.completeExercise(variables.patientExerciseId, {
      completed: true,
      ...(variables.feedback ?? {}),
    });

    return { success: true };
  } catch (error) {
    log.error('completeExercise: patient portal request failed', error);
    return { success: false };
  }
}

export async function updateExerciseFeedback(
  variables: {
    patientExerciseId: string;
    difficulty: number;
    pain: number;
    notes?: string;
  },
): Promise<{ success: boolean }> {
  try {
    await patientApi.completeExercise(variables.patientExerciseId, {
      difficulty: variables.difficulty,
      pain: variables.pain,
      notes: variables.notes,
    });

    return { success: true };
  } catch (error) {
    log.error('updateExerciseFeedback: patient portal request failed', error);
    return { success: false };
  }
}

export async function getPatientStats(_variables: { patientId: string }): Promise<{
  totalExercises: number;
  completedExercises: number;
  currentStreak: number;
  totalSessions: number;
}> {
  const [stats, exercises] = await Promise.all([
    patientApi.getStats(),
    patientApi.getExercises().catch(() => []),
  ]);

  const completedExercises = exercises.filter((exercise: any) => exercise.completed === true).length;

  return {
    totalExercises: Number(stats.totalExercises ?? exercises.length ?? 0),
    completedExercises,
    currentStreak: 0,
    totalSessions: Number(stats.totalAppointments ?? 0),
  };
}

class DataConnectCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000;

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

export default {
  dataConnectConfig,
  initializeDataConnect,
  getPatientExercises,
  completeExercise,
  updateExerciseFeedback,
  getPatientStats,
  dataConnectCache,
};
