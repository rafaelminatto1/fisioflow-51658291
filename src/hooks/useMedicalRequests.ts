
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContextProvider';

export interface MedicalRequestFile {
    id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
}

export interface MedicalRequest {
    id: string;
    patient_id: string;
    doctor_name: string | null;
    request_date: string | null;
    notes: string | null;
    created_at: string;
    files?: MedicalRequestFile[];
}

export const useMedicalRequests = (patientId?: string | null) => {
    const [requests, setRequests] = useState<MedicalRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;

    const fetchRequests = useCallback(async () => {
        if (!patientId || !organizationId) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('medical_requests')
                .select(`
          *,
          files:medical_request_files(*)
        `)
                .eq('patient_id', patientId)
                .eq('organization_id', organizationId)
                .order('request_date', { ascending: false });

            if (error) throw error;
            setRequests(data as MedicalRequest[]);
        } finally {
            setIsLoading(false);
        }
    }, [patientId, organizationId]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const addRequest = async (
        data: { doctorName: string; date: Date; notes: string },
        files: File[]
    ) => {
        if (!patientId || !organizationId) return false;

        try {
            // 1. Create request
            const { data: requestData, error: requestError } = await supabase
                .from('medical_requests')
                .insert({
                    patient_id: patientId,
                    organization_id: organizationId,
                    doctor_name: data.doctorName,
                    request_date: data.date.toISOString(),
                    notes: data.notes
                })
                .select()
                .single();

            if (requestError) throw requestError;

            // 2. Upload files
            if (files.length > 0) {
                const fileUploads = files.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${requestData.id}/${crypto.randomUUID()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('medical-requests')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    return {
                        medical_request_id: requestData.id,
                        organization_id: organizationId,
                        file_path: fileName,
                        file_name: file.name,
                        file_type: file.type,
                        file_size: file.size
                    };
                });

                const uploadedFilesData = await Promise.all(fileUploads);

                const { error: filesDbError } = await supabase
                    .from('medical_request_files')
                    .insert(uploadedFilesData);

                if (filesDbError) throw filesDbError;
            }

            toast.success('Pedido médico salvo com sucesso');
            fetchRequests();
            return true;
        } catch (error) {
            console.error('Error adding medical request:', error);
            toast.error('Erro ao salvar pedido médico');
            return false;
        }
    };

    const deleteRequest = async (requestId: string) => {
        if (!organizationId) return;

        try {
            // Get files to delete from storage
            const { data: files } = await supabase
                .from('medical_request_files')
                .select('file_path')
                .eq('medical_request_id', requestId);

            if (files && files.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from('medical-requests')
                    .remove(files.map(f => f.file_path));

                if (storageError) console.error('Error deleting files from storage', storageError);
            }

            const { error } = await supabase
                .from('medical_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;

            toast.success('Pedido removido');
            fetchRequests();
        } catch (error) {
            console.error('Error deleting request:', error);
            toast.error('Erro ao remover pedido');
        }
    }

    return { requests, isLoading, addRequest, deleteRequest };
};
