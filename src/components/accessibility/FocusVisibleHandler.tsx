/**
 * FocusVisibleHandler - Gerencia a classe focus-visible
 *
 * Adiciona suporte para focus-visible, permitindo estilizar apenas o foco
 * via teclado e não o foco via mouse/toque. Isso melhora a acessibilidade
 * e a experiência visual para usuários de navegação por teclado.
 */


/**
 * Hook que configura o comportamento de focus-visible
 *
 * Detecta se o usuário está navegando por teclado e adiciona a classe
 * 'focus-visible' apenas nesses casos.
 */

import { useFocusVisibleHandler } from '@/hooks/accessibility/useFocusVisibleHandler';

/**
 * Componente que inicializa o handler de focus-visible
 */
export function FocusVisibleHandler() {
  useFocusVisibleHandler();
  return null;
}
