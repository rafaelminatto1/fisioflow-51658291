/**
 * Chat Screen with Professional
 *
 * Tela de chat entre paciente e profissional com suporte a
 * mensagens de texto, anexos e indicação de leitura.
 *
 * @module app/chat/[professionalId]
 */

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { MessagingManager, Message } from '@/lib/messaging';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

export default function ChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const professionalId = params.professionalId as string;

  const { user } = useAuthStore();
  const [manager] = useState(() => new MessagingManager(user?.id || ''));

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [professionalName, setProfessionalName] = useState('Profissional');

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (professionalId && user?.id) {
      initializeChat();
    }

    return () => {
      if (conversationId) {
        manager.unsubscribeFromMessages(conversationId);
      }
    };
  }, [professionalId, user?.id]);

  const initializeChat = async () => {
    setLoading(true);

    try {
      // Buscar ou criar conversa
      const convId = await findOrCreateConversation();
      setConversationId(convId);

      // Carregar mensagens
      if (convId) {
        const msgs = await manager.getMessages(convId);
        setMessages(msgs);

        // Marcar como lidas
        await manager.markConversationAsRead(convId);

        // Inscrever para novas mensagens
        manager.subscribeToMessages(convId, {
          onNewMessage: (message) => {
            setMessages((prev) => [...prev, message]);

            // Feedback háptico para nova mensagem
            if (message.senderId !== user?.id) {
              Haptics.NotificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Scroll para o final
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          },
          onMessageUpdated: (updatedMessage) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
            );
          },
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing chat:', error);
      setLoading(false);
    }
  };

  const findOrCreateConversation = async (): Promise<string> => {
    // Em implementação real, buscar conversa existente ou criar nova
    // Por ora, simula uma conversa
    const mockConversationId = `chat_${user?.id}_${professionalId}`;
    return mockConversationId;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversationId || sending) {
      return;
    }

    setSending(true);
    const text = inputText.trim();
    setInputText('');

    try {
      // Feedback háptico
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const message = await manager.sendMessage(conversationId, text);

      if (message) {
        setMessages((prev) => [...prev, message]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async () => {
    try {
      // Solicitar permissão
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permissão Necessária', 'Precisamos de acesso à galeria para enviar fotos.');
        return;
      }

      // Selecionar imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSending(true);
        const message = await manager.sendMessageWithAttachment(
          conversationId || '',
          'image',
          '',
          result.assets[0].uri,
          'photo.jpg'
        );

        if (message) {
          setMessages((prev) => [...prev, message]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }

        setSending(false);
      }
    } catch (error) {
      console.error('Error sending image:', error);
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.id;
    const showTime = index === 0 || messages[index - 1]?.senderId !== item.senderId;

    return (
      <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
        <View
          style={[
            styles.messageBubble,
            isOwn
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {/* Sender name for group chats (not used here but ready for future) */}
          {!isOwn && (
            <Text style={[styles.senderName, { color: colors.textSecondary }]}>
              {professionalName}
            </Text>
          )}

          {/* Text content */}
          {item.type === 'text' && (
            <Text style={[styles.messageText, { color: isOwn ? '#FFFFFF' : colors.text }]}>
              {item.content}
            </Text>
          )}

          {/* Image attachment */}
          {item.type === 'image' && item.attachmentUrl && (
            <>
              <Image
                source={{ uri: item.attachmentUrl }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
              {item.content && (
                <Text style={[styles.messageText, { color: isOwn ? '#FFFFFF' : colors.text }]}>
                  {item.content}
                </Text>
              )}
            </>
          )}

          {/* Other attachment types */}
          {(item.type === 'video' || item.type === 'document') && (
            <View style={styles.attachmentContainer}>
              <Ionicons
                name={item.type === 'video' ? 'videocam' : 'document'}
                size={32}
                color={isOwn ? '#FFFFFF' : colors.primary}
              />
              <Text style={[styles.attachmentName, { color: isOwn ? '#FFFFFF' : colors.text }]}>
                {item.attachmentName || 'Anexo'}
              </Text>
            </View>
          )}

          {/* Timestamp and status */}
          <View style={styles.messageMeta}>
            {showTime && (
              <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                {item.createdAt ? format(new Date(item.createdAt.seconds * 1000), 'HH:mm') : ''}
              </Text>
            )}
            {isOwn && (
              <View style={styles.messageStatus}>
                {item.status === 'sending' && <ActivityIndicator size={10} color="#FFFFFF" />}
                {item.status === 'sent' && <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.7)" />}
                {item.status === 'delivered' && <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" />}
                {item.status === 'read' && <Ionicons name="checkmark-done" size={14} color="#4ade80" />}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Inicie a conversa</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Envie uma mensagem para {professionalName}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {professionalName.charAt(0)}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{professionalName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Fisioterapeuta
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => Alert.alert('Opções', 'Funcionalidades em desenvolvimento')}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesContainer, messages.length === 0 && styles.emptyContainer]}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSendImage}
            style={styles.attachButton}
            disabled={sending}
          >
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!sending}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            style={[styles.sendButton, inputText.trim() ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    padding: 16,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  attachButton: {
    padding: 4,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
