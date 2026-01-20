import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PatientDocument {
  id: string;
  patient_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: 'laudo' | 'exame' | 'receita' | 'termo' | 'outro';
  description?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentData {
  patient_id: string;
  file: File;
  category: PatientDocument['category'];
  description?: string;
}

export const usePatientDocuments = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientDocument[];
    },
    enabled: !!patientId
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patient_id, file, category, description }: UploadDocumentData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Upload do arquivo para o Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${patient_id}/${Date.now()}.${fileExt}`;
      const filePath = `patient-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(fileName, file, {
          cacheControl: '31536000', // 1 ano para documentos
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Criar registro de metadata
      const { data: document, error: dbError } = await supabase
        .from('patient_documents')
        .insert({
          patient_id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          category,
          description,
          uploaded_by: userData.user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return document as PatientDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-documents', data.patient_id] });
      toast({
        title: 'Documento enviado',
        description: 'O documento foi anexado com sucesso ao prontuário.'
      });
    },
    onError: (error: Error | unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar documento';
      toast({
        title: 'Erro ao enviar documento',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (document: PatientDocument) => {
      // Deletar do storage
      const fileName = document.file_path.replace('patient-documents/', '');
      const { error: storageError } = await supabase.storage
        .from('patient-documents')
        .remove([fileName]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;
      return document;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-documents', data.patient_id] });
      toast({
        title: 'Documento removido',
        description: 'O documento foi removido do prontuário.'
      });
    },
    onError: (error: Error | unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao remover documento';
      toast({
        title: 'Erro ao remover documento',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
};

export const useDownloadDocument = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (document: PatientDocument) => {
      const fileName = document.file_path.replace('patient-documents/', '');
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .download(fileName);

      if (error) throw error;
      return { data, document };
    },
    onSuccess: ({ data, document: doc }) => {
      // Criar link de download
      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: (error: Error | unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao baixar documento';
      toast({
        title: 'Erro ao baixar documento',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
};
