/**
 * useTeamMembers - Hook to fetch team members for mentions and assignments
 */

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, db, getFirebaseAuth, doc, getDoc } from '@/integrations/firebase/app';
import { getUserOrganizationId } from '@/utils/userHelpers';
import { TeamMember } from '@/types/tarefas';
import { fisioLogger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const auth = getFirebaseAuth();

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async (): Promise<TeamMember[]> => {
      const user = auth.currentUser;
      if (!user) return [];

      const organizationId = await getUserOrganizationId();
      if (!organizationId) {
        fisioLogger.debug('No organization_id found', undefined, 'useTeamMembers');
        return [];
      }

      // Query profiles collection for team members
      const q = query(
        collection(db, 'profiles'),
        where('organization_id', '==', organizationId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = normalizeFirestoreData(doc.data());
        return {
          id: doc.id,
          full_name: data.full_name || data.email || 'Usuário',
          email: data.email,
          avatar_url: data.avatar_url,
          role: data.role
        };
      });
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

export function useTeamMember(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-member', userId],
    queryFn: async (): Promise<TeamMember | null> => {
      if (!userId) return null;

      const docRef = doc(db, 'profiles', userId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) return null;

      const data = snapshot.data();
      return {
        id: snapshot.id,
        full_name: data.full_name || data.email || 'Usuário',
        email: data.email,
        avatar_url: data.avatar_url,
        role: data.role
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });
}
