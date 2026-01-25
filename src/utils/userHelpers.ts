/**
 * Helpers para operações relacionadas ao usuário e organização
 */

import { getFirebaseAuth, getFirebaseDb } from '@/integrations/firebase/app';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Obtém o organization_id do usuário atual
 * @returns Promise com o organization_id ou null se não encontrado
 * @throws Error se o usuário não estiver autenticado
 */
export async function getUserOrganizationId(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
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
    return profileData?.organization_id || null;
  } catch (error: any) {
    console.error('Erro ao buscar organização do usuário no Firestore:', error);
    throw new Error(`Erro ao buscar organização do usuário: ${error.message}`);
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

