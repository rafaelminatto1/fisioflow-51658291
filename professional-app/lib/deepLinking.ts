/**
 * Deep Linking Configuration
 *
 * Configuração para deep links e universal links no Expo.
 * Permite abrir o app a partir de links externos.
 */

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { getRedirectForUser } from './navigationGuards';

/**
 * Prefixo do deep link do app
 */
export const APP_SCHEME = 'fisioflowpro';

/**
 * Domínios configurados para universal links
 */
export const UNIVERSAL_LINK_DOMAINS = [
  'fisioflow.com.br',
  'www.fisioflow.com.br',
  'app.fisioflow.com.br',
];

/**
 * Configuração de deep linking
 */
export const DEEP_LINKING_CONFIG = {
  prefixes: [
    Linking.createURL('/'),
    `${APP_SCHEME}://`,
    ...UNIVERSAL_LINK_DOMAINS.map((domain) => `https://${domain}`),
    ...UNIVERSAL_LINK_DOMAINS.map((domain) => `https://www.${domain}`),
  ],
  config: {
    screens: {
      // Rotas públicas
      index: '',
      '(auth)': {
        screens: {
          login: 'login',
          register: 'register',
          'forgot-password': 'forgot-password',
        },
      },
      // Rotas privadas
      '(tabs)': {
        screens: {
          patients: 'patients',
          appointments: 'appointments',
          profile: 'profile',
          settings: 'settings',
        },
      },
      // Rotas com parâmetros
      patient: {
        screens: {
          '[id]': 'patient/:id',
          '[id]/evolution': 'patient/:id/evolution',
          '[id]/financial': 'patient/:id/financial',
          '[id]/protocols': 'patient/:id/protocols',
        },
      },
    },
  },
};

/**
 * Tipos de deep links suportados
 */
export type DeepLinkType =
  | 'patient'
  | 'appointment'
  | 'protocol'
  | 'exercise'
  | 'report'
  | 'invite'
  | 'reset-password'
  | 'verify-email';

/**
 * Parse de deep link
 */
export interface ParsedDeepLink {
  type: DeepLinkType;
  params: Record<string, string>;
  path: string;
  query: Record<string, string>;
}

/**
 * Extrai parâmetros de uma URL
 */
export function extractParams(url: string): {
  path: string;
  query: Record<string, string>;
} {
  try {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;
    const query: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      query[key] = value;
    });

    return {
      path: urlObj.pathname,
      query,
    };
  } catch {
    return {
      path: url,
      query: {},
    };
  }
}

/**
 * Parse de deep link
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  try {
    const { path, query } = extractParams(url);

    // Remove o prefixo do app se presente
    const cleanPath = path.replace(new RegExp(`^/${APP_SCHEME}`), '');

    // Determina o tipo de link
    const segments = cleanPath.split('/').filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    let type: DeepLinkType = 'patient';
    let params: Record<string, string> = { ...query };

    // Padrão: /patient/:id
    if (segments[0] === 'patient' && segments[1]) {
      type = 'patient';
      params.id = segments[1];

      // Sub-rotas: /patient/:id/evolution
      if (segments[2]) {
        params.subRoute = segments[2];
      }
    }

    // Padrão: /appointment/:id
    else if (segments[0] === 'appointment' && segments[1]) {
      type = 'appointment';
      params.id = segments[1];
    }

    // Padrão: /protocol/:id
    else if (segments[0] === 'protocol' && segments[1]) {
      type = 'protocol';
      params.id = segments[1];
    }

    // Padrão: /exercise/:id
    else if (segments[0] === 'exercise' && segments[1]) {
      type = 'exercise';
      params.id = segments[1];
    }

    // Padrão: /report/:id
    else if (segments[0] === 'report' && segments[1]) {
      type = 'report';
      params.id = segments[1];
    }

    // Padrão: /invite/:code
    else if (segments[0] === 'invite' && segments[1]) {
      type = 'invite';
      params.code = segments[1];
    }

    // Padrão: /reset-password?token=...
    else if (segments[0] === 'reset-password') {
      type = 'reset-password';
    }

    // Padrão: /verify-email?token=...
    else if (segments[0] === 'verify-email') {
      type = 'verify-email';
    }

    return {
      type,
      params,
      path: cleanPath,
      query,
    };
  } catch (error) {
    console.error('[DeepLinking] Erro ao parse link:', error);
    return null;
  }
}

/**
 * Cria um deep link
 */
export function createDeepLink(
  type: DeepLinkType,
  params: Record<string, string | number> = {},
  useUniversalLink: boolean = false
): string {
  const baseUrl = useUniversalLink
    ? `https://${UNIVERSAL_LINK_DOMAINS[0]}`
    : `${APP_SCHEME}://`;

  const pathMap: Record<DeepLinkType, string> = {
    patient: `patient/${params.id}`,
    appointment: `appointment/${params.id}`,
    protocol: `protocol/${params.id}`,
    exercise: `exercise/${params.id}`,
    report: `report/${params.id}`,
    invite: `invite/${params.code}`,
    'reset-password': 'reset-password',
    'verify-email': 'verify-email',
  };

  const path = pathMap[type];
  const queryParams = new URLSearchParams(
    Object.entries(params).filter(([key]) => !['id', 'code'].includes(key)) as [string, string][]
  );

  const queryString = queryParams.toString();
  return `${baseUrl}/${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Hook para usar deep linking
 */
export function useDeepLinking() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  /**
   * Manipula um deep link
   */
  const handleDeepLink = (url: string) => {
    const parsed = parseDeepLink(url);

    if (!parsed) {
      console.warn('[DeepLinking] Link inválido:', url);
      return;
    }

    console.log('[DeepLinking] Link recebido:', parsed);

    // Se não estiver autenticado, redireciona para login
    // e salva o link para redirecionar depois
    if (!isAuthenticated) {
      router.replace({
        pathname: '/(auth)/login',
        params: {
          redirect: parsed.path,
          ...parsed.query,
        },
      } as any);
      return;
    }

    // Navega para o link
    handleAuthenticatedDeepLink(parsed);
  };

  /**
   * Manipula um deep link para usuário autenticado
   */
  const handleAuthenticatedDeepLink = (link: ParsedDeepLink) => {
    switch (link.type) {
      case 'patient':
        if (link.params.id) {
          router.push(`/patient/${link.params.id}` as any);
        }
        break;

      case 'appointment':
        if (link.params.id) {
          router.push(`/(tabs)/appointments` as any);
        }
        break;

      case 'protocol':
        if (link.params.id && link.params.patientId) {
          router.push(`/patient/${link.params.patientId}/protocols` as any);
        }
        break;

      case 'invite':
        // Trata convite para equipe
        router.push('/(tabs)/settings' as any);
        break;

      case 'reset-password':
        // Redireciona para reset de senha
        router.push('/(auth)/forgot-password' as any);
        break;

      case 'verify-email':
        // Verifica email (se necessário)
        // No app já autenticado, geralmente não precisa fazer nada
        break;

      default:
        console.warn('[DeepLinking] Tipo de link não tratado:', link.type);
    }
  };

  /**
   * Abre um link externo no navegador
   */
  const openExternalLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn('[DeepLinking] Link não suportado:', url);
      }
    } catch (error) {
      console.error('[DeepLinking] Erro ao abrir link:', error);
    }
  };

  /**
   * Compartilha um deep link
   */
  const shareDeepLink = async (
    type: DeepLinkType,
    params: Record<string, string | number> = {},
    title: string = 'Compartilhar'
  ) => {
    try {
      const link = createDeepLink(type, params, true);

      // Usa a API de compartilhamento nativa
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
        alert('Link copiado para a área de transferência!');
      } else {
        const { Share } = require('react-native');
        await Share.share({
          message: link,
          url: link,
          title,
        });
      }
    } catch (error) {
      console.error('[DeepLinking] Erro ao compartilhar:', error);
    }
  };

  return {
    handleDeepLink,
    handleAuthenticatedDeepLink,
    createDeepLink,
    openExternalLink,
    shareDeepLink,
    isAuthenticated,
  };
}

/**
 * Hook para verificar redirecionamento de login
 */
export function useRedirectAfterLogin() {
  const router = useRouter();
  const segments = useSegments();
  const state = useRootNavigationState();
  const { isAuthenticated, user } = useAuthStore();

  // Obtém o parâmetro de redirecionamento da URL
  const getRedirectParam = (): string | null => {
    const currentUrl = Linking.useURL();
    if (!currentUrl) return null;

    const { query } = extractParams(currentUrl);
    return query.redirect || null;
  };

  // Verifica se deve redirecionar
  const shouldRedirect = () => {
    const isAuthSegment = segments[0] === '(auth)';
    const redirectParam = getRedirectParam();

    // Se acabou de fazer login e há um redirect na URL
    if (isAuthenticated && !isAuthSegment && redirectParam) {
      return redirectParam;
    }

    // Se acabou de fazer login e está na tela de login
    if (isAuthenticated && isAuthSegment) {
      return getRedirectForUser(user);
    }

    return null;
  };

  return {
    shouldRedirect,
    getRedirectParam,
    segments,
    isAuthenticated,
  };
}

/**
 * Hook para configurar listeners de deep linking
 */
export function useDeepLinkListener() {
  const { handleDeepLink } = useDeepLinking();

  useEffect(() => {
    // Listener para quando o app é aberto por um link
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Verifica se o app foi aberto por um link ao iniciar
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);
}

/**
 * Função auxiliar para gerar links de convite
 */
export function generateInviteLinks(userId: string, clinicId?: string) {
  return {
    appLink: createDeepLink('invite', { userId, clinicId }, false),
    webLink: createDeepLink('invite', { userId, clinicId }, true),
    qrCodeUrl: createDeepLink('invite', { userId, clinicId, format: 'qr' }, true),
  };
}

/**
 * Função auxiliar para gerar links de paciente
 */
export function generatePatientLinks(patientId: string, subRoute?: string) {
  const params = subRoute ? { id: patientId, subRoute } : { id: patientId };

  return {
    appLink: createDeepLink('patient', params, false),
    webLink: createDeepLink('patient', params, true),
  };
}
