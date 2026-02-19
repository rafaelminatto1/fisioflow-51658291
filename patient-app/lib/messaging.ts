/**
 * Messaging System
 *
 * Sistema de mensagens entre paciente e profissional usando Firestore
 * com suporte a real-time, anexos e sincronização offline.
 *
 * @module lib/messaging
 */

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

/**
 * Tipos de mensagens
 */
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

/**
 * Status de mensagens
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Estrutura de uma mensagem
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  type: MessageType;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: MessageStatus;
  createdAt: any; // Firestore Timestamp
  readAt?: any;
  deletedFor?: string[]; // IDs de usuários que deletaram a mensagem
}

/**
 * Estrutura de uma conversa
 */
export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: { [key: string]: string };
  participantAvatars: { [key: string]: string };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: any;
  };
  unreadCount: { [key: string]: number };
  createdAt: any;
  updatedAt: any;
}

/**
 * Callbacks para eventos de mensagens
 */
export interface MessagingCallbacks {
  onNewMessage?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onError?: (error: Error) => void;
}

/**
 * Classe gerenciadora de mensagens
 */
export class MessagingManager {
  private userId: string;
  private unsubscribeMessages: Map<string, () => void> = new Map();
  private unsubscribeConversations: (() => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Busca conversas do usuário
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', this.userId),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const conversations: Conversation[] = [];

      snapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data(),
        } as Conversation);
      });

      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Escuta atualizações de conversas em tempo real
   */
  subscribeToConversations(callbacks: MessagingCallbacks): void {
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', this.userId),
      orderBy('updatedAt', 'desc')
    );

    this.unsubscribeConversations = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const conversation = {
              id: change.doc.id,
              ...change.doc.data(),
            } as Conversation;
            callbacks.onConversationUpdated?.(conversation);
          }
        });
      },
      (error) => {
        callbacks.onError?.(error as Error);
      }
    );
  }

  /**
   * Para de escutar conversas
   */
  unsubscribeFromConversations(): void {
    if (this.unsubscribeConversations) {
      this.unsubscribeConversations();
      this.unsubscribeConversations = null;
    }
  }

  /**
   * Busca mensagens de uma conversa
   */
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    try {
      const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit ? where('createdAt', '>=', limit) : null
      );

      const snapshot = await getDocs(q);
      const messages: Message[] = [];

      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        } as Message);
      });

      return messages.reverse();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Escuta mensagens de uma conversa em tempo real
   */
  subscribeToMessages(conversationId: string, callbacks: MessagingCallbacks): void {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const message = {
              id: change.doc.id,
              ...change.doc.data(),
            } as Message;
            callbacks.onNewMessage?.(message);

            // Marcar como lido se não foi eu quem enviou
            if (message.recipientId === this.userId && !message.readAt) {
              this.markMessageAsRead(conversationId, message.id);
            }
          } else if (change.type === 'modified') {
            const message = {
              id: change.doc.id,
              ...change.doc.data(),
            } as Message;
            callbacks.onMessageUpdated?.(message);
          }
        });
      },
      (error) => {
        callbacks.onError?.(error as Error);
      }
    );

    this.unsubscribeMessages.set(conversationId, unsubscribe);
  }

  /**
   * Para de escutar mensagens de uma conversa
   */
  unsubscribeFromMessages(conversationId: string): void {
    const unsubscribe = this.unsubscribeMessages.get(conversationId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribeMessages.delete(conversationId);
    }
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendMessage(conversationId: string, content: string): Promise<Message | null> {
    try {
      // Buscar conversa para obter recipientId
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (!conversationSnap.exists()) {
        throw new Error('Conversa não encontrada');
      }

      const conversation = conversationSnap.data();
      const recipientId = conversation.participantIds.find((id: string) => id !== this.userId);

      if (!recipientId) {
        throw new Error('Destinatário não encontrado');
      }

      // Adicionar mensagem
      const messageRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: this.userId,
        recipientId,
        type: 'text',
        content,
        status: 'sending',
        createdAt: serverTimestamp(),
      });

      const message: Message = {
        id: messageRef.id,
        conversationId,
        senderId: this.userId,
        recipientId,
        type: 'text',
        content,
        status: 'sent',
        createdAt: new Date(),
      };

      // Atualizar lastMessage da conversa
      await updateDoc(conversationRef, {
        lastMessage: {
          content,
          senderId: this.userId,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Envia uma mensagem com anexo (imagem, vídeo, documento)
   */
  async sendMessageWithAttachment(
    conversationId: string,
    type: MessageType,
    content: string,
    fileUri: string,
    fileName: string
  ): Promise<Message | null> {
    try {
      // Upload do arquivo
      const attachmentUrl = await this.uploadAttachment(conversationId, fileUri, fileName);

      // Buscar conversa
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (!conversationSnap.exists()) {
        throw new Error('Conversa não encontrada');
      }

      const conversation = conversationSnap.data();
      const recipientId = conversation.participantIds.find((id: string) => id !== this.userId);

      // Adicionar mensagem
      const messageRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: this.userId,
        recipientId,
        type,
        content,
        attachmentUrl,
        attachmentName: fileName,
        status: 'sending',
        createdAt: serverTimestamp(),
      });

      // Atualizar conversa
      await updateDoc(conversationRef, {
        lastMessage: {
          content: type === 'image' ? '📷 Foto' : type === 'video' ? '🎥 Vídeo' : '📎 Arquivo',
          senderId: this.userId,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      return {
        id: messageRef.id,
        conversationId,
        senderId: this.userId,
        recipientId,
        type,
        content,
        attachmentUrl,
        attachmentName: fileName,
        status: 'sent',
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error sending message with attachment:', error);
      return null;
    }
  }

  /**
   * Faz upload de um anexo
   */
  private async uploadAttachment(
    conversationId: string,
    fileUri: string,
    fileName: string
  ): Promise<string> {
    try {
      // Converter URI para blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Upload para Firebase Storage
      const storageRef = ref(
        storage,
        `conversations/${conversationId}/${Date.now()}_${fileName}`
      );

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      return downloadUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  /**
   * Marca uma mensagem como lida
   */
  async markMessageAsRead(conversationId: string, messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      await updateDoc(messageRef, {
        readAt: serverTimestamp(),
        status: 'read',
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  /**
   * Marca todas as mensagens de uma conversa como lidas
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);

      // Buscar mensagens não lidas
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef,
        where('recipientId', '==', this.userId),
        where('readAt', '==', null)
      );

      const snapshot = await getDocs(q);

      // Marcar cada mensagem como lida
      const updates = snapshot.docs.map((doc) =>
        updateDoc(doc.ref, {
          readAt: serverTimestamp(),
          status: 'read',
        })
      );

      await Promise.all(updates);

      // Resetar contador de não lidos
      await updateDoc(conversationRef, {
        [`unreadCount.${this.userId}`]: 0,
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }

  /**
   * Cria uma nova conversa
   */
  async createConversation(
    otherParticipantId: string,
    otherParticipantName: string
  ): Promise<string | null> {
    try {
      const conversationRef = await addDoc(collection(db, 'conversations'), {
        participantIds: [this.userId, otherParticipantId],
        participantNames: {
          [this.userId]: '', // Será preenchido pelo backend
          [otherParticipantId]: otherParticipantName,
        },
        unreadCount: {
          [this.userId]: 0,
          [otherParticipantId]: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return conversationRef.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  /**
   * Deleta uma mensagem para o usuário atual
   */
  async deleteMessageForMe(conversationId: string, messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        return;
      }

      const message = messageSnap.data();
      const deletedFor = message.deletedFor || [];

      await updateDoc(messageRef, {
        deletedFor: [...deletedFor, this.userId],
      });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  /**
   * Limpa todos os listeners
   */
  cleanup(): void {
    this.unsubscribeFromConversations();
    this.unsubscribeMessages.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeMessages.clear();
  }
}

/**
 * Hook React para usar o sistema de mensagens
 */
export function useMessaging(userId: string) {
  const [manager] = useState(() => new MessagingManager(userId));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    manager.subscribeToConversations({
      onConversationUpdated: (conversation) => {
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === conversation.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = conversation;
            return updated;
          }
          return [...prev, conversation];
        });
      },
      onError: (error) => {
        console.error('Messaging error:', error);
      },
    });

    return () => {
      manager.cleanup();
    };
  }, [manager]);

  const getConversationMessages = async (conversationId: string) => {
    const msgs = await manager.getMessages(conversationId);
    setMessages((prev) => new Map(prev).set(conversationId, msgs));
    return msgs;
  };

  const subscribeToConversation = (conversationId: string) => {
    manager.subscribeToMessages(conversationId, {
      onNewMessage: (message) => {
        setMessages((prev) => {
          const conversationMsgs = prev.get(conversationId) || [];
          return new Map(prev).set(conversationId, [...conversationMsgs, message]);
        });
      },
      onMessageUpdated: (message) => {
        setMessages((prev) => {
          const conversationMsgs = prev.get(conversationId) || [];
          const index = conversationMsgs.findIndex((m) => m.id === message.id);
          if (index >= 0) {
            const updated = [...conversationMsgs];
            updated[index] = message;
            return new Map(prev).set(conversationId, updated);
          }
          return prev;
        });
      },
    });
  };

  return {
    manager,
    conversations,
    messages,
    loading,
    getConversationMessages,
    subscribeToConversation,
  };
}

export default MessagingManager;
