/**
 * usePlatform - Hook para detectar a plataforma atual
 *
 * Permite separar lógica entre web (React DOM + shadcn/ui) e
 * native (React Native + react-native-reusables)
 */

import RN from 'react-native';

export type PlatformType = 'web' | 'ios' | 'android' | 'native';

interface PlatformInfo {
  /** Tipo da plataforma */
  platform: PlatformType;
  /** Se é web */
  isWeb: boolean;
  /** Se é nativo (iOS ou Android) */
  isNative: boolean;
  /** Se é iOS especificamente */
  isIOS: boolean;
  /** Se é Android especificamente */
  isAndroid: boolean;
  /** Se tem suporte a touch */
  isTouch: boolean;
}

// Fallback Platform for web builds when react-native is stubbed
const WebPlatform = {
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default,
  isTesting: false,
};

/**
 * Hook que retorna informações sobre a plataforma atual
 * @returns Informações da plataforma
 */
export function usePlatform(): PlatformInfo {
  // Use Platform if available (native), otherwise use web fallback
  const Platform = RN.Platform || WebPlatform;
  const os = Platform.OS as 'ios' | 'android' | 'web';

  return {
    platform: os === 'web' ? 'web' : os,
    isWeb: os === 'web',
    isNative: os !== 'web',
    isIOS: os === 'ios',
    isAndroid: os === 'android',
    isTouch: os !== 'web',
  };
}

/**
 * Utilitário síncrono para detecção de plataforma
 * Use fora de componentes React
 */
export const getPlatform = (): PlatformInfo => {
  const Platform = RN.Platform || WebPlatform;
  const os = Platform.OS as 'ios' | 'android' | 'web';

  return {
    platform: os === 'web' ? 'web' : os,
    isWeb: os === 'web',
    isNative: os !== 'web',
    isIOS: os === 'ios',
    isAndroid: os === 'android',
    isTouch: os !== 'web',
  };
};

/**
 * Seleciona um valor baseado na plataforma
 * @param values Objeto com valores para cada plataforma
 * @returns O valor correspondente à plataforma atual
 */
export function selectPlatform<T>(values: {
  web?: T;
  ios?: T;
  android?: T;
  native?: T;
  default?: T;
}): T | undefined {
  const info = getPlatform();

  if (info.isWeb && values.web !== undefined) return values.web;
  if (info.isIOS && values.ios !== undefined) return values.ios;
  if (info.isAndroid && values.android !== undefined) return values.android;
  if (info.isNative && values.native !== undefined) return values.native;
  return values.default;
}

export default usePlatform;
