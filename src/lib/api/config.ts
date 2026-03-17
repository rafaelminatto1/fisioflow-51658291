/**
 * Configuração centralizada de URLs de API para garantir consistência entre ambientes.
 * Resolve problemas onde o build local vaza URLs de localhost para a produção.
 */

export const getWorkersApiUrl = (): string => {
  // 1. Se estivermos no navegador em produção (não localhost), FORÇAMOS a URL real
  if (typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.startsWith('192.168.') &&
      !window.location.hostname.endsWith('.workers.dev') &&
      !window.location.hostname.endsWith('.pages.dev')) {
    
    // Se estiver no domínio moocafisio, usar o subdomínio api-pro
    // IMPORTANTE: SEMPRE usar api-pro em produção para evitar CORS
    return 'https://api-pro.moocafisio.com.br';
  }

  // 1b. Se estivermos em um domínio de deployment (workers.dev ou pages.dev), usar a API correspondente
  if (typeof window !== 'undefined' && 
      (window.location.hostname.endsWith('.workers.dev') || window.location.hostname.endsWith('.pages.dev'))) {
    
    // Tenta inferir a URL da API baseada no nome do worker se possível, 
    // ou usa a variável de ambiente se disponível.
    const apiEnv = import.meta.env.VITE_WORKERS_API_URL;
    if (apiEnv) return apiEnv.replace(/\/$/, '');
    
    // Fallback dinâmico: se estamos em fisioflow-web.rafalegollas.workers.dev, 
    // a API deve estar em fisioflow-api.rafalegollas.workers.dev
    if (window.location.hostname.includes('rafalegollas.workers.dev')) {
      return 'https://fisioflow-api.rafalegollas.workers.dev';
    }
  }

  // 2. Fallback para variável de ambiente injetada pelo Vite
  const envUrl = import.meta.env.VITE_WORKERS_API_URL;
  
  // 3. Fallback final se nada estiver definido
  return (envUrl || 'https://api-pro.moocafisio.com.br').replace(/\/$/, '');
};
