import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { type Exercise } from "@/hooks/useExercises";
import { WgerImportModal } from "../modals/WgerImportModal";

interface ExerciseLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectExercise: (exercise: Exercise) => void;
  /** List of exercise IDs already added to the session */
  addedExerciseIds?: string[];
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  open,
  onOpenChange,
  onSelectExercise,
  addedExerciseIds = [],
}) => {
  // Local state to track added exercises during this modal session
  const [localAddedIds, setLocalAddedIds] = useState<string[]>([]);
  const [isWgerOpen, setIsWgerOpen] = useState(false);

  useEffect(() => {
    const handleOpenWger = () => setIsWgerOpen(true);
    window.addEventListener("open-wger-import", handleOpenWger);
    return () => window.removeEventListener("open-wger-import", handleOpenWger);
  }, []);

  // Combine prop IDs with locally added IDs
  const allAddedIds = [...new Set([...addedExerciseIds, ...localAddedIds])];

  const handleSelectExercise = (exercise: Exercise) => {
    onSelectExercise(exercise);
    setLocalAddedIds((prev) => [...prev, exercise.id]);
    // Don't close modal - allow multiple selections
  };

  const handleWgerImport = (enrichedData: any) => {
    const fakeId = `ex-${Date.now()}`;
    const newEx = {
      id: fakeId,
      name: enrichedData.name,
      completed: false,
      type: "exercise",
      // Include other data as needed for your application
    } as any;
    handleSelectExercise(newEx);
  };

  // Reset local state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLocalAddedIds([]);
    }
    onOpenChange(open);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 !-translate-x-1/2 !-translate-y-1/2 w-[96vw] max-w-none h-[92vh] flex flex-col shadow-2xl rounded-2xl border border-border/40 bg-background p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              Biblioteca de Exercícios
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <ExerciseLibrary
              onSelectExercise={handleSelectExercise}
              onEditExercise={() => {}}
              selectionMode={true}
              addedExerciseIds={allAddedIds}
            />
          </div>
        </DialogContent>
      </Dialog>
      <WgerImportModal open={isWgerOpen} onOpenChange={setIsWgerOpen} onImport={handleWgerImport} />
    </>
  );
};
