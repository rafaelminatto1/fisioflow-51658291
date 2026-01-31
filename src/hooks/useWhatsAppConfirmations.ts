/**
 * useWhatsAppConfirmations - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('whatsapp_messages') → Firestore collection 'whatsapp_messages'
 * - supabase.from('appointments') → Firestore collection 'appointments'
 * - Joins with patients replaced with separate queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy,  } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';



export interface WhatsAppMessage {
  id: string;
  appointment_id?: string;
  patient_id?: string;
  message_type: 'reminder_24h' | 'reminder_2h' | 'confirmation' | 'cancellation' | 'rescheduling';
  message_content: string;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  response_received_at?: string;
  response_content?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'responded';
}

export const useWhatsAppConfirmations = (appointmentId?: string) => {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['whatsapp-messages', appointmentId],
    queryFn: async () => {
      const q = query(
        collection(db, 'whatsapp_messages'),
        orderBy('sent_at', 'desc')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WhatsAppMessage[];

      // Filter by appointment_id if provided
      if (appointmentId) {
        data = data.filter((m: WhatsAppMessage) => m.appointment_id === appointmentId);
      }

      return data;
    },
  });

  const { data: pendingConfirmations = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pending-confirmations'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const q = query(
        collection(db, 'appointments'),
        where('confirmation_status', '==', 'pending'),
        where('appointment_date', '>=', today),
        orderBy('appointment_date', 'asc'),
        orderBy('appointment_time', 'asc')
      );

      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch patient data for each appointment
      interface AppointmentFirestore {
        patient_id?: string;
        [key: string]: unknown;
      }

      interface PatientBasicInfo {
        id: string;
        name?: string;
        phone?: string;
      }

      const patientIds = appointments.map((a: AppointmentFirestore) => a.patient_id).filter((id): id is string => id !== null);
      const patientMap = new Map<string, PatientBasicInfo>();

      await Promise.all([...new Set(patientIds)].map(async (patientId) => {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        if (patientDoc.exists()) {
          patientMap.set(patientId, {
            id: patientDoc.id,
            name: patientDoc.data().full_name,
            phone: patientDoc.data().phone,
          });
        }
      }));

      return appointments.map((a: AppointmentFirestore) => ({
        ...a,
        patients: patientMap.get(a.patient_id as string),
      }));
    },
  });

  const sendReminder = useMutation({
    mutationFn: async ({
      appointmentId,
      patientId,
      messageType,
      messageContent,
    }: {
      appointmentId: string;
      patientId: string;
      messageType: WhatsAppMessage['message_type'];
      messageContent: string;
    }) => {
      // Inserir registro da mensagem
      const messageData = {
        appointment_id: appointmentId,
        patient_id: patientId,
        message_type: messageType,
        message_content: messageContent,
        status: 'sent',
        sent_at: new Date().toISOString(),
      };

      await addDoc(collection(db, 'whatsapp_messages'), messageData);

      // Atualizar appointment com timestamp do lembrete
      const updateField = messageType === 'reminder_24h'
        ? 'reminder_sent_24h'
        : 'reminder_sent_2h';

      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        [updateField]: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      toast.success('Lembrete enviado via WhatsApp');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar lembrete: ' + error.message);
    },
  });

  const confirmAppointment = useMutation({
    mutationFn: async ({
      appointmentId,
      method = 'manual',
    }: {
      appointmentId: string;
      method?: 'whatsapp' | 'phone' | 'email' | 'manual';
    }) => {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        confirmation_status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmation_method: method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      toast.success('Sessão confirmada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao confirmar sessão: ' + error.message);
    },
  });

  return {
    messages,
    pendingConfirmations,
    loading: isLoading || loadingPending,
    sendReminder: sendReminder.mutate,
    confirmAppointment: confirmAppointment.mutate,
    isSending: sendReminder.isPending,
    isConfirming: confirmAppointment.isPending,
  };
};
