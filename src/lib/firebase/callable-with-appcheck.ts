import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAppCheck } from 'firebase/app-check';
import { getApp } from 'firebase/app';

/**
 * Wrapper para httpsCallable que inclui token do App Check
 * 
 * Nota: O Firebase Functions Web SDK não suporta automaticamente
 * o envio de tokens do App Check. Este wrapper usa fetch diretamente
 * para incluir o token no header.
 */
export async function callableWithAppCheck<T = any, R = any>(
  name: string,
  data?: T
): Promise<R> {
  const app = getApp();
  const functions = getFunctions(app, 'us-central1');
  const region = functions.region || 'us-central1';
  
  // Obter token do App Check
  let appCheckToken: string | undefined;
  try {
    const appCheck = getAppCheck(app);
    appCheckToken = await appCheck.getToken();
  } catch (error) {
    console.warn('[AppCheck] Could not get token:', error);
  }

  // Obter token de autenticação
  const auth = (await import('firebase/auth')).getAuth();
  const authToken = await auth.currentUser?.getIdToken();

  // Construir URL da função
  const url = `https://us-central1-fisioflow-migration.cloudfunctions.net/${name}`;

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
