import { useOutletContext } from "react-router-dom";
import type { Exercise } from "@/hooks/useExercises";
import type { Patient } from "@/types";

export interface ExerciseAIPatientSummary {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  mainCondition: string;
  medicalHistory: string;
  age: number;
}

export interface ExercisesRouteContextValue {
  exercises: Exercise[];
  exercisesWithoutVideo: Exercise[];
  isLoadingSummary: boolean;
  selectedPatientId: string;
  patients: Patient[];
  loadingPatients: boolean;
  exerciseAIPatient?: ExerciseAIPatientSummary;
  onEditExercise: (exercise: Exercise) => void;
  onPatientChange: (patientId: string) => void;
  onUploadClick: () => void;
}

export function useExercisesRouteContext() {
  return useOutletContext<ExercisesRouteContextValue>();
}
