import { createAuthClient } from '@neondatabase/neon-js/auth';

/**
 * Neon Auth Client
 * Configurado usando a URL do Neon Auth provida pelas variáveis de ambiente.
 */
export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);

/**
 * Helper para verificar se o Neon Auth está configurado
 */
export const isNeonAuthEnabled = () => {
  return !!import.meta.env.VITE_NEON_AUTH_URL;
};
