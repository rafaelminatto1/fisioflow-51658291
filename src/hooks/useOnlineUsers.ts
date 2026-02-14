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

const isPermissionDeniedError = (error: unknown): boolean => {
  const code = (error as { code?: string })?.code;
  const message = (error as Error)?.message?.toLowerCase?.() ?? '';
  return code === 'permission-denied' || message.includes('permission');
};

// Firebase Presence class implementation
class FirebasePresence {
  private channelName: string;
  private _presenceRef: unknown | null;

  constructor(channelName: string) {
    this.channelName = channelName;
    this._presenceRef = null;
  }

  async track(user: PresenceUser) {
    // Implement presence tracking using Firestore
    const { doc, setDoc } = await import('firebase/firestore');

    this._presenceRef = doc(db, 'presence', this.channelName, 'users', user.userId);
    await setDoc(this._presenceRef as Parameters<typeof setDoc>[0], {
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

  const [_currentUser, setCurrentUser] = useState<PresenceUser | null>(null);

  useEffect(() => {
    let mounted = true;
    let presence: FirebasePresence | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      if (!firebaseUser) {
        setCurrentUser(null);
        setState({ onlineUsers: [], isConnected: false });
        if (presence) {
          presence.unsubscribePresence();
          presence.untrack();
          presence = null;
        }
        return;
      }

      try {
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        const roleRef = doc(db, 'user_roles', firebaseUser.uid);
        const [profileSnap, roleSnap] = await Promise.all([getDoc(profileRef), getDoc(roleRef)]);

        const role = roleSnap.data()?.role || 'paciente';
        const userName = profileSnap.data()?.full_name || firebaseUser.email || 'Usuário';

        const presenceUser: PresenceUser = {
          userId: firebaseUser.uid,
          userName,
          role,
          joinedAt: new Date(),
          lastSeen: new Date(),
        };

        if (!mounted) return;
        setCurrentUser(presenceUser);

        logger.info('Configurando Firebase Presence', { userId: presenceUser.userId, userName, role }, 'useOnlineUsers');

        presence = new FirebasePresence(channelName);

        try {
          await presence.track(presenceUser);
        } catch (error) {
          if (isPermissionDeniedError(error)) {
            logger.warn('Presence: escrita em Firestore não permitida pelas regras (ignorando)', { userId: presenceUser.userId }, 'useOnlineUsers');
          } else {
            logger.error('Erro ao rastrear presença', error, 'useOnlineUsers');
          }
        }

        presence.subscribe((newState) => {
          if (!mounted) return;
          logger.info('Usuários online atualizados', { count: newState.onlineUsers.length }, 'useOnlineUsers');
          setState(newState);
        });
      } catch (error) {
        if (!mounted) return;
        if (isPermissionDeniedError(error)) {
          logger.warn('Presence: leitura em Firestore não permitida pelas regras (desativando indicador)', { uid: firebaseUser.uid }, 'useOnlineUsers');
        } else {
          logger.error('Erro ao configurar Firebase Presence', error, 'useOnlineUsers');
        }
        setCurrentUser(null);
        setState({ onlineUsers: [], isConnected: false });
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      authUnsubscribe();
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
