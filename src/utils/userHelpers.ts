/**
 * Helpers para operações relacionadas ao usuário e organização
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Obtém o organization_id do usuário atual
 * @returns Promise com o organization_id ou null se não encontrado
 * @throws Error se o usuário não estiver autenticado
 */
export async function getUserOrganizationId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar organização do usuário: ${error.message}`);
  }

  return profile?.organization_id || null;
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

