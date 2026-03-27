import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useProtocols } from '@/hooks/useProtocols';
import { fetchApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components';

type Tab = 'protocols' | 'tests';

const PROTOCOL_CATEGORIES = ['all', 'pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional', 'neurologico', 'respiratorio'];
const CATEGORY_LABELS: Record<string, string> = {
  all: 'Todos', pos_operatorio: 'Pós-Op', patologia: 'Patologia',
  preventivo: 'Preventivo', esportivo: 'Esportivo', funcional: 'Funcional',
  neurologico: 'Neurológico', respiratorio: 'Respiratório',
};

const TEST_SCALE_LABELS: Record<string, string> = {
  VAS: 'Dor (VAS)', PSFS: 'Func. Específica', DASH: 'DASH', OSWESTRY: 'Oswestry',
  NDI: 'Dor Cervical', LEFS: 'LEFS', BERG: 'Equilíbrio (Berg)',
};

function useClinicalTests() {
  return useQuery({
    queryKey: ['clinical-tests-summary'],
    queryFn: async () => {
      const res = await fetchApi<any>('/api/standardized-tests', { params: { limit: 100 } });
      return (res.data || []) as any[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export default function ProtocolsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium } = useHaptics();
  const { protocols, isLoading, refetch } = useProtocols();
  const { data: tests = [], isLoading: isLoadingTests, refetch: refetchTests } = useClinicalTests();

  const [activeTab, setActiveTab] = useState<Tab>('protocols');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const onRefresh = async () => {
    setRefreshing(true);
    light();
    await Promise.all([refetch(), refetchTests()]);
    setRefreshing(false);
  };

  const filteredProtocols = protocols.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.condition || '').toLowerCase().includes(q);
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const filteredTests = tests.filter(t => {
    const q = searchQuery.toLowerCase();
    return !q ||
      (t.test_name || '').toLowerCase().includes(q) ||
      (t.scale_name || '').toLowerCase().includes(q) ||
      (t.patient_name || '').toLowerCase().includes(q);
  });

  const evidenceColor = (level: string) => {
    if (level === 'A') return '#10B981';
    if (level === 'B') return '#3B82F6';
    if (level === 'C') return '#F59E0B';
    return colors.textMuted;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Biblioteca Clínica</Text>
        {activeTab === 'protocols' && (
          <TouchableOpacity onPress={() => { medium(); router.push('/protocol-form' as any); }} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        {activeTab === 'tests' && <View style={{ width: 40 }} />}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'protocols' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => { setActiveTab('protocols'); setSearchQuery(''); }}
        >
          <Ionicons name="clipboard-outline" size={18} color={activeTab === 'protocols' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'protocols' ? colors.primary : colors.textMuted }]}>
            Protocolos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tests' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => { setActiveTab('tests'); setSearchQuery(''); }}
        >
          <Ionicons name="analytics-outline" size={18} color={activeTab === 'tests' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'tests' ? colors.primary : colors.textMuted }]}>
            Testes Clínicos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={activeTab === 'protocols' ? 'Buscar protocolos...' : 'Buscar testes clínicos...'}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter — only for protocols tab */}
      {activeTab === 'protocols' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesContent}>
          {PROTOCOL_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, { backgroundColor: selectedCategory === cat ? colors.primary : colors.surface, borderColor: colors.border }]}
              onPress={() => { light(); setSelectedCategory(cat); }}
            >
              <Text style={[styles.categoryChipText, { color: selectedCategory === cat ? '#fff' : colors.text }]}>
                {CATEGORY_LABELS[cat] ?? cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {activeTab === 'protocols' ? (
        isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando protocolos...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProtocols}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {searchQuery ? 'Nenhum protocolo encontrado' : 'Nenhum protocolo disponível'}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  {searchQuery ? 'Tente outro termo' : 'Crie o primeiro protocolo de tratamento'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={() => { medium(); router.push('/protocol-form' as any); }}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.emptyButtonText}>Criar Protocolo</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item: protocol }) => (
              <TouchableOpacity onPress={() => { light(); router.push(`/protocol-detail?protocolId=${protocol.id}` as any); }}>
                <Card style={styles.protocolCard}>
                  <View style={styles.protocolHeader}>
                    <View style={styles.protocolInfo}>
                      <Text style={[styles.protocolName, { color: colors.text }]}>{protocol.name}</Text>
                      <Text style={[styles.protocolDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {protocol.description}
                      </Text>
                    </View>
                    {protocol.evidenceLevel && (
                      <View style={[styles.evidenceBadge, { backgroundColor: evidenceColor(protocol.evidenceLevel) + '20' }]}>
                        <Text style={[styles.evidenceBadgeText, { color: evidenceColor(protocol.evidenceLevel) }]}>
                          Nível {protocol.evidenceLevel}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.protocolMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="folder-outline" size={14} color={colors.primary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {CATEGORY_LABELS[protocol.category] ?? protocol.category}
                      </Text>
                    </View>
                    {protocol.condition && (
                      <View style={styles.metaItem}>
                        <Ionicons name="medical-outline" size={14} color={colors.primary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {protocol.condition}
                        </Text>
                      </View>
                    )}
                    {protocol.duration && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.primary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>{protocol.duration}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.protocolFooter}>
                    <TouchableOpacity
                      style={[styles.applyButton, { backgroundColor: colors.primary }]}
                      onPress={(e) => { e.stopPropagation(); medium(); router.push(`/apply-protocol?protocolId=${protocol.id}` as any); }}
                    >
                      <Ionicons name="person-add" size={14} color="#fff" />
                      <Text style={styles.applyButtonText}>Aplicar</Text>
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        /* Testes Clínicos Tab */
        isLoadingTests ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando testes...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTests}
            keyExtractor={(item, idx) => item.id ?? String(idx)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListHeaderComponent={
              <View style={styles.scalesHeader}>
                <Text style={[styles.scalesTitle, { color: colors.textSecondary }]}>
                  Escalas disponíveis: VAS · PSFS · DASH · Oswestry · NDI · LEFS · Berg
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="analytics-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>Nenhum teste aplicado</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Aplique escalas clínicas pela tela do paciente
                </Text>
              </View>
            }
            renderItem={({ item: test }) => {
              const scaleName = test.scale_name || test.test_type?.toUpperCase() || 'TESTE';
              const score = test.total_score ?? test.score ?? null;
              return (
                <Card style={styles.testCard}>
                  <View style={styles.testHeader}>
                    <View style={[styles.scaleTag, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.scaleTagText, { color: colors.primary }]}>{scaleName}</Text>
                    </View>
                    {score !== null && (
                      <View style={[styles.scoreBadge, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.scoreText, { color: colors.text }]}>{score} pts</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.testName, { color: colors.text }]}>
                    {test.test_name || TEST_SCALE_LABELS[scaleName] || scaleName}
                  </Text>
                  <View style={styles.testMeta}>
                    {test.patient_name && (
                      <View style={styles.metaItem}>
                        <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>{test.patient_name}</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {test.applied_at ? new Date(test.applied_at).toLocaleDateString('pt-BR') : '—'}
                      </Text>
                    </View>
                  </View>
                  {test.interpretation && (
                    <Text style={[styles.interpretation, { color: colors.textSecondary }]} numberOfLines={2}>
                      {test.interpretation}
                    </Text>
                  )}
                </Card>
              );
            }}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  addButton: { padding: 8, width: 40, alignItems: 'flex-end' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 15 },
  categoriesScroll: { maxHeight: 48 },
  categoriesContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 17, fontWeight: '600' },
  emptySubtext: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8, marginTop: 8 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Protocol card
  protocolCard: { padding: 14, gap: 10 },
  protocolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  protocolInfo: { flex: 1, gap: 4 },
  protocolName: { fontSize: 15, fontWeight: '700' },
  protocolDescription: { fontSize: 13, lineHeight: 18 },
  evidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  evidenceBadgeText: { fontSize: 11, fontWeight: '700' },
  protocolMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  protocolFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  applyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 5 },
  applyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // Test card
  scalesHeader: { marginBottom: 8 },
  scalesTitle: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  testCard: { padding: 14, gap: 8 },
  testHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scaleTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scaleTagText: { fontSize: 12, fontWeight: '700' },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 'auto' as any },
  scoreText: { fontSize: 13, fontWeight: '600' },
  testName: { fontSize: 15, fontWeight: '600' },
  testMeta: { flexDirection: 'row', gap: 12 },
  interpretation: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
});
