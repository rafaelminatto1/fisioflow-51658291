import { useEffect, useState } from 'react';
import { log } from '@/lib/logger';
import { messagingApi } from './api';
import type { Conversation, Message } from '@/types/api';
export type { Conversation, Message } from '@/types/api';

export type MessageType = Message['type'];
export type MessageStatus = Message['status'];

export interface MessagingCallbacks {
  onNewMessage?: (message: Message) => void;
  onConversationsUpdated?: (conversations: Conversation[]) => void;
  onError?: (error: Error) => void;
}

export class MessagingManager {
  private pollInterval: any = null;
  private callbacks: MessagingCallbacks = {};

  constructor(private readonly userId: string) {}

  isAvailable(): boolean {
    return true;
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      const data = await messagingApi.getConversations();
      return data;
    } catch (error) {
      log.error('MESSAGING', 'Failed to get conversations', error);
      return [];
    }
  }

  startPolling(conversationId: string, intervalMs = 5000) {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      try {
        const messages = await this.getMessages(conversationId);
        if (messages.length > 0 && this.callbacks.onNewMessage) {
          // This is a naive implementation; in a real app, we'd check for NEW messages
          messages.forEach(msg => this.callbacks.onNewMessage!(msg));
        }
      } catch (error) {
        log.error('MESSAGING', 'Polling failed', error);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  setCallbacks(callbacks: MessagingCallbacks) {
    this.callbacks = callbacks;
  }

  async getMessages(participantId: string, limit = 50): Promise<Message[]> {
    try {
      return await messagingApi.getMessages(participantId, limit);
    } catch (error) {
      log.error('MESSAGING', `Failed to get messages for ${participantId}`, error);
      return [];
    }
  }

  async sendMessage(recipientId: string, content: string): Promise<Message | null> {
    try {
      return await messagingApi.sendMessage({ recipientId, content });
    } catch (error) {
      log.error('MESSAGING', 'Failed to send message', error);
      return null;
    }
  }

  async sendMessageWithAttachment(
    recipientId: string,
    type: MessageType,
    content: string,
    attachmentUrl: string,
    attachmentName: string,
  ): Promise<Message | null> {
    try {
      return await messagingApi.sendMessage({ 
        recipientId, 
        content, 
        type, 
        attachmentUrl, 
        attachmentName 
      });
    } catch (error) {
      log.error('MESSAGING', 'Failed to send message with attachment', error);
      return null;
    }
  }

  async markConversationAsRead(participantId: string): Promise<void> {
    try {
      await messagingApi.markConversationRead(participantId);
    } catch (error) {
      log.error('MESSAGING', 'Failed to mark conversation as read', error);
    }
  }

  cleanup(): void {
    this.stopPolling();
  }
}

export function useMessaging(userId: string) {
  const [manager] = useState(() => new MessagingManager(userId));
  const [conversations] = useState<Conversation[]>([]);
  const [messages] = useState<Map<string, Message[]>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
    return () => {
      manager.cleanup();
    };
  }, [manager]);

  return {
    manager,
    conversations,
    messages,
    loading,
    getConversationMessages: async (_conversationId: string) => [],
    subscribeToConversation: (_conversationId: string) => {},
  };
}

export default MessagingManager;
