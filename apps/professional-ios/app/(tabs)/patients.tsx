import { useState, useCallback, useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PatientCard } from '@/components/ui/PatientCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { usePatients } from '@/hooks/usePatients';
import { HapticFeedback } from '@/lib/haptics';

type PatientStatus = 'all' | 'Em Tratamento' | 'Recuperação' | 'Inicial' | 'Concluído';
type SortOption = 'name' | 'recent' | 'progress';

const getStatusFilters = (colors: any) => [
  { value: 'all' as const, label: 'Todos', color: '#6b7280' },
  { value: 'Em Tratamento' as const, label: 'Em Tratamento', color: colors.primary },
  { value: 'Recuperação' as const, label: 'Recuperação', color: colors.warning },
  { value: 'Inicial' as const, label: 'Inicial', color: colors.notification },
  { value: 'Concluído' as const, label: 'Concluído', color: '#22c55e' },
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'name', label: 'Nome', icon: 'arrow-up-a-z' },
  { value: 'recent', label: 'Recentes', icon: 'clock' },
  { value: 'progress', label: 'Progresso', icon: 'trending-up' },
];

export default function PatientsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: patients, isLoading, refetch } = usePatients();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let filtered = patients || [];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name?.localeCompare(b.name || '', 'pt-BR') || 0;
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [patients, statusFilter, searchQuery, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const allPatients = patients || [];
    return {
      total: allPatients.length,
      inTreatment: allPatients.filter(p => p.status === 'Em Tratamento').length,
      newThisMonth: allPatients.filter(p => {
        const created = new Date(p.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
      avgProgress: Math.round(
        allPatients.reduce((sum, p) => sum + (p.progress || 0), 0) / (allPatients.length || 1)
      ),
    };
  }, [patients]);

  const handlePatientPress = useCallback((patientId: string) => {
    HapticFeedback.light();
    router.push(`/patients/${patientId}`);
  }, [router]);

  const handleNewPatient = useCallback(() => {
    HapticFeedback.light();
    router.push('/patients/new');
  }, [router]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSortChange = useCallback((option: SortOption) => {
    HapticFeedback.selection();
    setSortBy(option);
    setShowSortMenu(false);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Pacientes</Text>
          <Button
            variant="primary"
            size="sm"
            onPress={handleNewPatient}
            leftIcon={<Icon name="user-plus" size={18} color="#fff" />}
          >
            Novo
          </Button>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.inTreatment}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Em Tratamento</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.newThisMonth}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Novos</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.avgProgress}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Prog. Médio</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar paciente..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="words"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="x-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Sort & Filter */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFiltersScroll}
          >
            {getStatusFilters(colors).map((filter) => (
              <Pressable
                key={filter.value}
                onPress={() => {
                  HapticFeedback.selection();
                  setStatusFilter(filter.value);
                }}
                style={({ pressed }) => [
                  styles.statusChip,
                  {
                    backgroundColor: statusFilter === filter.value ? filter.color : colors.card,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: statusFilter === filter.value ? '#fff' : colors.text },
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={() => setShowSortMenu(!showSortMenu)}
            style={[styles.sortButton, { backgroundColor: colors.card }]}
          >
            <Icon name="arrow-up-down" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Sort Menu */}
        {showSortMenu && (
          <Animated.View
            entering={FadeIn}
            style={[styles.sortMenu, { backgroundColor: colors.card, borderTopColor: colors.border }]}
          >
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleSortChange(option.value)}
                style={({ pressed }) => [
                  styles.sortOption,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Icon
                  name={option.icon}
                  size={18}
                  color={sortBy === option.value ? colors.primary : colors.text}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: sortBy === option.value ? colors.primary : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Icon name="check" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}
      </View>

      {/* Patients List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={searchQuery ? 'search-x' : 'users'}
            title={searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            message={
              searchQuery
                ? 'Tente outros termos de busca'
                : 'Comece adicionando seu primeiro paciente'
            }
            actionLabel={searchQuery ? undefined : 'Novo Paciente'}
            onAction={searchQuery ? undefined : handleNewPatient}
          />
        ) : (
          <View style={styles.patientsList}>
            {filteredPatients.map((patient, index) => (
              <Animated.View
                key={patient.id}
                entering={FadeIn.delay(index * 50)}
              >
                <PatientCard
                  patient={patient}
                  onPress={() => handlePatientPress(patient.id)}
                  style={styles.patientCard}
                />
              </Animated.View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleNewPatient}
        hitSlop={16}
      >
        <Icon name="user-plus" size={24} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusFiltersScroll: {
    flex: 1,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortMenu: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  patientsList: {
    padding: 16,
    gap: 12,
  },
  patientCard: {
    marginHorizontal: 0,
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
