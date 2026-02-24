import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Card, Button, Modal } from '@/components';
import { useExercisesLibrary, usePatientExerciseAssignments } from '@/hooks';
import { useHaptics } from '@/hooks/useHaptics';
import type { Exercise } from '@/types';

const CATEGORIES = ['Todos', 'Alongamento', 'Fortalecimento', 'Mobilidade', 'Equilíbrio', 'Respiração', 'Pós-operatório'];
const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'];

export default function ExercisesScreen() {
  const colors = useColors();
  const { light, medium, success } = useHaptics();
  const params = useLocalSearchParams();
  const patientId = params.patientId as string | undefined;
  const patientName = params.patientName as string | undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [frequency, setFrequency] = useState('Diário');

  const { data: exercises, isLoading } = useExercisesLibrary({
    category: selectedCategory !== 'Todos' ? selectedCategory : undefined,
  });

  const { assignExercise, isAssigning } = usePatientExerciseAssignments();

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignExercise = async () => {
    if (!patientId || !selectedExercise) return;

    medium();
    try {
      await assignExercise({
        patientId,
        assignment: {
          exerciseId: selectedExercise.id,
          sets: parseInt(sets) || 3,
          reps: parseInt(reps) || 10,
          frequency,
          startDate: new Date(),
          completed: false,
          progress: 0,
        } as any,
      });
      success();
      setShowAssignModal(false);
      setSelectedExercise(null);
      setSets('3');
      setReps('10');
      setFrequency('Diário');
      Alert.alert('Sucesso', 'Exercício prescrito com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível prescrever o exercício.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'fácil':
      case 'easy':
        return colors.success;
      case 'médio':
      case 'medium':
        return colors.warning;
      case 'difícil':
      case 'hard':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { light(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {patientName ? `Prescrever para ${patientName}` : 'Biblioteca de Exercícios'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar exercícios..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              light();
              setSelectedCategory(category);
            }}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category ? { color: '#FFFFFF' } : { color: colors.textSecondary },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercise List */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollPadding}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando exercícios...
            </Text>
          </View>
        ) : filteredExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhum exercício encontrado
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tente outra busca ou categoria
            </Text>
          </View>
        ) : (
          filteredExercises.map((exercise) => (
            <Card key={exercise.id} style={styles.exerciseCard}>
              <TouchableOpacity
                onPress={() => {
                  light();
                  if (patientId) {
                    setSelectedExercise(exercise);
                    setShowAssignModal(true);
                  } else {
                    router.push(`/exercises/${exercise.id}` as any);
                  }
                }}
              >
                {exercise.imageUrl && (
                  <Image source={{ uri: exercise.imageUrl }} style={styles.exerciseImage} />
                )}
                <View style={styles.exerciseContent}>
                  <View style={styles.exerciseHeader}>
                    <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
                      {exercise.name}
                    </Text>
                    {exercise.difficulty && (
                      <View
                        style={[
                          styles.difficultyBadge,
                          { backgroundColor: getDifficultyColor(exercise.difficulty) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.difficultyText,
                            { color: getDifficultyColor(exercise.difficulty) },
                          ]}
                        >
                          {exercise.difficulty}
                        </Text>
                      </View>
                    )}
                    {/* IA Badge */}
                    {['squat', 'pushup', 'plank', 'lunge'].includes(exercise.id?.toLowerCase() || '') && (
                      <View style={[styles.iaBadge, { backgroundColor: '#8B5CF6' }]}>
                        <Ionicons name="sparkles" size={10} color="#fff" />
                        <Text style={styles.iaBadgeText}>IA</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.exerciseDescription, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {exercise.description}
                  </Text>
                  <View style={styles.exerciseMeta}>
                    {exercise.category && (
                      <View style={[styles.metaTag, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {exercise.category}
                        </Text>
                      </View>
                    )}
                    {exercise.sets && (
                      <View style={[styles.metaTag, { backgroundColor: colors.surface }]}>
                        <Ionicons name="repeat" size={12} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {exercise.sets} séries
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Assign Modal */}
      <Modal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Prescrever Exercício"
      >
        {selectedExercise && (
          <View style={styles.modalContent}>
            <Text style={[styles.exerciseName, { color: colors.text }]}>
              {selectedExercise.name}
            </Text>
            <Text style={[styles.exerciseDescription, { color: colors.textSecondary }]}>
              {selectedExercise.description}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Séries</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={sets}
                onChangeText={setSets}
                keyboardType="numeric"
                placeholder="3"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Repetições</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Frequência</Text>
              <View style={styles.frequencyOptions}>
                {['Diário', '3x/semana', '2x/semana', 'Semanal'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyChip,
                      frequency === freq && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setFrequency(freq)}
                  >
                    <Text
                      style={[
                        styles.frequencyText,
                        frequency === freq ? { color: '#FFFFFF' } : { color: colors.textSecondary },
                      ]}
                    >
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                onPress={() => setShowAssignModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Prescrever"
                onPress={handleAssignExercise}
                loading={isAssigning}
                style={styles.modalButton}
              />
            </View>
          </View>
        )}
      </Modal>
      
      {!patientId && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            medium();
            router.push('/exercise-form');
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  categoriesScroll: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
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
  },
  exerciseCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseImage: {
    width: '100%',
    height: 120,
  },
  exerciseContent: {
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  iaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    gap: 2,
  },
  iaBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
  },
  modalContent: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  frequencyText: {
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { height: 2, width: 0 },
  },
});
