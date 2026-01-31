import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, addDoc, updateDoc, doc } from '@/integrations/firebase/app';

import { db } from '@/integrations/firebase/app';
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

            const q = firestoreQuery(
                collection(db, 'prescribed_exercises'),
                where('patient_id', '==', patientId),
                where('is_active', '==', true)
            );

            const snapshot = await getDocs(q);

            // Fetch exercises separately to join the data
            const prescriptions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as PrescribedExercise[];

            // Get unique exercise IDs
            const exerciseIds = [...new Set(prescriptions.map(p => p.exercise_id))];

            // Fetch exercise details
            if (exerciseIds.length > 0) {
                const exercisesQuery = firestoreQuery(
                    collection(db, 'exercises')
                );
                const exercisesSnapshot = await getDocs(exercisesQuery);
                const exercises = exercisesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const exerciseMap = new Map(exercises.map(e => [e.id, e]));

                // Join exercise data
                return prescriptions.map(p => ({
                    ...p,
                    exercise: exerciseMap.get(p.exercise_id)
                }));
            }

            return prescriptions;
        },
        enabled: !!patientId
    });

    const addPrescription = useMutation({
        mutationFn: async (newPrescription: Omit<PrescribedExercise, 'id' | 'patient_id' | 'is_active'>) => {
            const data = {
                ...newPrescription,
                patient_id: patientId,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const docRef = await addDoc(collection(db, 'prescribed_exercises'), data);

            return {
                id: docRef.id,
                ...data
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prescribed-exercises', patientId] });
            toast({ title: 'Exercício prescrito', description: 'O exercício foi adicionado ao Home Care.' });
        }
    });

    const updatePrescription = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<PrescribedExercise> & { id: string }) => {
            const docRef = doc(db, 'prescribed_exercises', id);
            const data = {
                ...updates,
                updated_at: new Date().toISOString(),
            };

            await updateDoc(docRef, data);

            return {
                id,
                ...data
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prescribed-exercises', patientId] });
        }
    });

    const removePrescription = useMutation({
        mutationFn: async (id: string) => {
            const docRef = doc(db, 'prescribed_exercises', id);
            const data = {
                is_active: false,
                updated_at: new Date().toISOString(),
            };

            await updateDoc(docRef, data);
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
