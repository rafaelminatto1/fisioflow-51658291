/**
 * useOrganizations - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query as firestoreQuery, where, orderBy, limit, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

const auth = getFirebaseAuth();

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  address?: string;
  logo_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
  active: boolean;
  joined_at: string;
}

export const useOrganizations = () => {
  const queryClient = useQueryClient();

  // Query para listar organizações do usuário
  const { data: organizations, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'organizations'),
        where('active', '==', true),
        orderBy('name')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Organization[];
    },
  });

  // Query para organização atual do usuário
  const { data: currentOrganization } = useQuery({
    queryKey: ['current-organization'],
    queryFn: async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      const profileQ = firestoreQuery(
        collection(db, 'profiles'),
        where('user_id', '==', firebaseUser.uid),
        limit(1)
      );
      const profileSnap = await getDocs(profileQ);

      if (profileSnap.empty) return null;

      const profile = profileSnap.docs[0].data();
      const organizationId = profile.organization_id;

      if (!organizationId) return null;

      const orgRef = doc(db, 'organizations', organizationId);
      const orgSnap = await getDoc(orgRef);

      if (!orgSnap.exists()) {
        logger.warn('Organization not found for ID', { organizationId }, 'useOrganizations');
        return null;
      }

      return {
        id: orgSnap.id,
        ...orgSnap.data(),
      } as Organization;
    },
  });

  // Mutation para criar organização
  const createOrganization = useMutation({
    mutationFn: async (orgData: { name: string; slug: string; settings?: Record<string, unknown> }) => {
      const now = new Date().toISOString();
      const orgDataToInsert = {
        name: orgData.name,
        slug: orgData.slug,
        settings: orgData.settings || {},
        active: true,
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, 'organizations'), orgDataToInsert);

      return {
        id: docRef.id,
        ...orgDataToInsert,
      } as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organização criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar organização: ' + error.message);
    },
  });

  // Mutation para atualizar organização
  const updateOrganization = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      const docRef = doc(db, 'organizations', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const snap = await getDoc(docRef);
      return {
        id: snap.id,
        ...snap.data(),
      } as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });
      toast.success('Organização atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar organização: ' + error.message);
    },
  });

  return {
    organizations,
    currentOrganization,
    isLoading,
    error,
    createOrganization: createOrganization.mutate,
    updateOrganization: updateOrganization.mutate,
    isCreating: createOrganization.isPending,
    isUpdating: updateOrganization.isPending,
  };
};
