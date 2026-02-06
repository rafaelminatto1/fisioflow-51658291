
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

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Workbox } from 'workbox-window';
import { fisioLogger as logger } from '@/lib/errors/logger';

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

  // Usar ref para armazenar a instância do Workbox
  const wbRef = useRef<Workbox | null>(null);
  const updateCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Apenas executar em produção com SW suportado
    if (typeof window === 'undefined' || import.meta.env.DEV || !('serviceWorker' in navigator)) {
      return;
    }

    let mounted = true;

    const registerSW = async () => {
      try {
        // Criar instância do Workbox
        const wb = new Workbox('/sw.js', {
          type: 'classic'
        });

        // Armazenar referência
        wbRef.current = wb;

        // Listener para quando o SW encontrar uma atualização e entrar em waiting
        wb.addEventListener('waiting', (_event) => {
          logger.info('[SW] Nova versão disponível (waiting)', undefined, 'useServiceWorkerUpdate');

          if (!mounted) return;

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
                logger.info('[SW] Usuário clicou em atualizar', undefined, 'useServiceWorkerUpdate');
                setState(prev => ({ ...prev, isUpdating: true }));

                // Enviar mensagem para o SW pular a espera
                if (wbRef.current) {
                  // Listener para quando o novo SW assumir o controle
                  wbRef.current.addEventListener('controlling', () => {
                    logger.info('[SW] Novo controller ativado, recarregando', undefined, 'useServiceWorkerUpdate');
                    window.location.reload();
                  }, { once: true });

                  // Enviar SKIP_WAITING para o SW
                  wbRef.current.messageSkipWaiting();
                }
              }
            },
            cancel: {
              label: 'Depois',
              onClick: () => {
                logger.info('[SW] Usuário optou por atualizar depois', undefined, 'useServiceWorkerUpdate');
                toast.dismiss('sw-update');
              }
            }
          });

          // Notificar via window event para outros componentes
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        });

        // Listener para quando o SW estiver ativo e controlando a página
        wb.addEventListener('activated', (event) => {
          logger.info('[SW] Service Worker ativado', { event }, 'useServiceWorkerUpdate');

          if (!mounted) return;

          // Verificar se é primeira instalação ou atualização
          if (event.isUpdate) {
            logger.info('[SW] Atualização aplicada com sucesso', undefined, 'useServiceWorkerUpdate');
          } else {
            logger.info('[SW] Service Worker instalado pela primeira vez', undefined, 'useServiceWorkerUpdate');
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
          logger.info('[SW] Service Worker agora está controlando a página', undefined, 'useServiceWorkerUpdate');
        });

        // Registrar o SW
        await wb.register();

        logger.info('[SW] Service Worker registrado com sucesso', undefined, 'useServiceWorkerUpdate');

        // Verificar atualizações periodicamente (a cada 2 minutos)
        updateCheckIntervalRef.current = setInterval(() => {
          if (wbRef.current) {
            logger.info('[SW] Verificando atualizações', undefined, 'useServiceWorkerUpdate');
            wbRef.current.update().catch(_err => {
              logger.debug('[SW] Nenhuma atualização disponível', undefined, 'useServiceWorkerUpdate');
            });
          }
        }, 2 * 60 * 1000);

      } catch (error) {
        logger.error('[SW] Falha ao registrar Service Worker', error, 'useServiceWorkerUpdate');
        if (mounted) {
          toast.error('Erro ao registrar service worker', {
            description: 'O app pode não funcionar offline.',
          });
        }
      }
    };

    registerSW();

    // Cleanup
    return () => {
      mounted = false;
      if (updateCheckIntervalRef.current) {
        clearInterval(updateCheckIntervalRef.current);
        updateCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Função para atualização manual (pode ser chamada de outros componentes)
  const forceUpdate = () => {
    logger.info('[SW] Forçando atualização manual', undefined, 'useServiceWorkerUpdate');
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
