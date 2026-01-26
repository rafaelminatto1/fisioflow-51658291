/**
 * useCommunications - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('communication_logs') → Firestore collection 'communication_logs'
 * - Joins with patients replaced with separate queries
 * - Enums preserved as TypeScript types
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseDb } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

const db = getFirebaseDb();

type CommunicationType = 'email' | 'whatsapp' | 'sms' | 'push';
type CommunicationStatus = 'pendente' | 'enviado' | 'entregue' | 'lido' | 'falha';

export interface Communication {
  id: string;
  type: CommunicationType;
  recipient: string;
  patient_id: string | null;
  appointment_id: string | null;
  subject: string | null;
  body: string;
  status: CommunicationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  created_at: string;
  organization_id: string;
  patient?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

// Helper to convert Firestore doc to Communication
const convertDocToCommunication = (doc: any, patientData?: any): Communication => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    patient: patientData,
  } as Communication;
};

export function useCommunications(filters?: { channel?: string; status?: string }) {
  return useQuery({
    queryKey: ['communications', filters],
    queryFn: async () => {
      let baseQuery = query(
        collection(db, 'communication_logs'),
        orderBy('created_at', 'desc'),
        limit(100)
      );

      // Apply filters via client-side filtering after query
      const snapshot = await getDocs(baseQuery);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Communication[];

      // Filter by channel
      if (filters?.channel && filters.channel !== 'all') {
        data = data.filter(c => c.type === filters.channel);
      }

      // Filter by status
      if (filters?.status && filters.status !== 'all') {
        data = data.filter(c => c.status === filters.status);
      }

      // Fetch patient data for each communication
      const patientIds = data
        .map(c => c.patient_id)
        .filter((id): id is string => id !== null);

      const patientMap = new Map<string, any>();
      for (const patientId of patientIds) {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        if (patientDoc.exists()) {
          patientMap.set(patientId, {
            id: patientDoc.id,
            ...patientDoc.data(),
          });
        }
      }

      // Attach patient data to communications
      return data.map(c => ({
        ...c,
        patient: c.patient_id ? patientMap.get(c.patient_id) || null : null,
      }));
    },
  });
}

export function useCommunicationStats() {
  return useQuery({
    queryKey: ['communication-stats'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'communication_logs'));
      const data = snapshot.docs.map(doc => doc.data());

      const stats = {
        total: data.length || 0,
        sent: data.filter((c: any) => c.status === 'enviado').length || 0,
        delivered: data.filter((c: any) => c.status === 'entregue').length || 0,
        failed: data.filter((c: any) => c.status === 'falha').length || 0,
        pending: data.filter((c: any) => c.status === 'pendente').length || 0,
        byChannel: {
          email: data.filter((c: any) => c.type === 'email').length || 0,
          whatsapp: data.filter((c: any) => c.type === 'whatsapp').length || 0,
          sms: data.filter((c: any) => c.type === 'sms').length || 0,
        },
      };

      return stats;
    },
  });
}

interface SendCommunicationData {
  type: CommunicationType;
  patient_id: string;
  recipient: string;
  subject?: string;
  body: string;
}

export function useSendCommunication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendCommunicationData) => {
      // Get organization_id from profile in Firestore
      if (!user) throw new Error('Usuário não autenticado');

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;

      if (!profileData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const communicationData = {
        type: data.type,
        patient_id: data.patient_id,
        recipient: data.recipient,
        subject: data.subject || null,
        body: data.body,
        status: 'pendente' as CommunicationStatus,
        organization_id: profileData.organization_id,
        created_at: new Date().toISOString(),
        sent_at: null,
        delivered_at: null,
        read_at: null,
        error_message: null,
        appointment_id: null,
      };

      const docRef = await addDoc(collection(db, 'communication_logs'), communicationData);
      const docSnap = await getDoc(docRef);

      return { id: docRef.id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats'] });
      toast.success('Comunicação enviada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar comunicação: ' + error.message);
    },
  });
}

export function useDeleteCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'communication_logs', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats'] });
      toast.success('Comunicação excluída');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });
}

export function useResendCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'communication_logs', id);
      await updateDoc(docRef, {
        status: 'pendente' as CommunicationStatus,
        error_message: null,
      });

      const docSnap = await getDoc(docRef);
      return { id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Comunicação reenviada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reenviar: ' + error.message);
    },
  });
}

// Helper to translate status to Portuguese display
export function getStatusLabel(status: CommunicationStatus): string {
  const labels: Record<CommunicationStatus, string> = {
    pendente: 'Pendente',
    enviado: 'Enviado',
    entregue: 'Entregue',
    lido: 'Lido',
    falha: 'Falha',
  };
  return labels[status] || status;
}

// Helper to translate type to Portuguese display
export function getTypeLabel(type: CommunicationType): string {
  const labels: Record<CommunicationType, string> = {
    email: 'Email',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    push: 'Push',
  };
  return labels[type] || type;
}
