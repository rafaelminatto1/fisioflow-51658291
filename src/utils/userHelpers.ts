/**
 * Helpers para operações relacionadas ao usuário e organização
 */



/**
 * Obtém o organization_id do usuário atual
 * @returns Promise com o organization_id ou null se não encontrado
 * @throws Error se o usuário não estiver autenticado
 */

import { getFirebaseAuth, db, doc, getDoc } from '@/integrations/firebase/app';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { fisioLogger as logger } from '@/lib/errors/logger';

const isSyntheticOrganizationId = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return value === '11111111-1111-1111-1111-111111111111' || value === '00000000-0000-0000-0000-000000000000';
};

export async function getUserOrganizationId(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  try {
    const profileRef = doc(db, 'profiles', user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return null;
    }

    const profileData = profileSnap.data();

    // Aceitar vários nomes de campo usados em diferentes ambientes
    const rawOrg = profileData?.organization_id || profileData?.organizationId || profileData?.clinicId || profileData?.organization || null;

    if (!rawOrg) return null;

    // Se o campo vier como objeto (ex.: { id: 'org_xxx' }), extrair id
    if (typeof rawOrg === 'object') {
      const id = rawOrg?.id || rawOrg?.organization_id || rawOrg?.organizationId || null;
      if (id && !isSyntheticOrganizationId(id)) {
        logger.info('Organization id resolved from profile object', { resolvedId: id }, 'userHelpers');
        return id;
      }
    } else if (typeof rawOrg === 'string' && !isSyntheticOrganizationId(rawOrg)) {
      if (rawOrg !== profileData?.organization_id) {
        logger.warn('Organization id resolved via fallback field', { usedFieldValue: rawOrg }, 'userHelpers');
      }
      return rawOrg;
    }

    // Fallback via membership (evita org sintética no profile)
    const membershipQuery = query(
      collection(db, 'organization_members'),
      where('user_id', '==', user.uid),
      where('active', '==', true),
      limit(1)
    );
    const membershipSnap = await getDocs(membershipQuery);
    if (!membershipSnap.empty) {
      const membershipData = membershipSnap.docs[0].data() as { organization_id?: string; organizationId?: string };
      const membershipOrgId = membershipData.organization_id || membershipData.organizationId || null;
      if (membershipOrgId && !isSyntheticOrganizationId(membershipOrgId)) {
        return membershipOrgId;
      }
    }

    return null;
  } catch (error: unknown) {
    logger.error('Erro ao buscar organização do usuário no Firestore', error, 'userHelpers');
    throw new Error(`Erro ao buscar organização do usuário: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Obtém o organization_id do usuário atual ou lança erro se não encontrado
 * @returns Promise com o organization_id
 * @throws Error se o usuário não estiver autenticado ou organização não encontrada
 */
export async function requireUserOrganizationId(): Promise<string> {
  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    throw new Error('Organização não encontrada. Você precisa estar vinculado a uma organização.');
  }

  return organizationId;
}
