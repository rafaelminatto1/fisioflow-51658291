/**
 * useSoapRecords - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, limit, QueryConstraint, serverTimestamp, Timestamp } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import {

  getFirebaseAuth,
  getFirebaseStorage
} from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ensureProfile } from '@/lib/database/profiles';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const auth = getFirebaseAuth();
const storage = getFirebaseStorage();

// ===== TYPES =====

export type SoapStatus = 'draft' | 'finalized' | 'cancelled';

// Query keys factory for better cache management and type safety
export const soapKeys = {
  all: ['soap-records'] as const,
  lists: () => [...soapKeys.all, 'list'] as const,
  list: (patientId: string, filters?: { status?: SoapStatus; limit?: number }) =>
    [...soapKeys.lists(), patientId, filters] as const,
  details: () => [...soapKeys.all, 'detail'] as const,
  detail: (id: string) => [...soapKeys.details(), id] as const,
  drafts: (patientId: string) => [...soapKeys.all, 'drafts', patientId] as const,
  templates: (therapistId?: string) => [...soapKeys.all, 'templates', therapistId] as const,
  attachments: (soapRecordId?: string, patientId?: string) =>
    [...soapKeys.all, 'attachments', soapRecordId, patientId] as const,
} as const;

// Generic error class for SOAP operations
export class SoapOperationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'SoapOperationError';
  }
}

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

// Helper: Convert Firestore doc to SoapRecord
const convertDocToSoapRecord = (doc: { id: string; data: () => Record<string, unknown> }): SoapRecord => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
    record_date: (data.record_date as string) || new Date().toISOString().split('T')[0],
  } as SoapRecord;
};

// Hook para buscar registros SOAP de um paciente
export const useSoapRecords = (patientId: string, limitValue = 10) => {
  return useQuery({
    queryKey: soapKeys.list(patientId, { limit: limitValue }),
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'soap_records'),
        where('patient_id', '==', patientId),
        orderBy('record_date', 'desc'),
        limit(limitValue)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToSoapRecord);
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook para busca infinita de registros SOAP (paginação)
export const useInfiniteSoapRecords = (patientId: string, limitValue = 20) => {
  return useInfiniteQuery({
    queryKey: [...soapKeys.lists(), patientId, 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      // For simplicity, fetch all and slice client-side
      // In production, implement proper cursor-based pagination
      const q = firestoreQuery(
        collection(db, 'soap_records'),
        where('patient_id', '==', patientId),
        orderBy('record_date', 'desc')
      );

      const snapshot = await getDocs(q);
      const allRecords = snapshot.docs.map(convertDocToSoapRecord);
      return allRecords.slice(pageParam * limitValue, (pageParam + 1) * limitValue);
    },
    initialPageParam: 0,
    enabled: !!patientId,
    getNextPageParam: (_lastPage, _allPages, lastPageParam) => {
      // Simple pagination logic
      return lastPageParam + 1;
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Hook para buscar um registro SOAP específico
export const useSoapRecord = (recordId: string) => {
  return useQuery({
    queryKey: soapKeys.detail(recordId),
    queryFn: async () => {
      const docRef = doc(db, 'soap_records', recordId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        throw new SoapOperationError('Registro não encontrado', 'NOT_FOUND');
      }

      return convertDocToSoapRecord(snapshot);
    },
    enabled: !!recordId,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para criar um registro SOAP
export const useCreateSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSoapRecordData) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new SoapOperationError('Usuário não autenticado', 'UNAUTHORIZED');

      const fullName = firebaseUser.displayName || firebaseUser.email?.split('@')[0];
      const profileId = await ensureProfile(firebaseUser.uid, firebaseUser.email, fullName);
      if (!profileId) throw new SoapOperationError('Não foi possível carregar o perfil do usuário', 'PROFILE_ERROR');

      const recordData = {
        ...data,
        created_by: profileId,
        record_date: data.record_date || new Date().toISOString().split('T')[0],
        status: data.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'soap_records'), recordData);

      return {
        id: docRef.id,
        ...recordData,
      } as SoapRecord;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: soapKeys.lists() });

      const previousLists = queryClient.getQueryData(soapKeys.all);

      queryClient.setQueryData(
        soapKeys.list(newData.patient_id),
        (old: SoapRecord[] | undefined) => [
          ...(old || []),
          {
            ...newData,
            id: `temp-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: newData.status || 'draft',
          } as SoapRecord
        ]
      );

      return { previousLists };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: soapKeys.list(data.patient_id) });
      queryClient.setQueryData(soapKeys.detail(data.id), data);
      toast({
        title: 'Evolução salva',
        description: 'A evolução do paciente foi registrada com sucesso.'
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(soapKeys.all, context.previousLists);
      }
      toast({
        title: 'Erro ao salvar evolução',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
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
      const docRef = doc(db, 'soap_records', recordId);

      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      // Fetch updated document
      const snapshot = await getDoc(docRef);
      return convertDocToSoapRecord(snapshot);
    },
    onMutate: async ({ recordId, data }) => {
      await queryClient.cancelQueries({ queryKey: soapKeys.detail(recordId) });

      const previousRecord = queryClient.getQueryData(soapKeys.detail(recordId));

      queryClient.setQueryData(
        soapKeys.detail(recordId),
        (old: SoapRecord | undefined) => ({ ...old, ...data, updated_at: new Date().toISOString() } as SoapRecord)
      );

      return { previousRecord, recordId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: soapKeys.list(data.patient_id) });
      queryClient.setQueryData(soapKeys.detail(data.id), data);
      toast({
        title: 'Evolução atualizada',
        description: 'A evolução foi atualizada com sucesso.'
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRecord && context?.recordId) {
        queryClient.setQueryData(soapKeys.detail(context.recordId), context.previousRecord);
      }
      toast({
        title: 'Erro ao atualizar evolução',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
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
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new SoapOperationError('Usuário não autenticado', 'UNAUTHORIZED');

      const docRef = doc(db, 'soap_records', recordId);

      await updateDoc(docRef, {
        status: 'finalized',
        signed_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
        finalized_by: firebaseUser.uid,
        updated_at: new Date().toISOString()
      });

      const snapshot = await getDoc(docRef);
      return convertDocToSoapRecord(snapshot);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: soapKeys.list(data.patient_id) });
      queryClient.invalidateQueries({ queryKey: soapKeys.drafts(data.patient_id) });
      queryClient.setQueryData(soapKeys.detail(data.id), data);
      toast({
        title: 'Evolução finalizada',
        description: 'A evolução foi finalizada e assinada com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao finalizar evolução',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para deletar um registro SOAP
export const useDeleteSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recordId, patientId }: { recordId: string; patientId: string }) => {
      const docRef = doc(db, 'soap_records', recordId);

      // Check if record exists and get its data
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        throw new SoapOperationError('Registro não encontrado', 'NOT_FOUND');
      }

      const record = convertDocToSoapRecord(snapshot);

      // Don't allow deletion of finalized records
      if (record.status === 'finalized') {
        throw new SoapOperationError('Não é possível excluir uma evolução finalizada', 'CANNOT_DELETE_FINALIZED');
      }

      // Delete the record
      await deleteDoc(docRef);

      return { recordId, patientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: soapKeys.list(result.patientId) });
      queryClient.invalidateQueries({ queryKey: soapKeys.drafts(result.patientId) });
      queryClient.removeQueries({ queryKey: soapKeys.detail(result.recordId) });
      toast({
        title: 'Evolução excluída',
        description: 'A evolução foi excluída com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao excluir evolução',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// Hook para buscar drafts de um paciente (não finalizados)
export const useDraftSoapRecords = (patientId: string) => {
  return useQuery({
    queryKey: soapKeys.drafts(patientId),
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'soap_records'),
        where('patient_id', '==', patientId),
        where('status', '==', 'draft'),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToSoapRecord);
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

// Hook para buscar draft de SOAP por appointment (carregar evolução em progresso ao abrir a página)
export const useDraftSoapRecordByAppointment = (patientId: string, appointmentId: string | undefined) => {
  return useQuery({
    queryKey: [...soapKeys.drafts(patientId), 'byAppointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const q = firestoreQuery(
        collection(db, 'soap_records'),
        where('appointment_id', '==', appointmentId),
        where('status', '==', 'draft'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return convertDocToSoapRecord(snapshot.docs[0]);
    },
    enabled: !!patientId && !!appointmentId,
    staleTime: 1000 * 60 * 2,
  });
};

// ===== SESSION ATTACHMENTS =====

// Helper: Convert Firestore doc to SessionAttachment
const convertDocToSessionAttachment = (doc: { id: string; data: () => Record<string, unknown> }): SessionAttachment => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as SessionAttachment;
};

// Hook para buscar anexos de uma sessão
export const useSessionAttachments = (soapRecordId?: string, patientId?: string) => {
  return useQuery({
    queryKey: soapKeys.attachments(soapRecordId, patientId),
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'session_attachments'),
        orderBy('uploaded_at', 'desc')
      );

      if (soapRecordId) {
        q = firestoreQuery(collection(db, 'session_attachments'), where('soap_record_id', '==', soapRecordId), orderBy('uploaded_at', 'desc'));
      } else if (patientId) {
        q = firestoreQuery(collection(db, 'session_attachments'), where('patient_id', '==', patientId), orderBy('uploaded_at', 'desc'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToSessionAttachment);
    },
    enabled: !!(soapRecordId || patientId),
    staleTime: 1000 * 60 * 5,
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
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new SoapOperationError('Usuário não autenticado', 'UNAUTHORIZED');

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

      // Upload to Firebase Storage
      const fileName = `${patientId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `session-attachments/${fileName}`);

      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // Save to database
      const attachmentData = {
        soap_record_id: soapRecordId || null,
        patient_id: patientId,
        file_name: fileName,
        original_name: file.name,
        file_url: fileUrl,
        file_type: fileType,
        mime_type: file.type,
        category,
        size_bytes: file.size,
        description: description || null,
        uploaded_by: firebaseUser.uid,
        uploaded_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'session_attachments'), attachmentData);

      return {
        id: docRef.id,
        ...attachmentData,
      } as SessionAttachment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: soapKeys.attachments(variables.soapRecordId, variables.patientId) });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao anexar arquivo',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
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
    mutationFn: async ({ attachmentId, soapRecordId, patientId }: { attachmentId: string; soapRecordId?: string; patientId?: string }) => {
      // Get attachment to delete from storage
      const docRef = doc(db, 'session_attachments', attachmentId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        throw new SoapOperationError('Anexo não encontrado', 'NOT_FOUND');
      }

      const attachment = convertDocToSessionAttachment(snapshot);

      // Delete from Firebase Storage
      try {
        const storageRef = ref(storage, `session-attachments/${attachment.file_name}`);
        await deleteObject(storageRef);
      } catch (storageError) {
        logger.warn('Storage delete error', storageError, 'useSoapRecords');
      }

      // Delete from database
      await deleteDoc(docRef);

      return { attachmentId, soapRecordId, patientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: soapKeys.attachments(result.soapRecordId, result.patientId) });
      toast({
        title: 'Arquivo removido',
        description: 'O arquivo foi removido com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover arquivo',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// ===== SESSION TEMPLATES =====

// Helper: Convert Firestore doc to SessionTemplate
const convertDocToSessionTemplate = (doc: { id: string; data: () => Record<string, unknown> }): SessionTemplate => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as SessionTemplate;
};

// Hook para buscar templates do terapeuta
export const useSessionTemplates = (therapistId?: string) => {
  return useQuery({
    queryKey: soapKeys.templates(therapistId),
    queryFn: async () => {
      if (!therapistId) return [];

      // Query for global templates OR therapist-specific templates
      const q = firestoreQuery(
        collection(db, 'session_templates'),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const allTemplates = snapshot.docs.map(convertDocToSessionTemplate);

      // Filter client-side ( Firestore OR is limited)
      return allTemplates.filter(t => t.is_global || t.therapist_id === therapistId);
    },
    enabled: !!therapistId,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para criar template
export const useCreateSessionTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<SessionTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new SoapOperationError('Usuário não autenticado', 'UNAUTHORIZED');

      const templateData = {
        ...template,
        therapist_id: firebaseUser.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'session_templates'), templateData);

      return {
        id: docRef.id,
        ...templateData,
      } as SessionTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soapKeys.templates() });
      toast({
        title: 'Template criado',
        description: 'O template de sessão foi criado com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar template',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
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
      const docRef = doc(db, 'session_templates', templateId);

      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      const snapshot = await getDoc(docRef);
      return convertDocToSessionTemplate(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soapKeys.templates() });
      toast({
        title: 'Template atualizado',
        description: 'O template foi atualizado com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar template',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
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
      const docRef = doc(db, 'session_templates', templateId);
      await deleteDoc(docRef);
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soapKeys.templates() });
      toast({
        title: 'Template removido',
        description: 'O template foi removido com sucesso.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover template',
        description: error instanceof SoapOperationError ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

// ===== AUTOSAVE =====

// Hook para autosave com upsert (atualiza se existe, cria se não existe)
export const useAutoSaveSoapRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSoapRecordData & { recordId?: string }) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new SoapOperationError('Usuário não autenticado', 'UNAUTHORIZED');

      const fullName = firebaseUser.displayName || firebaseUser.email?.split('@')[0];
      const profileId = await ensureProfile(firebaseUser.uid, firebaseUser.email, fullName);
      if (!profileId) throw new SoapOperationError('Não foi possível carregar o perfil do usuário', 'PROFILE_ERROR');

      // Destructure recordId to avoid including it in the document body
      const { recordId, ...restData } = data;

      // Sanitize data: remove undefined values and ensure types are correct for Firestore
      const sanitizedData = Object.entries(restData).reduce((acc, [key, val]) => {
        if (val !== undefined) {
          acc[key] = val;
        }
        return acc;
      }, {} as Record<string, any>);

      const recordData = {
        ...sanitizedData,
        created_by: profileId,
        status: sanitizedData.status || 'draft',
        last_auto_save_at: new Date().toISOString(),
        record_date: sanitizedData.record_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };

      // Se tem recordId, atualiza
      if (recordId) {
        const docRef = doc(db, 'soap_records', recordId);
        await updateDoc(docRef, recordData);

        const snapshot = await getDoc(docRef);
        return { ...convertDocToSoapRecord(snapshot), isNew: false } as SoapRecord & { isNew?: boolean };
      }

      // Se tem appointment_id, verifica se existe draft
      if (sanitizedData.appointment_id) {
        const q = firestoreQuery(
          collection(db, 'soap_records'),
          where('appointment_id', '==', sanitizedData.appointment_id),
          where('status', '==', 'draft'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const existingDoc = snapshot.docs[0];
          await updateDoc(existingDoc.ref, recordData);

          const updatedSnapshot = await getDoc(existingDoc.ref);
          return { ...convertDocToSoapRecord(updatedSnapshot), isNew: false } as SoapRecord & { isNew?: boolean };
        }
      }

      // Cria novo registro
      const docRef = await addDoc(collection(db, 'soap_records'), recordData);

      return {
        id: docRef.id,
        ...recordData,
      } as SoapRecord & { isNew?: boolean };
    },
    onSuccess: (result) => {
      // Atualizar cache silenciosamente
      if (result.patient_id) {
        queryClient.setQueryData(soapKeys.detail(result.id), result);
        queryClient.invalidateQueries({ queryKey: soapKeys.drafts(result.patient_id) });
      }
    },
    onError: (error: unknown) => {
      // Silent error for autosave
      logger.error('Autosave error', error instanceof SoapOperationError ? error.message : error, 'useSoapRecords');
    }
  });
};