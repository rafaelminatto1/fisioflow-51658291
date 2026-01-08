import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WearableDataPoint {
    id: string;
    patient_id: string;
    source: string;
    data_type: string;
    value: number;
    unit?: string;
    timestamp: string;
    created_at: string;
}

export const useWearables = (patientId?: string) => {
    const queryClient = useQueryClient();

    const { data: wearableData = [], isLoading, error } = useQuery({
        queryKey: ['wearables', patientId],
        queryFn: async () => {
            if (!patientId) return [];

            const { data, error } = await supabase
                .from('wearable_data')
                .select('*')
                .eq('patient_id', patientId)
                .order('timestamp', { ascending: false });

            if (error) throw error;
            return data as unknown as WearableDataPoint[];
        },
        enabled: !!patientId,
    });

    const addWearableData = useMutation({
        mutationFn: async (newData: Omit<WearableDataPoint, 'id' | 'created_at'>) => {
            // Get current user's org
            const { data: userData } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('user_id', userData.user?.id)
                .single();

            if (!profile?.organization_id) throw new Error('Organization not found');

            const { data, error } = await supabase
                .from('wearable_data')
                .insert([{ ...newData, organization_id: profile.organization_id }])
                .select()
                .single();

            if (error) throw error;
            return data;
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
