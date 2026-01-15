import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PrescribedExercise {
    id: string;
    patient_id: string;
    exercise_id: string;
    frequency?: string;
    sets: number;
    reps: number;
    duration_seconds?: number;
    notes?: string;
    is_active: boolean;
    exercise?: {
        name: string;
    };
}

export const usePrescribedExercises = (patientId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: prescriptions, isLoading } = useQuery({
        queryKey: ['prescribed-exercises', patientId],
        queryFn: async () => {
            if (!patientId) return [];
            const { data, error } = await supabase
                .from('prescribed_exercises')
                .select('*, exercise:exercises(name)')
                .eq('patient_id', patientId)
                .eq('is_active', true);

            if (error) throw error;
            return data as PrescribedExercise[];
        },
        enabled: !!patientId
    });

    const addPrescription = useMutation({
        mutationFn: async (newPrescription: Omit<PrescribedExercise, 'id' | 'patient_id' | 'is_active'>) => {
            const { data, error } = await supabase
                .from('prescribed_exercises')
                .insert({
                    ...newPrescription,
                    patient_id: patientId,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prescribed-exercises', patientId] });
            toast({ title: 'Exercício prescrito', description: 'O exercício foi adicionado ao Home Care.' });
        }
    });

    const updatePrescription = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<PrescribedExercise> & { id: string }) => {
            const { data, error } = await supabase
                .from('prescribed_exercises')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prescribed-exercises', patientId] });
        }
    });

    const removePrescription = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('prescribed_exercises')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prescribed-exercises', patientId] });
            toast({ title: 'Prescrição removida', description: 'O exercício foi removido do Home Care.' });
        }
    });

    return {
        prescriptions,
        isLoading,
        addPrescription,
        updatePrescription,
        removePrescription
    };
};
