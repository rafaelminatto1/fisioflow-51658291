/**
 * Firebase Presence System
 *
 * Substituto para Supabase Realtime Presence usando Firestore.
 *
 * Implementa presença em tempo real via Firestore com:
 * - Track/untrack de usuários
 * - Sync state
 * - Auto-cleanup on disconnect
 * - Channel-based presence
 */

import React from 'react';
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  collection,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from '@fisioflow/shared-constants';

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

/**
 * Firebase Presence Manager
 *
 * Gerencia presença de usuários usando Firestore.
 *
 * Uso:
 * ```ts
 * const presence = new FirebasePresence('online-users');
 * await presence.track({ userId, userName, role });
 *
 * presence.subscribe((state) => {
 *   console.log('Online users:', state.onlineUsers);
 * });
 *
 * await presence.untrack();
 * presence.unsubscribe();
 * ```
 */
export class FirebasePresence {
  private channelName: string;
  private unsubscribe: Unsubscribe | null = null;
  private currentUserId: string | null = null;

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  /**
   * Rastreia a presença do usuário atual
   */
  async track(user: PresenceUser): Promise<void> {
    this.currentUserId = user.userId;

    const presenceRef = doc(
      db,
      COLLECTIONS.PRESENCE,
      this.channelName,
      'users',
      user.userId
    );

    await setDoc(presenceRef, {
      ...user,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });

    // Setup heartbeat para manter presença ativa
    this.startHeartbeat(user);
  }

  /**
   * Remove o rastreamento do usuário atual
   */
  async untrack(): Promise<void> {
    if (!this.currentUserId) return;

    const presenceRef = doc(
      db,
      COLLECTIONS.PRESENCE,
      this.channelName,
      'users',
      this.currentUserId
    );

    await deleteDoc(presenceRef);
    this.stopHeartbeat();
    this.currentUserId = null;
  }

  /**
   * Inscreve em mudanças de presença
   */
  subscribe(callback: (state: PresenceState) => void): void {
    const collectionRef = collection(db, COLLECTIONS.PRESENCE, this.channelName, 'users');

    this.unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const onlineUsers: PresenceUser[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          // Verificar se o usuário está "online" (última atividade < 2 min)
          const lastSeen = data.lastSeen?.toDate();
          const isOnline = lastSeen && Date.now() - lastSeen.getTime() < 120000;

          if (isOnline) {
            onlineUsers.push({
              userId: data.userId,
              userName: data.userName,
              role: data.role,
              joinedAt: data.joinedAt?.toDate() || new Date(),
              lastSeen,
            });
          }
        });

        callback({
          onlineUsers,
          isConnected: !snapshot.metadata.fromCache,
        });
      },
      (error) => {
        console.error('Error listening to presence:', error);
        callback({ onlineUsers: [], isConnected: false });
      }
    );
  }

  /**
   * Cancela inscrição
   */
  unsubscribePresence(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Inicia heartbeat para manter presença ativa
   */
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private startHeartbeat(user: PresenceUser): void {
    // Atualiza lastSeen a cada 30s
    this.heartbeatInterval = setInterval(async () => {
      if (!this.currentUserId) return;

      const presenceRef = doc(
        db,
        COLLECTIONS.PRESENCE,
        this.channelName,
        'users',
        this.currentUserId
      );

      await setDoc(
        presenceRef,
        {
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

/**
 * Hook para React - usePresence
 *
 * Uso:
 * ```ts
 * const { onlineUsers, isConnected } = usePresence('online-users', user);
 * ```
 */
export function createPresenceHook() {
  return function usePresence(channelName: string, currentUser: PresenceUser | null) {
    const [state, setState] = React.useState<PresenceState>({
      onlineUsers: [],
      isConnected: false,
    });

    React.useEffect(() => {
      if (!currentUser) return;

      const presence = new FirebasePresence(channelName);

      presence.track(currentUser);
      presence.subscribe(setState);

      return () => {
        presence.unsubscribePresence();
        presence.untrack();
      };
    }, [channelName, currentUser]);

    return state;
  };
}
