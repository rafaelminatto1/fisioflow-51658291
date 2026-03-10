/**
 * Lazy Loading Utilities
 * 
 * Este módulo fornece utilitários para carregar módulos pesados sob demanda,
 * reduzindo o tamanho do bundle inicial e acelerando o download de atualizações.
 */

import { useState, useEffect, useCallback } from 'react';

// Cache para módulos carregados
const moduleCache = new Map<string, any>();

/**
 * Carrega um módulo pesado sob demanda
 * 
 * @example
 * const { module: Audio, isLoading } = useLazyModule(() => import('expo-av'), 'expo-av');
 */
export function useLazyModule<T>(
  importer: () => Promise<{ default: T } | T>,
  moduleName: string
): {
  module: T | null;
  isLoading: boolean;
  error: Error | null;
  load: () => Promise<void>;
} {
  const [state, setState] = useState<{
    module: T | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    module: moduleCache.get(moduleName) || null,
    isLoading: false,
    error: null,
  });

  const load = useCallback(async () => {
    // Já carregado
    if (moduleCache.has(moduleName)) {
      setState({
        module: moduleCache.get(moduleName),
        isLoading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await importer();
      const module = 'default' in result ? result.default : result;
      moduleCache.set(moduleName, module);
      setState({ module, isLoading: false, error: null });
    } catch (error) {
      setState({
        module: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error(`Failed to load ${moduleName}`),
      });
    }
  }, [importer, moduleName]);

  return { ...state, load };
}

/**
 * Carrega múltiplos módulos em paralelo
 */
export async function loadModules(
  modules: Array<{ name: string; importer: () => Promise<any> }>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  await Promise.all(
    modules.map(async ({ name, importer }) => {
      if (moduleCache.has(name)) {
        results[name] = moduleCache.get(name);
        return;
      }

      try {
        const result = await importer();
        const module = 'default' in result ? result.default : result;
        moduleCache.set(name, module);
        results[name] = module;
      } catch (error) {
        console.error(`[Lazy] Failed to load ${name}:`, error);
      }
    })
  );

  return results;
}

/**
 * Hook para carregar o módulo de câmera sob demanda
 */
export function useLazyCamera() {
  return useLazyModule(
    () => import('expo-camera').then(m => m.Camera),
    'expo-camera'
  );
}

/**
 * Hook para carregar o módulo de áudio sob demanda
 */
export function useLazyAudio() {
  return useLazyModule(
    () => import('expo-av').then(m => m.Audio),
    'expo-av'
  );
}

/**
 * Hook para carregar o módulo de localização sob demanda
 */
export function useLazyLocation() {
  return useLazyModule(
    () => import('expo-location'),
    'expo-location'
  );
}

/**
 * Hook para carregar o módulo de media library sob demanda
 */
export function useLazyMediaLibrary() {
  return useLazyModule(
    () => import('expo-media-library'),
    'expo-media-library'
  );
}

/**
 * Hook para carregar react-native-calendars sob demanda
 */
export function useLazyCalendars() {
  return useLazyModule(
    () => import('react-native-calendars'),
    'react-native-calendars'
  );
}

/**
 * Hook para carregar react-native-chart-kit sob demanda
 */
export function useLazyChartKit() {
  return useLazyModule(
    () => import('react-native-chart-kit'),
    'react-native-chart-kit'
  );
}

/**
 * Preload módulos críticos pós-login em background
 * Chame isso após o login bem-sucedido
 */
export async function preloadPostLoginModules(): Promise<void> {
  // Carregar módulos que serão usados após login em paralelo
  const modules = [
    { name: 'date-fns', importer: () => import('date-fns') },
  ];

  // Não espera completar - carrega em background
  loadModules(modules).catch(() => {
    // Silently fail - módulos serão carregados sob demanda se necessário
  });
}

export default {
  useLazyModule,
  useLazyCamera,
  useLazyAudio,
  useLazyLocation,
  useLazyMediaLibrary,
  useLazyCalendars,
  useLazyChartKit,
  loadModules,
  preloadPostLoginModules,
};