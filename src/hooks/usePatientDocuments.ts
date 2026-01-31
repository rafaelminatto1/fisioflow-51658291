/**
 * usePatientDocuments - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - supabase.from('patient_documents') → Firestore collection 'patient_documents'
 * - supabase.storage.from('patient-documents') → Firebase Storage 'patient-documents'
 * - supabase.auth.getUser() → getFirebaseAuth().currentUser
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, db, getFirebaseStorage } from '@/integrations/firebase/app';

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

const auth = getFirebaseAuth();
const storage = getFirebaseStorage();

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
      const q = firestoreQuery(
        collection(db, 'patient_documents'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientDocument[];
    },
    enabled: !!patientId
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patient_id, file, category, description }: UploadDocumentData) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      // Upload do arquivo para o Firebase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${patient_id}/${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `patient-documents/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Criar registro de metadata
      const now = new Date().toISOString();
      const documentData = {
        patient_id,
        file_name: file.name,
        file_path: `patient-documents/${fileName}`,
        file_type: file.type,
        file_size: file.size,
        category,
        description: description || null,
        uploaded_by: firebaseUser.uid,
        storage_url: downloadURL,
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, 'patient_documents'), documentData);

      return {
        id: docRef.id,
        ...documentData,
      } as PatientDocument;
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
      const storageRef = ref(storage, document.file_path);
      await deleteObject(storageRef);

      // Deletar do banco
      const docRef = doc(db, 'patient_documents', document.id);
      await deleteDoc(docRef);

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
      const storageRef = ref(storage, document.file_path);
      const url = await getDownloadURL(storageRef);

      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo');
      }

      const blob = await response.blob();
      return { blob, document };
    },
    onSuccess: ({ blob, document: doc }) => {
      // Criar link de download
      const url = URL.createObjectURL(blob);
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
