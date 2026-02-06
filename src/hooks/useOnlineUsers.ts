/**
 * useOnlineUsers - Migrated to Firebase Presence
 *
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { onAuthStateChanged } from 'firebase/auth';
import { fisioLogger as logger } from '@/lib/errors/logger';

const auth = getFirebaseAuth();

export interface PresenceUser {
  userId: string;
  userName: string;
  role: string;
  joinedAt: Date;
  lastSeen: Date;
}

export interface PresenceState {
  onlineUsers: PresenceUser[];
  isConnected: boolean;
}

// Firebase Presence class implementation
class FirebasePresence {
  private channelName: string;
  private presenceRef: { set: (data: unknown) => Promise<void>; onDisconnect: () => { set: (data: null) => Promise<void> } } | null;

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  async track(user: PresenceUser) {
    // Implement presence tracking using Firestore
    const { getFirebaseDb } = await import('@/integrations/firebase/app');
    const { doc, setDoc } = await import('firebase/firestore');

    this.presenceRef = doc(db, 'presence', this.channelName, 'users', user.userId);
    await setDoc(this.presenceRef, {
      ...user,
      lastSeen: new Date().toISOString(),
    });
  }

  subscribe(callback: (state: PresenceState) => void) {
    // Implement presence subscription
    // This would use Firestore onSnapshot in a real implementation
    callback({ onlineUsers: [], isConnected: true });
  }

  unsubscribePresence() {
    // Cleanup
  }

  untrack() {
    // Remove presence tracking
  }
}

export function useOnlineUsers(channelName: string = 'online-users') {
  const [state, setState] = useState<PresenceState>({
    onlineUsers: [],
    isConnected: false,
  });

  const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null);

  useEffect(() => {
    let mounted = true;
    let presence: FirebasePresence | null = null;

    const setupPresence = async () => {
      try {
        // Obter usuário atual do Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser || !mounted) {
            setCurrentUser(null);
            return;
          }

          // Buscar perfil e role
          const profileRef = doc(db, 'profiles', firebaseUser.uid);
          const profileSnap = await getDoc(profileRef);

          // Buscar role
          const roleRef = doc(db, 'user_roles', firebaseUser.uid);
          const roleSnap = await getDoc(roleRef);

          const role = roleSnap.data()?.role || 'paciente';
          const userName = profileSnap.data()?.full_name || firebaseUser.email || 'Usuário';

          const user: PresenceUser = {
            userId: firebaseUser.uid,
            userName,
            role,
            joinedAt: new Date(),
            lastSeen: new Date(),
          };

          if (!mounted) return;

          setCurrentUser(user);

          logger.info('Configurando Firebase Presence', { userId: user.userId, userName, role }, 'useOnlineUsers');

          // Criar gerenciador de presença
          presence = new FirebasePresence(channelName);

          // Rastrear presença do usuário atual (falha silenciosa se regras Firestore negarem)
          try {
            await presence.track(user);
          } catch (err) {
            const code = (err as { code?: string })?.code;
            if (code === 'permission-denied' || (err as Error)?.message?.includes('permission')) {
              logger.warn('Presence: escrita em Firestore não permitida pelas regras (ignorando)', { userId: user.userId }, 'useOnlineUsers');
            } else {
              logger.error('Erro ao rastrear presença', err, 'useOnlineUsers');
            }
          }

          // Inscrever em mudanças de presença
          presence.subscribe((newState) => {
            if (mounted) {
              logger.info('Usuários online atualizados', { count: newState.onlineUsers.length }, 'useOnlineUsers');
              setState(newState);
            }
          });
        });

        return () => unsubscribe();
      } catch (error) {
        logger.error('Erro ao configurar Firebase Presence', error, 'useOnlineUsers');
        setState({ onlineUsers: [], isConnected: false });
      }
    };

    setupPresence();

    // Cleanup
    return () => {
      mounted = false;
      if (presence) {
        logger.info('Removendo Firebase Presence', { channelName }, 'useOnlineUsers');
        presence.unsubscribePresence();
        presence.untrack();
      }
    };
  }, [channelName]);

  return {
    onlineUsers: state.onlineUsers,
    isConnected: state.isConnected,
    onlineCount: state.onlineUsers.length,
  };
}

export function usePresence(channelName: string) {
  return useOnlineUsers(channelName);
}

export function useGlobalPresence() {
  return useOnlineUsers('global-online-users');
}
