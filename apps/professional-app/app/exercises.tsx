import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Card, Button, Modal } from '@/components';
import { useExercisesLibrary, usePatientExerciseAssignments } from '@/hooks';
import { useHaptics } from '@/hooks/useHaptics';
import { useDebounce } from '@/hooks/useDebounce';
import { SkeletonExercise } from '@/components/SkeletonExercise';
import type { Exercise } from '@/types';

const DIFFICULTIES = [
  { label: 'Todas', value: null },
  { label: 'Fácil', value: 'iniciante' },
  { label: 'Médio', value: 'intermediario' },
  { label: 'Difícil', value: 'avancado' },
];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Todos': 'list-outline',
  'Mobilidade': 'move-outline',
  'Força': 'fitness-outline',
  'Equilíbrio': 'body-outline',
  'Cardio': 'heart-outline',
  'Alongamento': 'accessibility-outline',
};

export default function ExercisesScreen() {
  const colors = useColors();
  const { light, medium, success } = useHaptics();
  const params = useLocalSearchParams();
  const patientId = params.patientId as string | undefined;
  const patientName = params.patientName as string | undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Modal State
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [frequency, setFrequency] = useState('Diário');

  const { 
    data: exercises, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    total
  } = useExercisesLibrary({
    search: debouncedSearch.trim() || undefined,
    category: selectedCategory === 'Todos' ? undefined : selectedCategory,
    difficulty: selectedDifficulty || undefined,
    favorites: showFavoritesOnly,
    limit: 20,
  });

  // Simplified category list - in a real app these would come from the API
  const categoryOptions = ['Todos', 'Mobilidade', 'Força', 'Equilíbrio', 'Cardio', 'Alongamento'];

  const { assignExercise, isAssigning } = usePatientExerciseAssignments();

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
    } catch {
      Alert.alert('Erro', 'Não foi possível prescrever o exercício.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
      case 'iniciante':
        return colors.success;
      case 'medium':
      case 'intermediario':
        return colors.warning;
      case 'hard':
      case 'avancado':
        return colors.error;
      default:
        return colors.textSecondary;  const renderExerciseItem = useCallback(({ item: exercise }: { item: Exercise }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        light();
        if (patientId) {
          setSelectedExercise(exercise);
          setShowAssignModal(true);
        } else {
          router.push(`/exercises/${exercise.id}` as any);
        }
      }}
      style={[
        styles.exerciseCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }
      ]}
    >
      <View style={styles.cardImageContainer}>
        {exercise.imageUrl ? (
          <Image source={{ uri: exercise.imageUrl }} style={styles.exerciseImage} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.border }]}>
             <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          </View>
        )}
        
        {/* Glassmorphism Overlay */}
        <View style={styles.imageOverlay} />

        {/* Difficulty Badge on top of image */}
        <View
          style={[
            styles.difficultyBadgeOverlay,
            { backgroundColor: getDifficultyColor(exercise.difficulty || '') + 'DD' },
          ]}
        >
          <Text style={styles.difficultyTextOverlay}>
            {exercise.difficulty === 'easy' || exercise.difficulty === 'iniciante' 
              ? 'Fácil' 
              : exercise.difficulty === 'medium' || exercise.difficulty === 'intermediario'
                ? 'Médio' 
                : 'Difícil'}
          </Text>
        </View>

        {/* IA Badge */}
        {['squat', 'pushup', 'plank', 'lunge'].includes(exercise.id?.toLowerCase() || '') && (
          <View style={[
            styles.iaBadgeOverlay, 
            { 
              backgroundColor: '#0D9488D0', // Slightly more transparent for glass
              borderColor: '#2DD4BF60', 
              borderWidth: 1,
              shadowColor: '#2DD4BF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 4
            }
          ]}>
            <Ionicons name="sparkles" size={12} color="#fff" />
            <Text style={styles.iaBadgeText}>IA ASSISTIDA</Text>
          </View>
        )}
      </View>

      <View style={styles.exerciseContent}>
        <View style={styles.exerciseHeader}>
          <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
            {exercise.name}
          </Text>
        </View>
        
        <Text
          style={[styles.exerciseDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {exercise.description || 'Sem descrição disponível.'}
        </Text>

        <View style={styles.exerciseFooter}>
            <View style={styles.metaContainer}>
              <View style={[styles.metaRow, { backgroundColor: colors.border + '30' }]}>
                <Ionicons name="apps-outline" size={12} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {exercise.category}
                </Text>
              </View>
              <View style={[styles.metaRow, { backgroundColor: colors.border + '30' }]}>
                <Ionicons name="body-outline" size={12} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {exercise.bodyParts && exercise.bodyParts.length > 0 
                    ? exercise.bodyParts[0].charAt(0).toUpperCase() + exercise.bodyParts[0].slice(1)
                    : 'Geral'}
                </Text>
              </View>
            </View>
           <View style={[styles.footerArrow, { backgroundColor: colors.primary + '10' }]}>
             <Ionicons name="chevron-forward" size={16} color={colors.primary} />
           </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [colors, patientId]);olors, patientId]);

  const renderFooter = () => {
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => { light(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {patientName ? `Para: ${patientName}` : 'Biblioteca'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {total} exercícios disponíveis
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.headerAction} 
          onPress={() => {
            light();
            setShowFavoritesOnly(!showFavoritesOnly);
          }}
        >
          <Ionicons 
            name={showFavoritesOnly ? "heart" : "heart-outline"} 
            size={24} 
            color={showFavoritesOnly ? colors.error : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <View 
                style={[
                  styles.searchBar, 
                  { 
                    backgroundColor: colors.surface + 'D0', 
                    borderColor: searchQuery ? colors.primary : colors.border + '50',
                    borderWidth: 1.5,
                  }
                ]}
              >
                <View style={[styles.searchIconBg, { backgroundColor: searchQuery ? colors.primary + '20' : 'transparent' }]}>
                  <Ionicons name="search" size={20} color={searchQuery ? colors.primary : colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Buscar exercício ou sintoma..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                  onFocus={() => medium()}
                />
              </View>
            </View>

            {/* Quick Filters */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorias</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categoryOptions}
              contentContainerStyle={styles.filterScrollContent}
              renderItem={({ item: category }) => (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: selectedCategory === category ? colors.primary : colors.surface + 'B0', // Glass chip
                      borderColor: selectedCategory === category ? colors.primary : colors.border + '40',
                      borderWidth: 1.2,
                    },
                  ]}
                  onPress={() => {
                    medium(); // More distinct feedback for categories
                    setSelectedCategory(category);
                    if (category === 'Todos') {
                      setSelectedDifficulty(null);
                      setShowFavoritesOnly(false);
                    }
                  }}
                >
                  <Ionicons 
                    name={CATEGORY_ICONS[category] || 'fitness-outline'} 
                    size={16} 
                    color={selectedCategory === category ? '#FFFFFF' : colors.textSecondary} 
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.filterText,
                      selectedCategory === category ? { color: '#FFFFFF' } : { color: colors.textSecondary },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Dificuldade</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={DIFFICULTIES}
              contentContainerStyle={styles.filterScrollContent}
              renderItem={({ item: difficulty }) => (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border },
                    selectedDifficulty === difficulty.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    light();
                    setSelectedDifficulty(difficulty.value);
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedDifficulty === difficulty.value ? { color: '#FFFFFF' } : { color: colors.textSecondary },
                    ]}
                  >
                    {difficulty.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            
            <View style={styles.listHeaderDivider} />
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingList}>
               <SkeletonExercise />
               <SkeletonExercise />
               <SkeletonExercise />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum resultado</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tente ajustar seus filtros ou busca
              </Text>
              <Button 
                title="Limpar Filtros" 
                onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('Todos');
                    setSelectedDifficulty(null);
                    setShowFavoritesOnly(false);
                }}
                variant="outline"
                style={{ marginTop: 20 }}
              />
            </View>
          )
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
      />

      {/* Assign Modal */}
      <Modal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Prescrever"
      >
        {selectedExercise && (
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderInfo}>
               <Text style={[styles.modalExerciseName, { color: colors.text }]}>
                {selectedExercise.name}
              </Text>
              <Text style={[styles.modalExerciseCat, { color: colors.primary }]}>
                {selectedExercise.category} • {
                  selectedExercise.difficulty === 'easy' || selectedExercise.difficulty === 'iniciante'
                    ? 'Fácil' 
                    : selectedExercise.difficulty === 'medium' || selectedExercise.difficulty === 'intermediario'
                      ? 'Médio' 
                      : 'Difícil'
                }
              </Text>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Séries</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="numeric"
                  placeholder="3"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Reps</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  placeholder="10"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Frequência</Text>
              <View style={styles.frequencyOptions}>
                {['Diário', '3x/semana', '2x/semana'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyChip,
                      { borderColor: colors.border },
                      frequency === freq && { backgroundColor: colors.primary, borderColor: colors.primary },
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

            <Button
              title="Confirmar Prescrição"
              onPress={handleAssignExercise}
              loading={isAssigning}
              style={styles.confirmButton}
            />
          </View>
        )}
      </Modal>
      
      {!patientId && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            medium();
            router.push('/exercise-form');
          }}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
  },
  exerciseCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 0,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyBadgeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 2,
  },
  difficultyTextOverlay: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  iaBadgeOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    zIndex: 2,
  },
  exerciseContent: {
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 19,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.3,
  },
  iaBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.8,
  },
  exerciseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  searchIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    height: 56,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalContent: {
    paddingBottom: 10,
  },
  modalHeaderInfo: {
    marginBottom: 20,
  },
  modalExerciseName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalExerciseCat: {
    fontSize: 14,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
    gap: 8,
  },
  formGroup: {
    marginBottom: 24,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  frequencyChip: {
    flex: 1,
    minWidth: '28%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { height: 4, width: 0 },
  },
  premiumBorder: {
    borderWidth: 2,
  }
});

