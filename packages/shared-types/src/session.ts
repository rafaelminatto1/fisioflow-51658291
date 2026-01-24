export type ExerciseSessionStatus = 'scheduled' | 'completed' | 'skipped' | 'cancelled';

export interface ExerciseSession {
  id: string;
  patientId: string;
  prescriptionId: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: ExerciseSessionStatus;
  feedback?: ExerciseFeedback;
  videoUrl?: string;
  duration?: number;
  createdAt: Date;
}

export interface ExerciseFeedback {
  pain: number;
  difficulty: number;
  notes?: string;
}
