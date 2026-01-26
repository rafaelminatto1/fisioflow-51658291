/**
 * useWearables - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - wearable_data -> wearable_data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getFirebaseDb, getFirebaseAuth } from '@/integrations/firebase/app';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    doc
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

const db = getFirebaseDb();

export interface WearableDataPoint {
    id: string;
    patient_id: string;
    source: string;
    data_type: string;
    value: number;
    unit?: string;
    timestamp: string;
    created_at: string;
    organization_id?: string;
}

// Helper to convert doc
const convertDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

export const useWearables = (patientId?: string) => {
    const queryClient = useQueryClient();
    const { profile } = useAuth(); // We can get organization_id from context

    const { data: wearableData = [], isLoading, error } = useQuery({
        queryKey: ['wearables', patientId],
        queryFn: async () => {
            if (!patientId) return [];

            const q = query(
                collection(db, 'wearable_data'),
                where('patient_id', '==', patientId),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(convertDoc) as WearableDataPoint[];
        },
        enabled: !!patientId,
    });

    const addWearableData = useMutation({
        mutationFn: async (newData: Omit<WearableDataPoint, 'id' | 'created_at'>) => {
            if (!profile?.organization_id) {
                // Try to fallback if profile not loaded but Auth user exists? 
                // Context should handle profile loading.
                throw new Error('Organization not found');
            }

            const docRef = await addDoc(collection(db, 'wearable_data'), {
                ...newData,
                organization_id: profile.organization_id,
                created_at: new Date().toISOString()
            });

            const newDoc = await getDoc(docRef);
            return convertDoc(newDoc);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wearables', patientId] });
            toast.success('Dado adicionado com sucesso');
        },
        onError: (error: Error) => {
            toast.error('Erro ao adicionar dado: ' + error.message);
        },
    });

    return {
        wearableData,
        isLoading,
        error,
        addWearableData: addWearableData.mutate,
        isAdding: addWearableData.isPending,
    };
};
