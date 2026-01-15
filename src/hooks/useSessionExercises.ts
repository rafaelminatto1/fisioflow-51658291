import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SessionExercise } from '@/components/evolution/SessionExercisesPanel';

export const useSessionExercises = (patientId: string) => {
    const queryClient = useQueryClient();

    // Fetch the most recent treatment session to get previous exercises
    const lastSessionQuery = useQuery({
        queryKey: ['last-treatment-session', patientId],
        queryFn: async () => {
            if (!patientId) return null;

            const { data, error } = await supabase
                .from('treatment_sessions')
                .select('*')
                .eq('patient_id', patientId)
                .order('session_date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
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
            let suggestedSets = ex.sets;
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
