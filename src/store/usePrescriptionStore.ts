import { create } from "zustand";
import type { Exercise } from "@/types";

interface PrescriptionState {
  activeExercises: Exercise[];
  addExercise: (exercise: Exercise) => void;
  removeExercise: (id: string) => void;
  reorderExercises: (activeId: string, overId: string) => void;
  clearPrescription: () => void;
}

export const usePrescriptionStore = create<PrescriptionState>((set) => ({
  activeExercises: [],
  addExercise: (exercise) =>
    set((state) => ({
      activeExercises: state.activeExercises.some((ex) => ex.id === exercise.id)
        ? state.activeExercises
        : [...state.activeExercises, exercise],
    })),
  removeExercise: (id) =>
    set((state) => ({
      activeExercises: state.activeExercises.filter((ex) => ex.id !== id),
    })),
  reorderExercises: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.activeExercises.findIndex((ex) => ex.id === activeId);
      const newIndex = state.activeExercises.findIndex((ex) => ex.id === overId);

      const newItems = [...state.activeExercises];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);

      return { activeExercises: newItems };
    }),
  clearPrescription: () => set({ activeExercises: [] }),
}));
