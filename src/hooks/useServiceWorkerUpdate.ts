import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Workbox } from 'workbox-window';

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
  offlineReady: boolean;
}

export function useServiceWorkerUpdate() {
  const [state, setState] = useState<UpdateState>({
    hasUpdate: false,
    isUpdating: false,
    offlineReady: false,
  });

  useEffect(() => {
    // Apenas executar em produção com SW suportado
    if (typeof window === 'undefined' || import.meta.env.DEV || !('serviceWorker' in navigator)) {
      return;
    }

    let wb: Workbox | null = null;
    let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

    const registerSW = async () => {
      try {
        // Usar workbox-window para registro com controle granular
        wb = new Workbox('/sw.js', {
          type: 'classic'
        });

        // Listener para quando o SW encontrar uma atualização
        wb.addEventListener('waiting', (event) => {
          console.log('[SW] Nova versão disponível (waiting)!');

          // Marcar que há atualização
          setState(prev => ({ ...prev, hasUpdate: true }));

          // Mostrar toast com opção de atualizar
          toast.info('Nova versão disponível!', {
            description: 'Uma atualização está pronta. Clique para atualizar.',
            duration: Infinity,
            id: 'sw-update',
            action: {
              label: 'Atualizar agora',
              onClick: () => {
                console.log('[SW] Usuário clicou em atualizar');
                setState(prev => ({ ...prev, isUpdating: true }));

                // Enviar mensagem para o SW pular a espera
                if (wb) {
                  wb.addEventListener('controlling', () => {
                    console.log('[SW] Novo controller ativado, recarregando...');
                    window.location.reload();
                  }, { once: true });

                  // Enviar SKIP_WAITING para o SW
                  wb.messageSkipWaiting();
                }
              }
            },
            cancel: {
              label: 'Depois',
              onClick: () => {
                console.log('[SW] Usuário optou por atualizar depois');
                toast.dismiss('sw-update');
              }
            }
          });

          // Notificar via window event para outros componentes
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        });

        // Listener para quando o SW estiver ativo e controlando a página
        wb.addEventListener('activated', (event) => {
          console.log('[SW] Service Worker ativado:', event);

          // Verificar se é primeira instalação ou atualização
          if (event.isUpdate) {
            console.log('[SW] Atualização aplicada com sucesso');
          } else {
            console.log('[SW] Service Worker instalado pela primeira vez');
            setState(prev => ({ ...prev, offlineReady: true }));

            toast.success('Aplicativo pronto para uso offline', {
              description: 'O app agora funciona sem internet.',
              duration: 5000,
              id: 'sw-offline-ready',
            });
          }
        });

        // Listener para quando o SW começar a controlar a página
        wb.addEventListener('controlling', () => {
          console.log('[SW] Service Worker agora está controlando a página');
        });

        // Registrar o SW
        await wb.register();

        console.log('[SW] Service Worker registrado com sucesso');

        // Verificar atualizações periodicamente (a cada 2 minutos)
        updateCheckInterval = setInterval(() => {
          if (wb) {
            console.log('[SW] Verificando atualizações...');
            wb.update().catch(err => {
              console.debug('[SW] Nenhuma atualização disponível');
            });
          }
        }, 2 * 60 * 1000);

      } catch (error) {
        console.error('[SW] Falha ao registrar Service Worker:', error);
        toast.error('Erro ao registrar service worker', {
          description: 'O app pode não funcionar offline.',
        });
      }
    };

    registerSW();

    // Cleanup
    return () => {
      if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
      }
    };
  }, []);

  // Função para atualização manual (pode ser chamada de outros componentes)
  const forceUpdate = () => {
    console.log('[SW] Forçando atualização manual');
    setState(prev => ({ ...prev, isUpdating: true }));
    window.location.reload();
  };

  return {
    hasUpdate: state.hasUpdate,
    isUpdating: state.isUpdating,
    offlineReady: state.offlineReady,
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
