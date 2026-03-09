/**
 * Compat layer para o legado de Data Connect.
 *
 * O app agora consome Neon/Workers diretamente.
 */

export const dc = () => ({ provider: 'workers' as const });
