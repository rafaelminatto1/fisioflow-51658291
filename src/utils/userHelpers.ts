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

  // Validação explícita de UUID para evitar erro 400 no Supabase
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user.id)) {
    console.error('CRITICAL: Malformed User ID detected (pre-check):', user.id);
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('Sessão inválida: ID de usuário malformado');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // Se o erro for de sintaxe de UUID (código 22P02), é um sinal claro de ID inválido
    if (error.code === '22P02') {
      console.error('CRITICAL: Invalid UUID syntax detected in RLS query', user.id);
      // Limpar todo o armazenamento local para garantir
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      window.location.href = '/login'; // Redirecionar para login em vez de reload
      throw new Error('Sessão inválida detected via DB error');
    }
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

