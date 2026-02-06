/**
 * Skip Links - Acessibilidade
 * Links para pular para o conteúdo principal, navegação e busca
 * Permite usuários de leitor de tela pularem o conteúdo repetido
 */

import React from 'react';
import { cn } from '@/lib/utils';

export function SkipLinks() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            const element = document.getElementById('main-content');
            element?.focus();
          }
        }}
      >
        Pular para o conteúdo principal
      </a>
      <a
        href="#main-navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            const element = document.getElementById('main-navigation') || document.getElementById('mobile-navigation');
            element?.focus();
          }
        }}
      >
        Pular para navegação
      </a>
      <a
        href="#search"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Pular para busca
      </a>
    </>
  );
}

/**
 * Visually hidden class - mantém elemento acessível para leitores de tela
 */
export const srOnly = "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Heading levels utilities
 */
export function VisuallyHidden({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("sr-only", className)}>
      {children}
    </span>
  );
}
