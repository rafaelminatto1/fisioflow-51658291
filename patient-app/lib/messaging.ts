import { useEffect, useState } from 'react';
import { log } from '@/lib/logger';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

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
  createdAt: string | Date | null;
  readAt?: string | Date | null;
  deletedFor?: string[];
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantAvatars: Record<string, string>;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string | Date | null;
  };
  unreadCount: Record<string, number>;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface MessagingCallbacks {
  onNewMessage?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onError?: (error: Error) => void;
}

export const MESSAGING_UNAVAILABLE_REASON =
  'Chat em migracao para o backend Cloudflare. Este fluxo ainda nao possui endpoint dedicado no portal do paciente.';

export class MessagingManager {
  constructor(private readonly userId: string) {}

  isAvailable(): boolean {
    return false;
  }

  getUnavailableReason(): string {
    return MESSAGING_UNAVAILABLE_REASON;
  }

  async getConversations(): Promise<Conversation[]> {
    return [];
  }

  subscribeToConversations(_callbacks: MessagingCallbacks): void {}

  unsubscribeFromConversations(): void {}

  async getMessages(_conversationId: string, _limit = 50): Promise<Message[]> {
    return [];
  }

  subscribeToMessages(_conversationId: string, _callbacks: MessagingCallbacks): void {}

  unsubscribeFromMessages(_conversationId: string): void {}

  async sendMessage(_conversationId: string, _content: string): Promise<Message | null> {
    log.warn('MESSAGING', `Blocked legacy chat send for user ${this.userId}`);
    return null;
  }

  async sendMessageWithAttachment(
    _conversationId: string,
    _type: MessageType,
    _content: string,
    _fileUri: string,
    _fileName: string,
  ): Promise<Message | null> {
    log.warn('MESSAGING', `Blocked legacy chat attachment for user ${this.userId}`);
    return null;
  }

  async markMessageAsRead(_conversationId: string, _messageId: string): Promise<void> {}

  async markConversationAsRead(_conversationId: string): Promise<void> {}

  async createConversation(_otherParticipantId: string, _otherParticipantName: string): Promise<string | null> {
    return null;
  }

  async deleteMessageForMe(_conversationId: string, _messageId: string): Promise<void> {}

  cleanup(): void {}
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
