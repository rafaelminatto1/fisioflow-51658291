
/**
 * Wrapper para httpsCallable que inclui token do App Check
 * 
 * Nota: O Firebase Functions Web SDK não suporta automaticamente
 * o envio de tokens do App Check. Este wrapper usa fetch diretamente
 * para incluir o token no header.
 */

import { getFunctions } from 'firebase/functions';
import { getAppCheck } from 'firebase/app-check';
import { getApp } from 'firebase/app';
import { getNeonAccessToken } from '@/lib/auth/neon-token';
import { fisioLogger as logger } from '@/lib/errors/logger';

export async function callableWithAppCheck<T = unknown, R = unknown>(
  name: string,
  data?: T
): Promise<R> {
  const isAppCheckEnabled = import.meta.env.VITE_ENABLE_APPCHECK === 'true';
  const app = getApp();
  const functions = getFunctions(app, 'southamerica-east1');
  const _region = functions.region || 'southamerica-east1';

  // Obter token do App Check
  let appCheckToken: string | undefined;
  if (isAppCheckEnabled) {
    try {
      const appCheck = getAppCheck(app);
      const appCheckResult = await appCheck.getToken();
      appCheckToken = appCheckResult?.token;
    } catch (error) {
      logger.warn('Could not get AppCheck token', error, 'callableWithAppCheck');
    }
  }

  // Obter token de autenticação (Neon JWT)
  const authToken = await getNeonAccessToken().catch(() => undefined);

  // Construir URL da função via configuração de ambiente
  const explicitBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
  const region = import.meta.env.VITE_FIREBASE_REGION || _region || 'southamerica-east1';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const baseUrl = explicitBase || (projectId ? `https://${region}-${projectId}.cloudfunctions.net` : '');
  if (!baseUrl) {
    throw new Error('Não foi possível resolver URL base de Cloud Functions (VITE_API_BASE_URL/VITE_FIREBASE_PROJECT_ID).');
  }
  const url = `${baseUrl}/${name}`;

  // Fazer requisição com fetch para incluir custom headers
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...(appCheckToken && { 'X-Firebase-AppCheck': appCheckToken }),
    },
    body: JSON.stringify({ data }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Function call failed');
  }

  return result.data || result;
}

/**
 * Hook para usar callable functions com App Check
 */
export function useCallableFunction() {
  return {
    call: callableWithAppCheck,
  };
}
