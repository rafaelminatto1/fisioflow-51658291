/**
 * App Check Middleware
 * Middleware para verificação de tokens do Firebase App Check
 */


/**
 * Verifica se a requisição possui um token do App Check válido
 *
 * Em produção, rejeita requisições sem token válido.
 * Em desenvolvimento, permite requisições sem token para facilitar testes.
 *
 * NOTA: App Check temporariamente desabilitado até ser configurado no frontend
 *
 * @param request - Objeto de requisição do Cloud Functions (v2)
 * @throws HttpsError se não houver token do App Check (em produção)
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   verifyAppCheck(request); // Bloqueia se não tiver token em produção
 *   // Resto do código...
 * });
 * ```
 */

import { HttpsError } from 'firebase-functions/v2/https';

export function verifyAppCheck(request: { app?: any; rawRequest?: any }): void {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';

  // Em produção, rejeitar requisições sem App Check (se não for emulador)
  if (isProduction && !request.app && process.env.FUNCTIONS_EMULATOR !== 'true') {
    throw new HttpsError(
      'failed-precondition',
      'Acesso bloqueado: Este app requer verificação do App Check para chamadas de API.'
    );
  }

  if (!request.app) {
    return;
  }
}

/**
 * Versão estrita que rejeita requisições sem App Check
 * Use quando o frontend estiver configurado para enviar tokens
 */
export function verifyAppCheckStrict(request: { app?: any }): void {
  if (!request.app) {
    throw new HttpsError(
      'failed-precondition',
      'Esta função deve ser chamada de um app verificado pelo App Check.'
    );
  }
}

/**
 * Verifica App Check e retorna dados do app se disponível
 *
 * @param request - Objeto de requisição do Cloud Functions (v2)
 * @returns Objeto com dados do App Check ou null
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   const appCheck = getAppCheckData(request);
 *   if (!appCheck) {
 *     // Log ou tratamento customizado
 *   }
 *   // Resto do código...
 * });
 * ```
 */
export function getAppCheckData(request: { app?: any }): { app?: any } | null {
  return request.app ? { app: request.app } : null;
}

/**
 * Wrapper para criar callable functions com verificação automática de App Check
 *
 * @param handler - Função handler que recebe os dados
 * @returns Cloud Function callable com verificação de App Check
 *
 * @example
 * ```typescript
 * export const myFunction = withAppCheck(async (data, request) => {
 *   // request já foi verificado pelo App Check
 *   return { success: true };
 * });
 * ```
 */
export function withAppCheck<T = any, R = any>(
  handler: (data: T, request: any) => Promise<R>
): (request: { data: T; app?: any; auth?: any }) => Promise<R> {
  return async (request: { data: T; app?: any; auth?: any }) => {
    verifyAppCheck(request);
    return handler(request.data, request);
  };
}
