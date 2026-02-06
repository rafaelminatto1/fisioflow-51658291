import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

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
