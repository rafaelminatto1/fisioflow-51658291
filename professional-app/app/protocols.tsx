import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useProtocols } from '@/hooks/useProtocols';
import { Card } from '@/components';

export default function ProtocolsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium } = useHaptics();
  const { protocols, isLoading, refetch } = useProtocols();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Ortopedia', 'Coluna', 'Neurologia', 'Cardio', 'Respiratória', 'Pediátrica'];

  const onRefresh = async () => {
    setRefreshing(true);
    light();
    await refetch();
    setRefreshing(false);
  };

  const filteredProtocols = protocols.filter(protocol => {
    const matchesSearch = protocol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         protocol.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         protocol.condition?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || protocol.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Protocolos</Text>
        <TouchableOpacity
          onPress={() => {
            medium();
            router.push('/protocol-form' as any);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar protocolos..."
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

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === category ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              light();
              setSelectedCategory(category);
            }}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: selectedCategory === category ? '#fff' : colors.text },
              ]}
            >
              {category === 'all' ? 'Todos' : category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Protocols List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando protocolos...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredProtocols.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {searchQuery ? 'Nenhum protocolo encontrado' : 'Nenhum protocolo criado'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {searchQuery ? 'Tente buscar por outro termo' : 'Crie seu primeiro protocolo de tratamento'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  medium();
                  router.push('/protocol-form' as any);
                }}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Criar Protocolo</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredProtocols.map((protocol) => (
            <TouchableOpacity
              key={protocol.id}
              onPress={() => {
                light();
                router.push(`/protocol-detail?protocolId=${protocol.id}` as any);
              }}
            >
              <Card style={styles.protocolCard}>
                <View style={styles.protocolHeader}>
                  <View style={styles.protocolInfo}>
                    <Text style={[styles.protocolName, { color: colors.text }]}>
                      {protocol.name}
                    </Text>
                    <Text style={[styles.protocolDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {protocol.description}
                    </Text>
                  </View>
                  {protocol.isTemplate && (
                    <View style={[styles.templateBadge, { backgroundColor: colors.infoLight }]}>
                      <Ionicons name="bookmark" size={12} color={colors.info} />
                      <Text style={[styles.templateBadgeText, { color: colors.info }]}>Template</Text>
                    </View>
                  )}
                </View>

                <View style={styles.protocolMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="folder-outline" size={16} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {protocol.category}
                    </Text>
                  </View>
                  {protocol.condition && (
                    <View style={styles.metaItem}>
                      <Ionicons name="medical-outline" size={16} color={colors.primary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {protocol.condition}
                      </Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="fitness-outline" size={16} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {protocol.exercises.length} exercícios
                    </Text>
                  </View>
                </View>

                <View style={styles.protocolFooter}>
                  <TouchableOpacity
                    style={[styles.applyButton, { backgroundColor: colors.primary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      medium();
                      router.push(`/apply-protocol?protocolId=${protocol.id}` as any);
                    }}
                  >
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={styles.applyButtonText}>Aplicar a Paciente</Text>
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesScroll: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  protocolCard: {
    padding: 16,
    gap: 12,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  protocolInfo: {
    flex: 1,
    gap: 4,
  },
  protocolName: {
    fontSize: 16,
    fontWeight: '600',
  },
  protocolDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  templateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  protocolMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  protocolFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
