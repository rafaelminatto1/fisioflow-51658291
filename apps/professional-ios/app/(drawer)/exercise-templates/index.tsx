import { useState, useCallback } from 'react';

  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import type { Exercise } from '@/types';

// Mock exercise templates - in real app would come from database
const EXERCISE_TEMPLATES: Exercise[] = [
  {
    id: '1',
    name: 'Agachamento Wall Sit',
    category: 'Fortalecimento',
    difficulty: 'Médio',
    description: 'Fortalecimento de quadríceps com isometria',
    instructions: 'Encoste as costas na parede, flexione os joelhos em 90°',
    body_parts: ['Quadril', 'Joelho'],
    sets: '3',
    reps: '30s',
    image_url: '',
  },
  {
    id: '2',
    name: 'Pontes Glúteas',
    category: 'Fortalecimento',
    difficulty: 'Fácil',
    description: 'Fortalecimento da musculatura glútea',
    instructions: 'Deitado, eleve o quadril mantendo contração',
    body_parts: ['Quadril', 'Coluna'],
    sets: '3',
    reps: '12',
    image_url: '',
  },
  {
    id: '3',
    name: 'Alongamento de Isquiotibiais',
    category: 'Alongamento',
    difficulty: 'Fácil',
    description: 'Alongamento dos músculos posteriores de coxa',
    instructions: 'Sentado, alcance os pés mantendo joelhos estendidos',
    body_parts: ['Quadril', 'Joelho'],
    sets: '2',
    reps: '30s',
    image_url: '',
  },
  {
    id: '4',
    name: 'Prancha Abdominal',
    category: 'Core',
    difficulty: 'Médio',
    description: 'Fortalecimento do core',
    instructions: 'Apoie antebraços e pontas dos pés, mantenha corpo alinhado',
    body_parts: ['Coluna', 'Quadril'],
    sets: '3',
    reps: '30s',
    image_url: '',
  },
];

export default function ExerciseTemplatesScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(EXERCISE_TEMPLATES.map(e => e.category)))];

  const filteredExercises = EXERCISE_TEMPLATES.filter(exercise => {
    const matchesSearch = exercise.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exercise.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectExercise = useCallback((exercise: Exercise) => {
    HapticFeedback.selection();
    // Return selected exercise to previous screen
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Biblioteca de Exercícios</Text>
        <View style={styles.headerSpacer} />
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
            onPress={() => {
              HapticFeedback.selection();
              setSelectedCategory(category);
            }}
            style={({ pressed }) => [
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === category ? colors.primary : colors.card,
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredExercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            onPress={() => handleSelectExercise(exercise)}
            style={({ pressed }) => [
              styles.exerciseCard,
              { backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={[styles.exerciseIcon, { backgroundColor: `${colors.primary}10` }]}>
              <Icon name="dumbbell" size={20} color={colors.primary} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>
                {exercise.name}
              </Text>
              <Text style={[styles.exerciseDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                {exercise.description}
              </Text>
              <View style={styles.exerciseMeta}>
                <Badge variant="default" size="xs">{exercise.category}</Badge>
                {exercise.sets && exercise.reps && (
                  <Text style={[styles.exerciseParams, { color: colors.textSecondary }]}>
                    {exercise.sets}x{exercise.reps}
                  </Text>
                )}
              </View>
            </View>
            <Icon name="plus-circle" size={24} color={colors.primary} />
          </Pressable>
        ))}
      </ScrollView>
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  exerciseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseDescription: {
    fontSize: 13,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  exerciseParams: {
    fontSize: 12,
  },
});
