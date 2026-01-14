/**
 * FocusVisibleHandler - Gerencia a classe focus-visible
 *
 * Adiciona suporte para focus-visible, permitindo estilizar apenas o foco
 * via teclado e não o foco via mouse/toque. Isso melhora a acessibilidade
 * e a experiência visual para usuários de navegação por teclado.
 */

import { useEffect } from 'react';

/**
 * Hook que configura o comportamento de focus-visible
 *
 * Detecta se o usuário está navegando por teclado e adiciona a classe
 * 'focus-visible' apenas nesses casos.
 */
export function useFocusVisibleHandler() {
  useEffect(() => {
    let isUsingKeyboard = false;

    // Handler para tecla pressionada
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas modificadoras (Ctrl, Alt, Shift, Meta)
      if (
        e.key === 'Control' ||
        e.key === 'Alt' ||
        e.key === 'Shift' ||
        e.key === 'Meta'
      ) {
        return;
      }

      isUsingKeyboard = true;
      document.body.classList.add('is-using-keyboard');
    };

    // Handler para mouse/toque
    const handlePointerDown = () => {
      isUsingKeyboard = false;
      document.body.classList.remove('is-using-keyboard');
    };

    // Handler para foco nos elementos
    const handleFocus = (e: FocusEvent) => {
      if (isUsingKeyboard) {
        (e.target as HTMLElement).classList.add('focus-visible');
      }
    };

    // Handler para blur nos elementos
    const handleBlur = (e: FocusEvent) => {
      (e.target as HTMLElement).classList.remove('focus-visible');
    };

    // Adicionar event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleBlur, true);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focusout', handleBlur, true);
      document.body.classList.remove('is-using-keyboard');
    };
  }, []);
}

/**
 * Componente que inicializa o handler de focus-visible
 */
export function FocusVisibleHandler() {
  useFocusVisibleHandler();
  return null;
}

/**
 * Hook para adicionar estilos de focus apenas quando navegando por teclado
 *
 * @returns Classe CSS condicional para focus
 */
export function useFocusClassName(baseClassName = '') {
  return {
    className: `${baseClassName} focus-visible:focus:ring-2 focus-visible:focus:ring-offset-2 focus-visible:focus:ring-primary`,
  };
}
