import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';

interface Exercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: number;
  completed: boolean;
  videoUrl?: string;
}

// Mock data - will be replaced with Firestore data
const mockExercises: Exercise[] = [
  {
    id: '1',
    name: 'Alongamento Cervical',
    description: 'Incline a cabeca para cada lado mantendo por 30 segundos',
    sets: 3,
    reps: 10,
    completed: true,
  },
  {
    id: '2',
    name: 'Fortalecimento Lombar',
    description: 'Deite de barriga para cima e eleve o quadril',
    sets: 2,
    reps: 15,
    completed: true,
  },
  {
    id: '3',
    name: 'Mobilidade de Quadril',
    description: 'Faca circulos com os joelhos em posicao de quatro apoios',
    sets: 2,
    reps: 12,
    completed: false,
  },
  {
    id: '4',
    name: 'Prancha Abdominal',
    description: 'Mantenha a posicao de prancha por 30 segundos',
    sets: 3,
    reps: 1,
    completed: false,
  },
  {
    id: '5',
    name: 'Agachamento',
    description: 'Agache mantendo os joelhos alinhados com os pes',
    sets: 3,
    reps: 12,
    completed: false,
  },
];

export default function ExercisesScreen() {
  const colors = useColors();
  const [exercises, setExercises] = useState(mockExercises);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleExercise = (id: string) => {
    setExercises(prev =>
      prev.map(ex =>
        ex.id === id ? { ...ex, completed: !ex.completed } : ex
      )
    );
  };

  const completedCount = exercises.filter(e => e.completed).length;
  const totalCount = exercises.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Progresso de Hoje
            </Text>
            <Text style={[styles.progressCount, { color: colors.primary }]}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progress === 100
              ? 'Parabens! Voce completou todos os exercicios!'
              : `Faltam ${totalCount - completedCount} exercicios`}
          </Text>
        </Card>

        {/* Exercise List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Meus Exercicios
        </Text>

        {exercises.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            onPress={() => toggleExercise(exercise.id)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.exerciseCard,
                exercise.completed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.exerciseHeader}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: exercise.completed
                        ? colors.success
                        : 'transparent',
                      borderColor: exercise.completed
                        ? colors.success
                        : colors.border,
                    },
                  ]}
                >
                  {exercise.completed && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.exerciseInfo}>
                  <Text
                    style={[
                      styles.exerciseName,
                      { color: colors.text },
                      exercise.completed && styles.completedText,
                    ]}
                  >
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseSets, { color: colors.textSecondary }]}>
                    {exercise.sets} series x {exercise.reps} repeticoes
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              </View>
              <Text
                style={[styles.exerciseDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {exercise.description}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  progressCard: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  exerciseSets: {
    fontSize: 13,
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 36,
  },
});
