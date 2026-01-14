import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook para gerenciar atualizações do Service Worker
 *
 * Detecta automaticamente novas versões e notifica o usuário,
 * permitindo atualização sob demanda para evitar perda de dados.
 *
 * @example
 * ```tsx
 * useServiceWorkerUpdate();
 * ```
 */

interface UpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
}

let updateCallback: ((accept: boolean) => void) | null = null;

export function useServiceWorkerUpdate() {
  const [state, setState] = useState<UpdateState>({
    hasUpdate: false,
    isUpdating: false,
  });

  useEffect(() => {
    // Apenas executar em produção com SW suportado
    if (typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        import.meta.env.DEV) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          type: 'classic'
        });

        console.log('[SW] Service Worker registrado:', registration.scope);

        // Verificar atualizações periodicamente (a cada 2 minutos)
        updateCheckInterval = setInterval(() => {
          if (registration) {
            registration.update().catch(err => {
              console.warn('[SW] Falha ao verificar atualização:', err);
            });
          }
        }, 2 * 60 * 1000);

        // Ouvir por novas versões do SW
        registration.addEventListener('updatefound', handleUpdateFound);

        // Verificar se já há um SW esperando ativação
        if (registration.waiting) {
          handleUpdateWaiting();
        }

      } catch (error) {
        console.error('[SW] Falha ao registrar Service Worker:', error);
      }
    };

    const handleUpdateFound = () => {
      if (!registration) return;

      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[SW] Nova versão encontrada, baixando...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW] Nova versão instalada, aguardando ativação');
          handleUpdateWaiting();
        }
      });
    };

    const handleUpdateWaiting = () => {
      setState(prev => ({ ...prev, hasUpdate: true }));

      // Mostrar toast com opção de atualizar
      toast.info('Nova versão disponível!', {
        description: 'Uma atualização está pronta. Clique para atualizar.',
        duration: Infinity,
        id: 'sw-update',
        action: {
          label: 'Atualizar agora',
          onClick: () => {
            applyUpdate();
          }
        },
        cancel: {
          label: 'Depois',
          onClick: () => {
            // Usuário optou por atualizar depois
            console.log('[SW] Usuário optou por atualizar depois');
          }
        }
      });

      // Notificar via window event para outros componentes
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    };

    const applyUpdate = () => {
      if (!registration?.waiting) {
        console.warn('[SW] Nenhum SW esperando para ativar');
        return;
      }

      setState(prev => ({ ...prev, isUpdating: true }));

      // Enviar mensagem para o SW pular espera e ativar
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Quando o SW se tornar controller, recarregar a página
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Novo controller ativado, recarregando...');
        window.location.reload();
      }, { once: true });

      // Fallback: recarregar após 2 segundos se controllerchange não disparar
      setTimeout(() => {
        console.log('[SW] Recarregando página (fallback)');
        window.location.reload();
      }, 2000);
    };

    // Registrar quando a página carregar
    if (navigator.serviceWorker) {
      registerSW();
    }

    // Cleanup
    return () => {
      if (registration) {
        registration.removeEventListener('updatefound', handleUpdateFound);
      }
      if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
      }
    };
  }, []);

  // Função para atualização manual (pode ser chamada de outros componentes)
  const forceUpdate = () => {
    setState(prev => ({ ...prev, isUpdating: true }));
    window.location.reload();
  };

  return {
    hasUpdate: state.hasUpdate,
    isUpdating: state.isUpdating,
    forceUpdate
  };
}

/**
 * Listener para atualização de SW via evento customizado
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const unsubscribe = onServiceWorkerUpdate(() => {
 *     console.log('Nova versão disponível!');
 *   });
 *   return unsubscribe;
 * }, []);
 * ```
 */
export function onServiceWorkerUpdate(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener('sw-update-available', handler);
  return () => window.removeEventListener('sw-update-available', handler);
}

/**
 * Verifica manualmente por atualizações do SW
 */
export async function checkForUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    await registration.update();
    return true;
  } catch {
    return false;
  }
}
