/**
 * usePrescriptions - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('exercise_prescriptions') → Firestore collection 'exercise_prescriptions'
 * - supabase.auth.getUser() → getFirebaseAuth().currentUser
 * - Joins com patients e profiles são feitos client-side
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, setDoc } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { getFirebaseAuth, db } from '@/integrations/firebase/app';


const auth = getFirebaseAuth();

export interface PrescriptionExercise {
  id: string;
  name: string;
  description?: string;
  sets: number;
  repetitions: number;
  frequency: string;
  observations?: string;
  video_url?: string;
  image_url?: string;
  completed?: boolean;
  completed_at?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  therapist_id?: string;
  qr_code: string;
  title: string;
  exercises: PrescriptionExercise[];
  notes?: string;
  validity_days: number;
  valid_until?: string;
  status: 'ativo' | 'concluido' | 'expirado' | 'cancelado';
  view_count: number;
  last_viewed_at?: string;
  completed_exercises: string[];
  created_at: string;
  updated_at: string;
  organization_id?: string;
  patient?: {
    id: string;
    name: string;
    phone?: string;
  };
  therapist?: {
    id: string;
    full_name?: string;
  };
}

// Helper: Convert Firestore doc to Prescription
const convertDocToPrescription = (doc: { id: string; data: () => Record<string, unknown> }): Prescription => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    completed_exercises: data.completed_exercises || [],
    exercises: data.exercises || [],
  } as Prescription;
};

export const usePrescriptions = (patientId?: string) => {
  const queryClient = useQueryClient();

  const { data: prescriptions = [], isLoading, error } = useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'exercise_prescriptions'),
        orderBy('created_at', 'desc')
      );

      if (patientId) {
        q = firestoreQuery(
          collection(db, 'exercise_prescriptions'),
          where('patient_id', '==', patientId),
          orderBy('created_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const prescriptionsData = snapshot.docs.map(convertDocToPrescription);

      // Fetch patient and therapist data for each prescription
      const prescriptionsWithDetails = await Promise.all(
        prescriptionsData.map(async (prescription) => {
          let patientData = null;
          let therapistData = null;

          // Fetch patient
          if (prescription.patient_id) {
            const patientRef = doc(db, 'patients', prescription.patient_id);
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
              const p = patientSnap.data();
              patientData = {
                id: patientSnap.id,
                name: p.name || p.full_name || 'Desconhecido',
                phone: p.phone,
              };
            }
          }

          // Fetch therapist
          if (prescription.therapist_id) {
            const therapistRef = doc(db, 'profiles', prescription.therapist_id);
            const therapistSnap = await getDoc(therapistRef);
            if (therapistSnap.exists()) {
              const t = therapistSnap.data();
              therapistData = {
                id: therapistSnap.id,
                full_name: t.full_name,
              };
            }
          }

          return {
            ...prescription,
            patient: patientData,
            therapist: therapistData,
          } as Prescription;
        })
      );

      return prescriptionsWithDetails;
    },
    enabled: true,
  });

  const createMutation = useMutation({
    mutationFn: async (prescription: {
      patient_id: string;
      title?: string;
      exercises: PrescriptionExercise[];
      notes?: string;
      validity_days?: number;
    }) => {
      const validityDays = prescription.validity_days || 30;
      const validUntil = format(addDays(new Date(), validityDays), 'yyyy-MM-dd');

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      // Fetch profile to get therapist_id and organization_id
      const profileQ = firestoreQuery(
        collection(db, 'profiles'),
        where('user_id', '==', firebaseUser.uid),
        limit(1)
      );
      const profileSnap = await getDocs(profileQ);

      if (profileSnap.empty) throw new Error('Perfil não encontrado');

      const profileData = profileSnap.docs[0].data();

      const prescriptionData = {
        patient_id: prescription.patient_id,
        therapist_id: profileSnap.docs[0].id,
        title: prescription.title || 'Prescrição de Reabilitação',
        exercises: prescription.exercises,
        notes: prescription.notes || null,
        validity_days: validityDays,
        valid_until: validUntil,
        organization_id: profileData.organization_id || null,
        qr_code: `RX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'ativo',
        view_count: 0,
        completed_exercises: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'exercise_prescriptions'), prescriptionData);

      return {
        id: docRef.id,
        ...prescriptionData,
      } as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescrição criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar prescrição: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, exercises, ...updates }: Partial<Prescription> & { id: string }) => {
      const docRef = doc(db, 'exercise_prescriptions', id);
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (exercises) {
        updateData.exercises = exercises;
      }

      await updateDoc(docRef, updateData);

      const snapshot = await getDoc(docRef);
      return convertDocToPrescription(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescrição atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'exercise_prescriptions', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescrição excluída');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  return {
    prescriptions,
    loading: isLoading,
    error,
    createPrescription: createMutation.mutateAsync,
    updatePrescription: updateMutation.mutate,
    deletePrescription: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook para buscar prescrição pública (sem autenticação)
export const usePublicPrescription = (qrCode: string) => {
  const queryClient = useQueryClient();

  const { data: prescription, isLoading, error } = useQuery({
    queryKey: ['public-prescription', qrCode],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'exercise_prescriptions'),
        where('qr_code', '==', qrCode),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Prescrição não encontrada');
      }

      const data = convertDocToPrescription(snapshot.docs[0]);

      // Incrementar visualização
      await updateDoc(snapshot.docs[0].ref, {
        view_count: (data.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      });

      // Fetch patient and therapist data
      let patientData = null;
      let therapistData = null;

      if (data.patient_id) {
        const patientRef = doc(db, 'patients', data.patient_id);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
          const p = patientSnap.data();
          patientData = {
            id: patientSnap.id,
            name: p.name || p.full_name || 'Desconhecido',
            phone: p.phone,
          };
        }
      }

      if (data.therapist_id) {
        const therapistRef = doc(db, 'profiles', data.therapist_id);
        const therapistSnap = await getDoc(therapistRef);
        if (therapistSnap.exists()) {
          const t = therapistSnap.data();
          therapistData = {
            id: therapistSnap.id,
            full_name: t.full_name,
          };
        }
      }

      return {
        ...data,
        patient: patientData,
        therapist: therapistData,
      } as Prescription;
    },
    enabled: !!qrCode,
  });

  const markExerciseComplete = useMutation({
    mutationFn: async ({ prescriptionId, exerciseId }: { prescriptionId: string; exerciseId: string }) => {
      const docRef = doc(db, 'exercise_prescriptions', prescriptionId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        throw new Error('Prescrição não encontrada');
      }

      const current = snapshot.data();
      const completedExercises = Array.isArray(current?.completed_exercises)
        ? current.completed_exercises
        : [];

      const isCompleted = completedExercises.includes(exerciseId);
      const newCompleted = isCompleted
        ? completedExercises.filter((id: string) => id !== exerciseId)
        : [...completedExercises, exerciseId];

      await updateDoc(docRef, {
        completed_exercises: newCompleted,
        updated_at: new Date().toISOString(),
      });

      return newCompleted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-prescription', qrCode] });
    },
  });

  return {
    prescription,
    loading: isLoading,
    error,
    markExerciseComplete: markExerciseComplete.mutate,
    isMarking: markExerciseComplete.isPending,
  };
};
