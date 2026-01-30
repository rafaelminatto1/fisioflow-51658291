/**
 * useTelemedicine - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - telemedicine_rooms -> telemedicine_rooms collection
 * - Auth through useAuth() from AuthContext
 * - Manual joins for patients and profiles data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  orderBy,
} from 'firebase/firestore';

// Helper to convert doc
const convertDoc = (doc: { id: string; data: () => Record<string, unknown> }) => ({ id: doc.id, ...doc.data() });

export interface TelemedicineRoom {
  id: string;
  organization_id: string;
  patient_id: string;
  therapist_id: string;
  appointment_id: string | null;
  room_code: string;
  status: 'aguardando' | 'ativo' | 'encerrado';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  recording_url: string | null;
  notas: string | null;
  created_at: string;
}

export function useTelemedicineRooms() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ['telemedicine-rooms', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const q = query(
        collection(db, 'telemedicine_rooms'),
        where('organization_id', '==', organizationId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const rooms = await Promise.all(
        snapshot.docs.map(async (roomDoc) => {
          const roomData = convertDoc(roomDoc);

          // Fetch patient data
          let patientData = null;
          if (roomData.patient_id) {
            const patientDoc = await getDoc(doc(db, 'patients', roomData.patient_id));
            if (patientDoc.exists()) {
              patientData = {
                name: patientDoc.data().full_name,
                email: patientDoc.data().email,
                phone: patientDoc.data().phone
              };
            }
          }

          // Fetch therapist profile
          let therapistName = null;
          if (roomData.therapist_id) {
            const profileDoc = await getDoc(doc(db, 'profiles', roomData.therapist_id));
            if (profileDoc.exists()) {
              therapistName = profileDoc.data().full_name;
            }
          }

          return {
            ...roomData,
            patients: patientData,
            profiles: { full_name: therapistName }
          };
        })
      );

      return rooms;
    },
    enabled: !!organizationId
  });
}

export function useCreateTelemedicineRoom() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: { patient_id: string; scheduled_at?: string; appointment_id?: string }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      // Generate unique room code
      const roomCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

      const docRef = await addDoc(collection(db, 'telemedicine_rooms'), {
        ...data,
        organization_id: profile.organization_id,
        therapist_id: profile.id,
        room_code: roomCode,
        status: 'aguardando',
        created_at: new Date().toISOString()
      });

      const newDoc = await getDoc(docRef);
      return convertDoc(newDoc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-rooms'] });
      toast.success('Sala de telemedicina criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar sala: ' + error.message);
    }
  });
}

export function useUpdateTelemedicineRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TelemedicineRoom> & { id: string }) => {
      const docRef = doc(db, 'telemedicine_rooms', id);
      await updateDoc(docRef, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-rooms'] });
      toast.success('Sala atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });
}
