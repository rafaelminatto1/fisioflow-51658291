/* eslint-disable react-refresh/only-export-components */
/**
 * SkipLink - Componente de acessibilidade para navegação por teclado
 *
 * Permite que usuários de leitor de tela pulem diretamente para o conteúdo principal,
 * ignorando a navegação repetitiva. Requisito WCAG 2.1 AAA 2.4.1
 */

import { useMemo } from 'react';

interface SkipLinkProps {
  /** ID do elemento principal para onde o link deve pular */
  mainContentId?: string;
  /** Texto customizado para o link */
  label?: string;
}

export function SkipLink({
  mainContentId = 'main-content',
  label = 'Pular para o conteúdo principal'
}: SkipLinkProps) {
  // Garantir que o elemento principal existe
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(mainContentId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${mainContentId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label={label}
    >
      {label}
    </a>
  );
}

/**
 * Adiciona atributos de acessibilidade ao elemento principal
 */
export function MainContentProps() {
  return {
    id: 'main-content',
    tabIndex: -1,
    'aria-label': 'Conteúdo principal',
  };
}

/**
 * Hook para adicionar props de acessibilidade ao conteúdo principal
 */
export function useMainContentProps() {
  return useMemo(() => ({
    id: 'main-content',
    tabIndex: -1,
    'aria-label': 'Conteúdo principal',
  }), []);
}
