/* eslint-disable react-refresh/only-export-components */

/**
 * Wrapper que adiciona safe area insets para iOS (notch e home indicator)
 * Garante que o conteúdo não fique atrás do notch ou do indicador home
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

export interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

/**
 * Componente SafeArea para adaptação ao notch e home indicator do iPhone
 * @param children - Conteúdo a ser envolvido
 * @param className - Classes CSS adicionais
 * @param top - Adicionar padding superior (para notch)
 * @param bottom - Adicionar padding inferior (para home indicator)
 * @param left - Adicionar padding esquerdo (para notch em landscape)
 * @param right - Adicionar padding direito (para notch em landscape)
 */
export function SafeArea({
  children,
  className = '',
  top = true,
  bottom = true,
  left = false,
  right = false,
}: SafeAreaProps) {
  const safeAreaStyles: React.CSSProperties = {
    paddingTop: top ? 'env(safe-area-inset-top)' : undefined,
    paddingBottom: bottom ? 'env(safe-area-inset-bottom)' : undefined,
    paddingLeft: left ? 'env(safe-area-inset-left)' : undefined,
    paddingRight: right ? 'env(safe-area-inset-right)' : undefined,
  };

  return (
    <div className={cn('safe-area', className)} style={safeAreaStyles}>
      {children}
    </div>
  );
}

/**
 * View principal que inclui safe area automaticamente
 * Use para envolver o conteúdo principal da página
 */
export function SafeAreaView({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SafeArea className={cn('min-h-screen bg-gray-50', className)}>
      {children}
    </SafeArea>
  );
}

/**
 * Header com safe area superior
 */
export function SafeAreaHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('bg-white border-b border-gray-200', className)}>
      <SafeArea top bottom={false} left={false} right={false}>
        <div className="flex items-center justify-between h-14 px-4">
          {children}
        </div>
      </SafeArea>
    </header>
  );
}

/**
 * Footer com safe area inferior
 */
export function SafeAreaFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer className={cn('bg-white border-t border-gray-200', className)}>
      <SafeArea top={false} bottom left={false} right={false}>
        <div className="p-4">
          {children}
        </div>
      </SafeArea>
    </footer>
  );
}

/**
 * Hook para obter as dimensões do safe area
 * Útil quando precisa calcular posições absolutas
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    // Em nativo, podemos obter os valores reais
    if (Capacitor.isNativePlatform()) {
      // TODO: Implementar com plugin capacitor-safe-area
      // Por enquanto, usar valores padrão
      setInsets({
        top: 44, // iPhone notch padrão
        bottom: 34, // iPhone home indicator padrão
        left: 0,
        right: 0,
      });
    }
  }, []);

  return insets;
}

// Adicionar import para useState e useEffect
import { useState, useEffect } from 'react';
