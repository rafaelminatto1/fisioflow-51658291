import { useState, useCallback, useMemo } from 'react';

  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ExerciseCard } from '@/components/ui/ExerciseCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { useExercises } from '@/hooks/useExercises';
import { HapticFeedback } from '@/lib/haptics';
import type { Exercise } from '@/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

type ExerciseCategory = 'all' | 'Mobilidade' | 'Fortalecimento' | 'Alongamento' | 'Funcional' | 'Core';
type BodyPart = 'all' | 'Coluna' | 'Ombro' | 'Quadril' | 'Joelho' | 'Tornozelo' | 'Mão' | 'Pescoço';

const CATEGORIES: { value: ExerciseCategory; label: string; icon: string }[] = [
  { value: 'all', label: 'Todos', icon: 'dumbbell' },
  { value: 'Mobilidade', label: 'Mobilidade', icon: 'move' },
  { value: 'Fortalecimento', label: 'Fortalecimento', icon: 'zap' },
  { value: 'Alongamento', label: 'Alongamento', icon: 'stretch-horizontal' },
  { value: 'Funcional', label: 'Funcional', icon: 'activity' },
  { value: 'Core', label: 'Core', icon: 'target' },
];

const BODY_PARTS: { value: BodyPart; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Coluna', label: 'Coluna' },
  { value: 'Ombro', label: 'Ombro' },
  { value: 'Quadril', label: 'Quadril' },
  { value: 'Joelho', label: 'Joelho' },
  { value: 'Tornozelo', label: 'Tornozelo' },
  { value: 'Mão', label: 'Mão' },
  { value: 'Pescoço', label: 'Pescoço' },
];

const DIFFICULTIES = [
  { value: 'all', label: 'Todos' },
  { value: 'Fácil', label: 'Fácil' },
  { value: 'Médio', label: 'Médio' },
  { value: 'Difícil', label: 'Difícil' },
];

export default function ExercisesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: exercises, isLoading, refetch } = useExercises();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory>('all');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter exercises
  const filteredExercises = useMemo(() => {
    let filtered = exercises || [];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name?.toLowerCase().includes(query) ||
        ex.description?.toLowerCase().includes(query) ||
        ex.category?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    // Body part filter
    if (selectedBodyPart !== 'all') {
      filtered = filtered.filter(ex => ex.body_parts?.includes(selectedBodyPart));
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty);
    }

    return filtered;
  }, [exercises, searchQuery, selectedCategory, selectedBodyPart, selectedDifficulty]);

  const handleExercisePress = useCallback((exerciseId: string) => {
    HapticFeedback.light();
    router.push(`/exercises/${exerciseId}`);
  }, [router]);

  const handleCreatePlan = useCallback(() => {
    HapticFeedback.light();
    router.push('/exercise-plans/new');
  }, [router]);

  const handleViewTemplate = useCallback(() => {
    HapticFeedback.light();
    router.push('/exercise-templates');
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Exercícios</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                HapticFeedback.selection();
                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
              }}
              style={[styles.iconButton, { backgroundColor: colors.card }]}
            >
              <Icon
                name={viewMode === 'grid' ? 'list' : 'grid'}
                size={20}
                color={colors.text}
              />
            </Pressable>
            <Pressable
              onPress={handleViewTemplate}
              style={[styles.iconButton, { backgroundColor: colors.card }]}
            >
              <Icon name="layout-template" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar exercício..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="x-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.value}
              onPress={() => {
                HapticFeedback.selection();
                setSelectedCategory(category.value);
              }}
              style={({ pressed }) => [
                styles.categoryPill,
                {
                  backgroundColor: selectedCategory === category.value ? colors.primary : colors.card,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Icon
                name={category.icon}
                size={16}
                color={selectedCategory === category.value ? '#fff' : colors.text}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  { color: selectedCategory === category.value ? '#fff' : colors.text },
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Filters Row */}
        <View style={styles.filtersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {/* Body Part Filter */}
            <View style={[styles.filterSelect, { backgroundColor: colors.card }]}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Região:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {BODY_PARTS.map((part) => (
                  <Pressable
                    key={part.value}
                    onPress={() => {
                      HapticFeedback.selection();
                      setSelectedBodyPart(part.value);
                    }}
                    style={({ pressed }) => [
                      styles.filterOption,
                      {
                        backgroundColor: selectedBodyPart === part.value ? colors.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: selectedBodyPart === part.value ? '#fff' : colors.text },
                      ]}
                    >
                      {part.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Difficulty Filter */}
            <View style={[styles.filterSelect, { backgroundColor: colors.card }]}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Nível:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DIFFICULTIES.map((diff) => (
                  <Pressable
                    key={diff.value}
                    onPress={() => {
                      HapticFeedback.selection();
                      setSelectedDifficulty(diff.value);
                    }}
                    style={({ pressed }) => [
                      styles.filterOption,
                      {
                        backgroundColor: selectedDifficulty === diff.value ? colors.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: selectedDifficulty === diff.value ? '#fff' : colors.text },
                      ]}
                    >
                      {diff.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Results Count */}
      <View style={[styles.resultsBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
          {filteredExercises.length} exercício{filteredExercises.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Exercises List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        ) : filteredExercises.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="Nenhum exercício encontrado"
            message="Tente ajustar os filtros ou buscar outro termo"
          />
        ) : (
          <View style={viewMode === 'grid' ? styles.exercisesGrid : styles.exercisesList}>
            {filteredExercises.map((exercise, index) => (
              <Animated.View
                key={exercise.id}
                entering={FadeIn.delay(index * 30)}
              >
                <ExerciseCard
                  exercise={exercise}
                  onPress={() => handleExercisePress(exercise.id)}
                  style={viewMode === 'grid' ? styles.gridCard : styles.listCard}
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
        onPress={handleCreatePlan}
        hitSlop={16}
      >
        <Icon name="plus" size={24} color="#fff" />
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  categoriesScroll: {
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersRow: {
    gap: 8,
  },
  filterScroll: {
    gap: 8,
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: CARD_WIDTH,
    margin: 0,
  },
  exercisesList: {
    gap: 12,
  },
  listCard: {
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
