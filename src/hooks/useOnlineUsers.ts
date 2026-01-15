import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/errors/logger';

export interface OnlineUser {
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
}

/**
 * Hook para rastrear usuários online em tempo real
 * Usa Supabase Realtime Presence para sincronização
 *
 * FIX: Track subscription state to avoid WebSocket errors
 */
export function useOnlineUsers(channelName: string = 'online-users') {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    let activeChannel: RealtimeChannel | null = null;
    let isSubscribed = false;

    const setupPresence = async () => {
      try {
        // Obter dados do usuário atual
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !mounted) return;

        // Buscar perfil e role
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const role = userRoles?.[0]?.role || 'paciente';
        const userName = profile?.full_name || user.email || 'Usuário';

        logger.info('Configurando Presence', { userId: user.id, userName, role }, 'useOnlineUsers');

        // Criar channel de presença
        activeChannel = supabase.channel(channelName);

        // Escutar eventos de sync (atualização completa do estado)
        activeChannel.on('presence', { event: 'sync' }, () => {
          if (!mounted) return;

          const presenceState = activeChannel!.presenceState<OnlineUser>();
          const users: OnlineUser[] = [];

          // Converter estado de presença em array de usuários
          Object.keys(presenceState).forEach((presenceKey) => {
            const userPresences = presenceState[presenceKey];
            if (userPresences && userPresences.length > 0) {
              // Pegar a primeira presença de cada usuário
              users.push(userPresences[0] as OnlineUser);
            }
          });

          logger.info('Usuários online atualizados', { count: users.length }, 'useOnlineUsers');
          setOnlineUsers(users);
        });

        // Escutar evento join (novo usuário entrou)
        activeChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (!mounted) return;
          logger.info('Usuário entrou', { key, newPresences }, 'useOnlineUsers');
        });

        // Escutar evento leave (usuário saiu)
        activeChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (!mounted) return;
          logger.info('Usuário saiu', { key, leftPresences }, 'useOnlineUsers');
        });

        // Subscrever ao channel
        activeChannel.subscribe(async (status: string) => {
          if (!mounted) return;

          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            logger.info('Conectado ao Presence channel', { channelName }, 'useOnlineUsers');
            setIsConnected(true);

            // Rastrear presença do usuário atual
            const userPresence: OnlineUser = {
              userId: user.id,
              userName,
              role,
              joinedAt: new Date().toISOString(),
            };

            const trackStatus = await activeChannel!.track(userPresence);
            logger.info('Presença rastreada', { trackStatus }, 'useOnlineUsers');
          } else {
            logger.warn('Status do channel mudou', { status }, 'useOnlineUsers');
            setIsConnected(false);
          }
        });

      } catch (error) {
        logger.error('Erro ao configurar Presence', error, 'useOnlineUsers');
      }
    };

    setupPresence();

    // Cleanup
    return () => {
      mounted = false;
      if (activeChannel) {
        logger.info('Removendo Presence channel', { channelName, isSubscribed }, 'useOnlineUsers');
        activeChannel.untrack();

        // Só remove channel se foi inscrito com sucesso
        if (isSubscribed) {
          supabase.removeChannel(activeChannel).catch(() => {
            // Ignore cleanup errors
          });
        }
      }
    };
  }, [channelName]);

  return {
    onlineUsers,
    isConnected,
    onlineCount: onlineUsers.length,
  };
}
