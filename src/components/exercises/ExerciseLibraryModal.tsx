import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ExerciseLibrary } from './ExerciseLibrary';
import { type Exercise } from '@/hooks/useExercises';

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

    // Combine prop IDs with locally added IDs
    const allAddedIds = [...new Set([...addedExerciseIds, ...localAddedIds])];

    const handleSelectExercise = (exercise: Exercise) => {
        onSelectExercise(exercise);
        setLocalAddedIds(prev => [...prev, exercise.id]);
        // Don't close modal - allow multiple selections
    };

    // Reset local state when modal closes
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setLocalAddedIds([]);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Biblioteca de Exercícios</DialogTitle>
                </DialogHeader>
                <ExerciseLibrary
                    onSelectExercise={handleSelectExercise}
                    onEditExercise={() => { }} // Not needed in this context
                    selectionMode={true}
                    addedExerciseIds={allAddedIds}
                />
            </DialogContent>
        </Dialog>
    );
};
