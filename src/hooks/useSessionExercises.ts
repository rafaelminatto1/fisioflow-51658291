import { useQuery } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, orderBy, limit, getDocs } from '@/integrations/firebase/app';

import { db } from '@/integrations/firebase/app';
import { SessionExercise } from '@/components/evolution/SessionExercisesPanel';

export const useSessionExercises = (patientId: string) => {
    // Fetch the most recent treatment session to get previous exercises
    const lastSessionQuery = useQuery({
        queryKey: ['last-treatment-session', patientId],
        queryFn: async () => {
            if (!patientId) return null;

            const q = firestoreQuery(
                collection(db, 'treatment_sessions'),
                where('patient_id', '==', patientId),
                orderBy('session_date', 'desc'),
                limit(1)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        },
        enabled: !!patientId
    });

    // Suggest changes to exercises based on current session data
    // This is a client-side logic for now, could be moved to AI later
    const suggestExerciseChanges = (
        exercises: SessionExercise[],
        painLevel: number,
        observations: string
    ): SessionExercise[] => {
        return exercises.map(ex => {
            const suggestedSets = ex.sets;
            let suggestedReps = ex.repetitions;
            let suggestionMsg = '';

            // Simple heuristic: if pain is low, suggest increasing volume or load
            if (painLevel <= 2 && !observations.toLowerCase().includes('dor') && !observations.toLowerCase().includes('difícil')) {
                suggestedReps = Math.min(ex.repetitions + 2, 20);
                suggestionMsg = 'Sugerido aumentar repetições (Paciente estável)';
            } else if (painLevel >= 7) {
                suggestedReps = Math.max(ex.repetitions - 2, 5);
                suggestionMsg = 'Sugerido reduzir volume devido à dor';
            }

            if (suggestionMsg) {
                return {
                    ...ex,
                    repetitions: suggestedReps,
                    observations: ex.observations ? `${ex.observations} | ${suggestionMsg}` : suggestionMsg
                };
            }
            return ex;
        });
    };

    return {
        lastSession: lastSessionQuery.data,
        isLoadingLastSession: lastSessionQuery.isLoading,
        suggestExerciseChanges
    };
};
