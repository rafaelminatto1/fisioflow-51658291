import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ===== TYPES =====

export type SoapStatus = 'draft' | 'finalized' | 'cancelled';

export interface SoapRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  session_number?: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  status: SoapStatus;
  // Pain scale (EVA)
  pain_level?: number; // 0-10
  pain_location?: string;
  pain_character?: string;
  // Session tracking
  duration_minutes?: number;
  last_auto_save_at?: string;
  finalized_at?: string;
  finalized_by?: string;
  record_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
  signature_hash?: string;
}

export interface CreateSoapRecordData {
  patient_id: string;
  appointment_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  status?: SoapStatus;
  pain_level?: number;
  pain_location?: string;
  pain_character?: string;
  duration_minutes?: number;
  record_date?: string;
}

export interface UpdateSoapRecordData extends Partial<CreateSoapRecordData> {
  status?: SoapStatus;
}

// Session attachment types
export type SessionAttachmentCategory = 'exam' | 'imaging' | 'document' | 'before_after' | 'other';
export type SessionAttachmentFileType = 'pdf' | 'jpg' | 'png' | 'docx' | 'other';

export interface SessionAttachment {
  id: string;
  soap_record_id?: string;
  patient_id: string;
  file_name: string;
  original_name?: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: SessionAttachmentFileType;
  mime_type?: string;
  category: SessionAttachmentCategory;
  size_bytes?: number;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

// Session template types
export interface SessionTemplate {
  id: string;
  organization_id?: string;
  therapist_id?: string;
  name: string;
  description?: string;
  subjective?: string;
  objective?: Record<string, unknown>;
  assessment?: string;
  plan?: Record<string, unknown>;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

// Hook para buscar registros SOAP de um paciente
export const useSoapRecords = (patientId: string, limit = 10) => {
  return useQuery({
    queryKey: ['soap-records', patientId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soap_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as SoapRecord[];
    },
    enabled: !!patientId
  });
};

// Hook para buscar um registro SOAP específico
export const useSoapRecord = (recordId: string) => {
  return useQuery({
    queryKey: ['soap-record', recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soap_records')
        .select('*')
        .eq('id', recordId)
        .single();
      
      if (error) throw error;
      return data as SoapRecord;
    },
    enabled: !!recordId
  });
};

// Hook para criar um registro SOAP
export const useCreateSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSoapRecordData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const recordData = {
        ...data,
        created_by: userData.user.id,
        record_date: data.record_date || new Date().toISOString().split('T')[0]
      };

      const { data: record, error } = await supabase
        .from('soap_records')
        .insert(recordData)
        .select()
        .single();
      
      if (error) throw error;
      return record as SoapRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records', data.patient_id] });
      toast({
        title: 'Evolução salva',
        description: 'A evolução do paciente foi registrada com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao salvar evolução',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para atualizar um registro SOAP
export const useUpdateSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: Partial<CreateSoapRecordData> }) => {
      const { data: record, error } = await supabase
        .from('soap_records')
        .update(data)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return record as SoapRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['soap-record', data.id] });
      toast({
        title: 'Evolução atualizada',
        description: 'A evolução foi atualizada com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar evolução',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para assinar (finalizar) um registro SOAP
export const useSignSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: record, error } = await supabase
        .from('soap_records')
        .update({
          status: 'finalized',
          signed_at: new Date().toISOString(),
          finalized_at: new Date().toISOString(),
          finalized_by: userData.user.id
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return record as SoapRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['soap-record', data.id] });
      toast({
        title: 'Evolução finalizada',
        description: 'A evolução foi finalizada e assinada com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao finalizar evolução',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para buscar drafts de um paciente (não finalizados)
export const useDraftSoapRecords = (patientId: string) => {
  return useQuery({
    queryKey: ['soap-drafts', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soap_records')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SoapRecord[];
    },
    enabled: !!patientId
  });
};

// ===== SESSION ATTACHMENTS =====

// Hook para buscar anexos de uma sessão
export const useSessionAttachments = (soapRecordId?: string, patientId?: string) => {
  return useQuery({
    queryKey: ['session-attachments', soapRecordId, patientId],
    queryFn: async () => {
      let query = supabase
        .from('session_attachments')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (soapRecordId) {
        query = query.eq('soap_record_id', soapRecordId);
      } else if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SessionAttachment[];
    },
    enabled: !!soapRecordId || !!patientId
  });
};

// Hook para upload de anexo
export const useUploadSessionAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      soapRecordId,
      patientId,
      category = 'other',
      description
    }: {
      file: File;
      soapRecordId?: string;
      patientId: string;
      category?: SessionAttachmentCategory;
      description?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Determine file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const fileTypeMap: Record<string, SessionAttachmentFileType> = {
        pdf: 'pdf',
        jpg: 'jpg',
        jpeg: 'jpg',
        png: 'png',
        docx: 'docx',
        doc: 'docx'
      };
      const fileType = fileTypeMap[fileExtension] || 'other';

      // Upload to storage
      const fileName = `${patientId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('session-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('session-attachments')
        .getPublicUrl(fileName);

      // Save to database
      const { data: attachment, error: dbError } = await supabase
        .from('session_attachments')
        .insert({
          soap_record_id: soapRecordId,
          patient_id: patientId,
          file_name: fileName,
          original_name: file.name,
          file_url: urlData.publicUrl,
          file_type: fileType,
          mime_type: file.type,
          category,
          size_bytes: file.size,
          description,
          uploaded_by: userData.user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return attachment as SessionAttachment;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-attachments', variables.soapRecordId, variables.patientId] });
      toast({
        title: 'Arquivo anexado',
        description: 'O arquivo foi anexado com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao anexar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para deletar anexo
export const useDeleteSessionAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attachmentId, patientId }: { attachmentId: string; patientId: string }) => {
      // Get attachment to delete from storage
      const { data: attachment } = await supabase
        .from('session_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

      if (!attachment) throw new Error('Anexo não encontrado');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('session-attachments')
        .remove([attachment.file_name]);

      if (storageError) console.warn('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('session_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;
      return attachmentId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-attachments'] });
      toast({
        title: 'Arquivo removido',
        description: 'O arquivo foi removido com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// ===== SESSION TEMPLATES =====

// Hook para buscar templates do terapeuta
export const useSessionTemplates = (therapistId?: string) => {
  return useQuery({
    queryKey: ['session-templates', therapistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*')
        .or(`is_global.eq.true,therapist_id.eq.${therapistId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SessionTemplate[];
    },
    enabled: !!therapistId
  });
};

// Hook para criar template
export const useCreateSessionTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<SessionTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('session_templates')
        .insert({
          ...template,
          therapist_id: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as SessionTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-templates'] });
      toast({
        title: 'Template criado',
        description: 'O template de sessão foi criado com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar template',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para atualizar template
export const useUpdateSessionTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: Partial<SessionTemplate> }) => {
      const { data: template, error } = await supabase
        .from('session_templates')
        .update(data)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return template as SessionTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-templates'] });
      toast({
        title: 'Template atualizado',
        description: 'O template foi atualizado com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar template',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para deletar template
export const useDeleteSessionTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('session_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-templates'] });
      toast({
        title: 'Template removido',
        description: 'O template foi removido com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover template',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// ===== AUTOSAVE =====

// Hook para autosave com upsert (atualiza se existe, cria se não existe)
export const useAutoSaveSoapRecord = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSoapRecordData & { recordId?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const recordData = {
        ...data,
        created_by: userData.user.id,
        status: data.status || 'draft',
        last_auto_save_at: new Date().toISOString(),
        record_date: data.record_date || new Date().toISOString().split('T')[0]
      };

      // Se tem recordId, atualiza. Se não, verifica se existe draft para este appointment
      if (data.recordId) {
        const { data: record, error } = await supabase
          .from('soap_records')
          .update(recordData)
          .eq('id', data.recordId)
          .select()
          .single();

        if (error) throw error;
        return { ...record, isNew: false } as SoapRecord & { isNew?: boolean };
      } else if (data.appointment_id) {
        // Tenta buscar draft existente
        const { data: existing } = await supabase
          .from('soap_records')
          .select('id')
          .eq('appointment_id', data.appointment_id)
          .eq('status', 'draft')
          .maybeSingle();

        if (existing) {
          const { data: record, error } = await supabase
            .from('soap_records')
            .update(recordData)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          return { ...record, isNew: false } as SoapRecord & { isNew?: boolean };
        }
      }

      // Cria novo registro
      const { data: record, error } = await supabase
        .from('soap_records')
        .insert(recordData)
        .select()
        .single();

      if (error) throw error;
      return { ...record, isNew: true } as SoapRecord & { isNew?: boolean };
    },
    onError: (error: unknown) => {
      // Silent error for autosave - don't show toast
      console.error('Autosave error:', error);
    }
  });
};
