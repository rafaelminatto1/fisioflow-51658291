import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useExercises } from '@/hooks/useExercises';
import { Card } from './Card';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';

export interface ExerciseSelectorProps {
  onSelect: (exercise: any) => void;
  exclude?: string[];
}

export function ExerciseSelector({ onSelect, exclude = [] }: ExerciseSelectorProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: exercises, isLoading } = useExercises();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredExercises = exercises?.filter(ex =>
    !exclude.includes(ex.id) &&
    (selectedCategory === 'all' || ex.category === selectedCategory) &&
    (!debouncedSearch ||
      ex.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      ex.description?.toLowerCase().includes(debouncedSearch.toLowerCase()))
  ) || [];

  const categories = ['all', ...Array.from(new Set(exercises?.map(e => e.category).filter(Boolean) || []))];

  const handleSelect = (exercise: any) => {
    HapticFeedback.selection();
    onSelect(exercise);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar exercício..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="words"
        />
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={({ pressed }) => [
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === category ? colors.primary : colors.card,
                borderColor: selectedCategory === category ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === category ? '#fff' : colors.text },
              ]}
            >
              {category === 'all' ? 'Todos' : category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Exercise List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredExercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="dumbbell" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum exercício encontrado
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filteredExercises.map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => handleSelect(exercise)}
              style={({ pressed }) => [
                styles.exerciseItem,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {exercise.image_url || exercise.video_url ? (
                <Image
                  source={{ uri: exercise.image_url || exercise.video_url }}
                  style={styles.exerciseImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.exerciseImage, styles.exerciseImagePlaceholder]}>
                  <Icon name="dumbbell" size={32} color={colors.textSecondary} />
                </View>
              )}

              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
                  {exercise.name}
                </Text>
                <View style={styles.exerciseMeta}>
                  {exercise.category && (
                    <Text style={[styles.exerciseCategory, { color: colors.primary }]}>
                      {exercise.category}
                    </Text>
                  )}
                  {exercise.difficulty && (
                    <Text style={[styles.exerciseDifficulty, { color: colors.textSecondary }]}>
                      {exercise.difficulty}
                    </Text>
                  )}
                </View>
                {exercise.description && (
                  <Text style={[styles.exerciseDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {exercise.description}
                  </Text>
                )}
              </View>

              <Icon name="check-circle" size={24} color={colors.success} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesScroll: {
    gap: 10,
    paddingHorizontal: 2,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exerciseImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  exerciseImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseDifficulty: {
    fontSize: 12,
  },
  exerciseDescription: {
    fontSize: 13,
  },
});
