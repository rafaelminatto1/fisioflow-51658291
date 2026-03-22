import { patientApi } from '@/lib/api';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';

function buildPlan(exercises: any[]) {
  if (!exercises.length) return null;

  return {
    id: exercises[0]?.plan?.id || 'plan',
    name: exercises[0]?.plan?.name || 'Plano atual',
    description: exercises[0]?.plan?.description || '',
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId || exercise.exercise_id,
      name: exercise.exercise?.name || 'Exercício',
      description: exercise.exercise?.description,
      completed: exercise.completed,
      completed_at: exercise.completedAt,
      sets: exercise.sets,
      reps: exercise.reps,
    })),
  };
}

export async function getActiveExercisePlan(_userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('api_get_exercise_plan');
    const exercises = await patientApi.getExercises();
    perf.end('api_get_exercise_plan', true);
    return buildPlan(exercises);
  }, 'getActiveExercisePlan');
}

export function subscribeToExercisePlan(
  userId: string,
  callback: (plan: any | null) => void,
): () => void {
  const load = async () => {
    const result = await getActiveExercisePlan(userId);
    callback(result.success ? result.data ?? null : null);
  };

  load();
  const interval = setInterval(load, 30000);
  return () => clearInterval(interval);
}

export async function toggleExercise(
  _userId: string,
  _planId: string,
  exerciseId: string,
  completed: boolean,
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('api_toggle_exercise');
    await patientApi.completeExercise(exerciseId, { completed });
    perf.end('api_toggle_exercise', true);
    log.info('EXERCISE', 'Exercise toggled', { exerciseId, completed });
  }, 'toggleExercise');
}

export interface ExerciseFeedback {
  exerciseId: string;
  planId: string;
  difficulty: number;
  painLevel: number;
  notes?: string;
}

export async function submitExerciseFeedback(
  _userId: string,
  feedback: ExerciseFeedback,
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('api_submit_feedback');
    await patientApi.completeExercise(feedback.exerciseId, {
      completed: true,
      difficulty: feedback.difficulty,
      painLevel: feedback.painLevel,
      notes: feedback.notes,
    });
    perf.end('api_submit_feedback', true);
    log.info('EXERCISE', 'Feedback submitted', { exerciseId: feedback.exerciseId });
  }, 'submitExerciseFeedback');
}

export async function getExerciseStats(_userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('api_get_exercise_stats');
    const exercises = await patientApi.getExercises();
    const completed = exercises.filter((exercise: any) => exercise.completed).length;
    const total = exercises.length;
    perf.end('api_get_exercise_stats', true);

    return {
      total,
      completed,
      remaining: total - completed,
      completionRate: total > 0 ? completed / total : 0,
    };
  }, 'getExerciseStats');
}
