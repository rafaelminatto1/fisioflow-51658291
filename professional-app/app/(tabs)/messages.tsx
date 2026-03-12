import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { Card } from '@/components';
import { getConversations, ApiConversation } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MessagesScreen() {
  const colors = useColors();
  const { light } = useHaptics();
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm');
    }
    return format(date, 'dd/MM', { locale: ptBR });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar conversa..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando conversas...</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.border }]}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conversa</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'Não encontramos conversas com este termo.' : 'Suas conversas com pacientes aparecerão aqui.'}
            </Text>
          </Card>
        ) : (
          <View style={styles.listContainer}>
            {filteredConversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                onPress={() => {
                  light();
                  router.push(`/messages/${conv.participantId}` as any);
                }}
                activeOpacity={0.7}
              >
                <Card style={styles.convCard}>
                  <View style={styles.convContent}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {conv.participantName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.convInfo}>
                      <View style={styles.convHeader}>
                        <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
                          {conv.participantName}
                        </Text>
                        <Text style={[styles.lastMessageTime, { color: colors.textMuted }]}>
                          {formatLastMessageTime(conv.lastMessageAt)}
                        </Text>
                      </View>
                      <View style={styles.convFooter}>
                        <Text 
                          style={[
                            styles.lastMessage, 
                            { color: conv.unreadCount > 0 ? colors.text : colors.textSecondary },
                            conv.unreadCount > 0 && styles.unreadText
                          ]} 
                          numberOfLines={1}
                        >
                          {conv.lastMessage || 'Nenhuma mensagem ainda'}
                        </Text>
                        {conv.unreadCount > 0 && (
                          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.unreadCount}>{conv.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 48,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
  listContainer: {
    gap: 12,
  },
  convCard: {
    padding: 12,
    borderRadius: 16,
  },
  convContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  convInfo: {
    flex: 1,
    marginLeft: 16,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 17,
    fontWeight: '600',
    maxWidth: '70%',
  },
  lastMessageTime: {
    fontSize: 12,
  },
  convFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
