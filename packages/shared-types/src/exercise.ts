export type ExerciseCategory =
  | 'lower_body'
  | 'upper_body'
  | 'core'
  | 'cardio'
  | 'flexibility'
  | 'balance'
  | 'posture';

export type BodyPart =
  | 'neck'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hand'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'foot'
  | 'spine'
  | 'chest'
  | 'back';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  professionalId: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  bodyParts: BodyPart[];
  difficulty: ExerciseDifficulty;
  equipment?: string[];
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExercisePrescription {
  id: string;
  treatmentPlanId: string;
  patientId: string;
  exerciseId: string;
  name: string;
  description?: string;
  sets: number;
  reps: number;
  duration?: number;
  restTime: number;
  frequency: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions?: string;
  order: number;
  isActive: boolean;
}
