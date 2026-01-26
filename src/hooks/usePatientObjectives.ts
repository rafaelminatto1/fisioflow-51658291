/**
 * usePatientObjectives - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('patient_objectives') → Firestore collection 'patient_objectives'
 * - supabase.from('patient_objective_assignments') → Firestore collection 'patient_objective_assignments'
 * - Joins replaced with separate queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
} from 'firebase/firestore';

const db = getFirebaseDb();

export interface PatientObjective {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
  organization_id: string | null;
  created_at: string;
}

export interface PatientObjectiveAssignment {
  id: string;
  patient_id: string;
  objective_id: string;
  prioridade: number;
  notas: string | null;
  created_at: string;
  objective?: PatientObjective;
}

export type PatientObjectiveFormData = Omit<PatientObjective, 'id' | 'created_at' | 'organization_id'>;

export function usePatientObjectives() {
  return useQuery({
    queryKey: ['patient-objectives'],
    queryFn: async () => {
      const q = query(
        collection(db, 'patient_objectives'),
        where('ativo', '==', true),
        orderBy('categoria', 'asc'),
        orderBy('nome', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientObjective[];
    },
  });
}

export function usePatientAssignedObjectives(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-assigned-objectives', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const q = query(
        collection(db, 'patient_objective_assignments'),
        where('patient_id', '==', patientId),
        orderBy('prioridade', 'asc')
      );

      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch objective data for each assignment
      const assignmentsWithObjectives = await Promise.all(
        assignments.map(async (assignment: any) => {
          if (assignment.objective_id) {
            const objectiveDoc = await getDoc(doc(db, 'patient_objectives', assignment.objective_id));
            if (objectiveDoc.exists()) {
              return {
                ...assignment,
                objective: { id: objectiveDoc.id, ...objectiveDoc.data() } as PatientObjective,
              };
            }
          }
          return assignment;
        })
      );

      return assignmentsWithObjectives as PatientObjectiveAssignment[];
    },
    enabled: !!patientId,
  });
}

export function useCreatePatientObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objective: PatientObjectiveFormData) => {
      const data = {
        ...objective,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'patient_objectives'), data);
      const docSnap = await getDoc(docRef);

      return { id: docRef.id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-objectives'] });
      toast.success('Objetivo criado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao criar objetivo.');
    },
  });
}

export function useUpdatePatientObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...objective }: Partial<PatientObjective> & { id: string }) => {
      const docRef = doc(db, 'patient_objectives', id);
      await updateDoc(docRef, objective);

      const docSnap = await getDoc(docRef);
      return { id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-objectives'] });
      toast.success('Objetivo atualizado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar objetivo.');
    },
  });
}

export function useDeletePatientObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'patient_objectives', id);
      await updateDoc(docRef, { ativo: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-objectives'] });
      toast.success('Objetivo excluído com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao excluir objetivo.');
    },
  });
}

// Assignment mutations
export function useAssignObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      objectiveId,
      prioridade = 2,
      notas
    }: {
      patientId: string;
      objectiveId: string;
      prioridade?: number;
      notas?: string;
    }) => {
      const data = {
        patient_id: patientId,
        objective_id: objectiveId,
        prioridade,
        notas,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'patient_objective_assignments'), data);
      const docSnap = await getDoc(docRef);

      return { id: docRef.id, ...docSnap.data() };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-assigned-objectives', variables.patientId] });
      toast.success('Objetivo atribuído ao paciente.');
    },
    onError: () => {
      toast.error('Erro ao atribuir objetivo.');
    },
  });
}

export function useRemoveObjectiveAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patientId: _patientId }: { id: string; patientId: string }) => {
      await deleteDoc(doc(db, 'patient_objective_assignments', id));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-assigned-objectives', variables.patientId] });
      toast.success('Objetivo removido do paciente.');
    },
    onError: () => {
      toast.error('Erro ao remover objetivo.');
    },
  });
}
