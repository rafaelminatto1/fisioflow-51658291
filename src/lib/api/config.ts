/**
 * Configuração centralizada de URLs de API para garantir consistência entre ambientes.
 * Resolve problemas onde o build local vaza URLs de localhost para a produção.
 */

export const getWorkersApiUrl = (): string => {
  // 1. Se estivermos no navegador em produção (não localhost), FORÇAMOS a URL real
  if (typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.startsWith('192.168.')) {
    
    // Se estiver no domínio moocafisio, usar o subdomínio api-pro
    // IMPORTANTE: SEMPRE usar api-pro em produção para evitar CORS
    return 'https://api-pro.moocafisio.com.br';
  }

  // 2. Fallback para variável de ambiente injetada pelo Vite
  const envUrl = import.meta.env.VITE_WORKERS_API_URL;
  
  // 3. Fallback final se nada estiver definido
  return (envUrl || 'https://api-pro.moocafisio.com.br').replace(/\/$/, '');
};
