/**
 * Wrapper compatível para chamadas HTTP legadas.
 *
 * O token de autenticação vem da sessão Neon. App Check é ignorado nesta
 * camada porque os endpoints atuais já estão protegidos por JWT/Workers.
 */

import { getNeonAccessToken } from '@/lib/auth/neon-token';

export async function callableWithAppCheck<T = unknown, R = unknown>(
  name: string,
  data?: T,
): Promise<R> {
  const explicitBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
  const region = import.meta.env.VITE_FIREBASE_REGION || 'southamerica-east1';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const baseUrl = explicitBase || (projectId ? `https://${region}-${projectId}.cloudfunctions.net` : '');
  if (!baseUrl) {
    throw new Error('Não foi possível resolver URL base de Cloud Functions.');
  }

  const authToken = await getNeonAccessToken().catch(() => undefined);
  const response = await fetch(`${baseUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ data }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((result as { error?: { message?: string } }).error?.message || 'Function call failed');
  }

  return ((result as { data?: R }).data ?? result) as R;
}

export function useCallableFunction() {
  return { call: callableWithAppCheck };
}
