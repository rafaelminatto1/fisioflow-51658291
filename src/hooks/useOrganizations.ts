/**
 * useOrganizations - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query as firestoreQuery, where, orderBy, limit, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/integrations/firebase/functions';

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
  const { user, profile, organizationId: authOrganizationId } = useAuth();

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
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as Organization[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
  });

  // Query para organização atual do usuário
  const {
    data: currentOrganization,
    isLoading: isCurrentOrgLoading,
    error: currentOrgError
  } = useQuery({
    queryKey: ['current-organization', user?.uid, profile?.organization_id, authOrganizationId],
    queryFn: async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      const coerceOrganizationId = (raw: unknown): string | null => {
        if (!raw) return null;
        if (typeof raw === 'string') return raw;
        if (typeof raw === 'object') {
          const org = raw as Record<string, unknown>;
          const nested = org.id || org.organization_id || org.organizationId;
          return typeof nested === 'string' ? nested : null;
        }
        return null;
      };
      const isSyntheticOrganizationId = (value: string | null): boolean => {
        if (!value) return false;
        return value === '11111111-1111-1111-1111-111111111111' || value === '00000000-0000-0000-0000-000000000000';
      };

      // 1) Prefer auth context (Firestore/API/claims already reconciled there)
      let organizationId =
        coerceOrganizationId(profile?.organization_id) ||
        coerceOrganizationId(authOrganizationId);
      if (isSyntheticOrganizationId(organizationId)) {
        organizationId = null;
      }

      // 2) Fallback to Firestore profile document by UID (common shape)
      if (!organizationId) {
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        const profileDoc = await getDoc(profileRef).catch(() => null);
        if (profileDoc?.exists()) {
          const profileData = normalizeFirestoreData(profileDoc.data());
          organizationId =
            coerceOrganizationId(profileData.organization_id) ||
            coerceOrganizationId(profileData.organizationId) ||
            coerceOrganizationId(profileData.organization);
          if (isSyntheticOrganizationId(organizationId)) {
            organizationId = null;
          }
        }
      }

      // 3) Legacy fallback for profile documents keyed with user_id field
      if (!organizationId) {
        const profileQ = firestoreQuery(
          collection(db, 'profiles'),
          where('user_id', '==', firebaseUser.uid),
          limit(1)
        );
        const profileSnap = await getDocs(profileQ).catch(() => null);
        if (profileSnap && !profileSnap.empty) {
          const profileData = normalizeFirestoreData(profileSnap.docs[0].data());
          organizationId =
            coerceOrganizationId(profileData.organization_id) ||
            coerceOrganizationId(profileData.organizationId) ||
            coerceOrganizationId(profileData.organization);
          if (isSyntheticOrganizationId(organizationId)) {
            organizationId = null;
          }
        }
      }

      // 4) Membership fallback (source of truth when profile has placeholder org)
      if (!organizationId) {
        const membershipQ = firestoreQuery(
          collection(db, 'organization_members'),
          where('user_id', '==', firebaseUser.uid),
          where('active', '==', true),
          limit(1)
        );
        const membershipSnap = await getDocs(membershipQ).catch(() => null);
        if (membershipSnap && !membershipSnap.empty) {
          const membershipData = normalizeFirestoreData(membershipSnap.docs[0].data()) as { organization_id?: string; organizationId?: string };
          organizationId =
            coerceOrganizationId(membershipData.organization_id) ||
            coerceOrganizationId(membershipData.organizationId);
        }
      }

      // 5) API profile fallback (Cloud SQL/source-of-truth)
      if (!organizationId) {
        try {
          const resp = await profileApi.getCurrent();
          const apiProfile = (resp as { data?: Record<string, unknown> })?.data ?? resp;
          const apiOrgId = coerceOrganizationId(
            (apiProfile as Record<string, unknown>)?.organization_id ||
            (apiProfile as Record<string, unknown>)?.organizationId
          );
          if (apiOrgId && !isSyntheticOrganizationId(apiOrgId)) {
            organizationId = apiOrgId;
          }
        } catch (err) {
          logger.debug('Profile API fallback failed', err, 'useOrganizations');
        }
      }

      // 6) Token claims fallback
      if (!organizationId) {
        try {
          const token = await firebaseUser.getIdTokenResult();
          const claims = token.claims as Record<string, unknown>;
          const claimOrgId = coerceOrganizationId(claims.organizationId || claims.organization_id);
          if (claimOrgId) {
            organizationId = claimOrgId;
          }
        } catch (err) {
          logger.debug('Claims fallback failed', err, 'useOrganizations');
        }
      }

      // 7) Last resort: keep non-null organization for UI flows (avoid modal hard block)
      if (!organizationId) {
        organizationId =
          coerceOrganizationId(profile?.organization_id) ||
          coerceOrganizationId(authOrganizationId) ||
          null;
      }

      if (!organizationId) return null;

      try {
        const orgRef = doc(db, 'organizations', organizationId);
        const orgSnap = await getDoc(orgRef);

        if (orgSnap.exists()) {
          return {
            id: orgSnap.id,
            ...normalizeFirestoreData(orgSnap.data()),
          } as Organization;
        }
      } catch (err) {
        logger.warn('Organization read failed, using profile fallback', { organizationId, err }, 'useOrganizations');
      }

      // Fallback resiliente: mantém fluxo de criação/edição de paciente funcional
      // mesmo quando a coleção organizations está indisponível/permissão negada.
      return {
        id: organizationId,
        name: 'Organização',
        slug: `org-${organizationId.slice(0, 8)}`,
        settings: {},
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Organization;
    },
    enabled: !!(user || auth.currentUser),
    staleTime: 1000 * 60 * 15, // 15 minutes
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
    isCurrentOrgLoading,
    error,
    currentOrgError,
    createOrganization: createOrganization.mutate,
    updateOrganization: updateOrganization.mutate,
    isCreating: createOrganization.isPending,
    isUpdating: updateOrganization.isPending,
  };
};
