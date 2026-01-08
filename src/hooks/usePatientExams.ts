
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContextProvider';

export interface ExamFile {
    id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
}

export interface PatientExam {
    id: string;
    patient_id: string;
    title: string;
    exam_date: string | null;
    exam_type: string | null;
    description: string | null;
    created_at: string;
    files?: ExamFile[];
}

export const usePatientExams = (patientId?: string | null) => {
    const [exams, setExams] = useState<PatientExam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;

    const fetchExams = async () => {
        if (!patientId || !organizationId) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('patient_exams')
                .select(`
          *,
          files:patient_exam_files(*)
        `)
                .eq('patient_id', patientId)
                .eq('organization_id', organizationId)
                .order('exam_date', { ascending: false });

            if (error) throw error;
            setExams(data as PatientExam[]);
        } catch (error: any) {
            console.error('Error fetching exams:', error);
            // toast.error('Erro ao carregar exames');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, [patientId, organizationId]);

    const addExam = async (
        data: { title: string; date: Date; type: string; description: string },
        files: File[]
    ) => {
        if (!patientId || !organizationId) return false;

        try {
            // 1. Create exam
            const { data: examData, error: examError } = await supabase
                .from('patient_exams')
                .insert({
                    patient_id: patientId,
                    organization_id: organizationId,
                    title: data.title,
                    exam_date: data.date.toISOString(),
                    exam_type: data.type,
                    description: data.description
                })
                .select()
                .single();

            if (examError) throw examError;

            // 2. Upload files
            if (files.length > 0) {
                const fileUploads = files.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${examData.id}/${crypto.randomUUID()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('patient-exams')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    return {
                        exam_id: examData.id,
                        organization_id: organizationId,
                        file_path: fileName,
                        file_name: file.name,
                        file_type: file.type,
                        file_size: file.size
                    };
                });

                const uploadedFilesData = await Promise.all(fileUploads);

                const { error: filesDbError } = await supabase
                    .from('patient_exam_files')
                    .insert(uploadedFilesData);

                if (filesDbError) throw filesDbError;
            }

            toast.success('Exame salvo com sucesso');
            fetchExams();
            return true;
        } catch (error) {
            console.error('Error adding exam:', error);
            toast.error('Erro ao salvar exame');
            return false;
        }
    };

    const deleteExam = async (examId: string) => {
        if (!organizationId) return;

        try {
            // Get files to delete from storage
            const { data: files } = await supabase
                .from('patient_exam_files')
                .select('file_path')
                .eq('exam_id', examId);

            if (files && files.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from('patient-exams')
                    .remove(files.map(f => f.file_path));

                if (storageError) console.error('Error deleting files from storage', storageError);
            }

            const { error } = await supabase
                .from('patient_exams')
                .delete()
                .eq('id', examId);

            if (error) throw error;

            toast.success('Exame removido');
            fetchExams();
        } catch (error) {
            console.error('Error deleting exam:', error);
            toast.error('Erro ao remover exame');
        }
    }

    return { exams, isLoading, addExam, deleteExam };
};
