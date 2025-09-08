import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PatientDocument } from '@/types';

export function usePatientDocuments(patientId?: string) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('patient_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedDocuments: PatientDocument[] = data?.map(doc => ({
        id: doc.id,
        patientId: doc.patient_id,
        name: doc.name,
        type: doc.type as PatientDocument['type'],
        fileUrl: doc.file_url,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadedBy: doc.uploaded_by,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
      })) || [];

      setDocuments(formattedDocuments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    patientId: string,
    file: File,
    type: PatientDocument['type']
  ) => {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('patient-documents')
        .getPublicUrl(fileName);

      // Save document metadata
      const { data, error } = await supabase
        .from('patient_documents')
        .insert({
          patient_id: patientId,
          name: file.name,
          type,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchDocuments();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload do documento';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteDocument = async (id: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const fileName = fileUrl.split('/').pop();
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('patient-documents')
        .remove([fileName!]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir documento');
      throw err;
    }
  };

  const getDocumentsByPatient = (patientId: string) => {
    return documents.filter(doc => doc.patientId === patientId);
  };

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    getDocumentsByPatient,
    refetch: fetchDocuments,
  };
}