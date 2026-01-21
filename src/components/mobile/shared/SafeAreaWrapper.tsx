/**
 * SafeAreaWrapper - Componente para gerenciar áreas seguras do iOS
 * Gerencia o notch, indicator inicial e áreas seguras do dispositivo
 */

import { useEffect, useState } from 'react';
import { SafeAreaInsets } from '@capacitor/safe-area-insets';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * Componente que envolve o conteúdo e adiciona padding seguro
 * para evitar sobreposição com notch, home indicator, etc.
 */
export function SafeAreaWrapper({
  children,
  className = '',
  edges = ['top', 'bottom']
}: SafeAreaWrapperProps) {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    // Obter as áreas seguras do dispositivo
    SafeAreaInsets.getInsets().then(result => {
      setInsets({
        top: result.top || 0,
        bottom: result.bottom || 0,
        left: result.left || 0,
        right: result.right || 0
      });
    });

    // Listener para mudanças nas insets (rotação, etc)
    const listener = SafeAreaInsets.addListener((result) => {
      setInsets({
        top: result.top || 0,
        bottom: result.bottom || 0,
        left: result.left || 0,
        right: result.right || 0
      });
    });

    return () => {
      listener.then(fn => fn.remove());
    };
  }, []);

  const style: React.CSSProperties = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Hook customizado para usar as safe areas
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    SafeAreaInsets.getInsets().then(result => {
      setInsets({
        top: result.top || 0,
        bottom: result.bottom || 0,
        left: result.left || 0,
        right: result.right || 0
      });
    });

    const listener = SafeAreaInsets.addListener((result) => {
      setInsets({
        top: result.top || 0,
        bottom: result.bottom || 0,
        left: result.left || 0,
        right: result.right || 0
      });
    });

    return () => {
      listener.then(fn => fn.remove());
    };
  }, []);

  return insets;
}

/**
 * Componente de header com área segura automaticamente aplicada
 */
export function SafeHeader({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SafeAreaWrapper
      className={`bg-background border-b ${className}`}
      edges={['top']}
    >
      {children}
    </SafeAreaWrapper>
  );
}

/**
 * Componente de footer com área segura automaticamente aplicada
 */
export function SafeFooter({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SafeAreaWrapper
      className={`bg-background border-t ${className}`}
      edges={['bottom']}
    >
      {children}
    </SafeAreaWrapper>
  );
}

/**
 * Componente de container com áreas seguras em todas as bordas
 */
export function SafeScreen({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SafeAreaWrapper
      className={`min-h-screen bg-background ${className}`}
      edges={['top', 'bottom']}
    >
      {children}
    </SafeAreaWrapper>
  );
}
