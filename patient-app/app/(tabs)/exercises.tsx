import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, VideoModal, SyncIndicator, ExerciseFeedbackModal } from '@/components';
import { ExerciseFeedback } from '@/components';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePatientExercisesPostgres } from '@/hooks/useDataConnect';

interface Exercise {
  id: string;
  name: string;
  description?: string;
  sets: number;
  reps: number;
  hold_time?: number;
  rest_time?: number;
  completed: boolean;
  completed_at?: Date;
  video_url?: string;
  image_url?: string;
}

interface ExercisePlan {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  start_date: Date;
  end_date?: Date;
  created_at: Date;
}

export default function ExercisesScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [exercisePlan, setExercisePlan] = useState<ExercisePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingExercise, setCompletingExercise] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; title: string; description?: string } | null>(null);
  const [feedbackExercise, setFeedbackExercise] = useState<Exercise | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const {isOnline, queueOperation} = useOfflineSync();

  // --- DATA CONNECT IMPLEMENTATION ---
  const { data: exercisesPostgres, isLoading: loadingPostgres } = usePatientExercisesPostgres(user?.id);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Se temos dados do Postgres, usamos eles para montar o plano "virtual"
    if (exercisesPostgres && exercisesPostgres.length > 0) {
      setExercisePlan({
        id: 'postgres-plan', // ID virtual
        name: 'Plano Atual (Sincronizado)',
        description: 'Seus exercícios prescritos mais recentes.',
        exercises: exercisesPostgres.map((ex: any) => ({
          id: ex.id,
          name: ex.exercise?.name || 'Exercício',
          description: ex.notes || ex.exercise?.description,
          sets: ex.sets,
          reps: ex.reps,
          completed: ex.completed,
          video_url: ex.exercise?.videoUrl,
          // Adaptação de campos
          hold_time: 0,
          rest_time: 0
        })),
        start_date: new Date(),
        created_at: new Date()
      });
      setLoading(false);
    } else if (!loadingPostgres) {
        // Fallback para Firestore apenas se Postgres estiver vazio e carregamento terminou
        // (Mantendo lógica antiga como backup silencioso ou removendo se quiser full migration)
        setLoading(false); 
    }
  }, [user?.id, exercisesPostgres, loadingPostgres]);

  /* FIRESTORE LOGIC REPLACED/DISABLED FOR READING
  useEffect(() => {
    // ... (código antigo comentado)
  }, [user?.id]);
  */

  const onRefresh = async () => {
    setRefreshing(true);
    // Force refresh by re-subscribing
    setRefreshing(false);
  };

  const toggleExercise = async (exercise: Exercise) => {
    if (!exercisePlan || !user?.id) return;

    // If completing (not uncompleting), show feedback modal first
    if (!exercise.completed) {
      setFeedbackExercise(exercise);
      setShowFeedbackModal(true);
      return;
    }

    setCompletingExercise(exercise.id);

    try {
      const newCompletedState = !exercise.completed;

      // Update local state immediately for responsiveness
      const updatedExercises = exercisePlan.exercises.map((ex: Exercise) =>
        ex.id === exercise.id
          ? { ...ex, completed: newCompletedState, completed_at: newCompletedState ? new Date() : null }
          : ex
      );

      setExercisePlan({
        ...exercisePlan,
        exercises: updatedExercises,
      });

      if (isOnline) {
        // Online: sync directly to Firestore
        const planRef = doc(db, 'users', user.id, 'exercise_plans', exercisePlan.id);
        await updateDoc(planRef, { exercises: updatedExercises });
      } else {
        // Offline: queue the operation
        await queueOperation('complete_exercise', {
          planId: exercisePlan.id,
          exerciseId: exercise.id,
          completed: newCompletedState,
        });

        Alert.alert(
          'Salvo Localmente',
          'As alterações serão sincronizadas quando você reconectar.'
        );
      }
    } catch (error) {
      console.error('Error toggling exercise:', error);
      Alert.alert('Erro', 'Nao foi possível atualizar o exercício.');
    } finally {
      setCompletingExercise(null);
    }
  };

  const handleFeedbackSubmit = async (feedback: ExerciseFeedback) => {
    if (!feedbackExercise || !exercisePlan || !user?.id) return;

    setCompletingExercise(feedbackExercise.id);

    try {
      // Update local state
      const updatedExercises = exercisePlan.exercises.map((ex: Exercise) =>
        ex.id === feedbackExercise!.id
          ? { ...ex, completed: true, completed_at: new Date() }
          : ex
      );

      setExercisePlan({
        ...exercisePlan,
        exercises: updatedExercises,
      });

      if (isOnline) {
        // Online: sync directly to Firestore
        const planRef = doc(db, 'users', user.id, 'exercise_plans', exercisePlan.id);
        await updateDoc(planRef, { exercises: updatedExercises });

        // Save feedback
        const feedbackRef = doc(
          db,
          'users',
          user.id,
          'exercise_plans',
          exercisePlan.id,
          'feedback',
          feedbackExercise.id
        );
        await setDoc(feedbackRef, {
          ...feedback,
          created_at: new Date(),
          exercise_name: feedbackExercise.name,
        });
      } else {
        // Offline: queue both operations
        await queueOperation('complete_exercise', {
          planId: exercisePlan.id,
          exerciseId: feedbackExercise.id,
          completed: true,
        });

        await queueOperation('submit_feedback', {
          exerciseId: feedbackExercise.id,
          planId: exercisePlan.id,
          ...feedback,
        });
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Erro', 'Nao foi possível salvar o feedback.');
    } finally {
      setCompletingExercise(null);
      setFeedbackExercise(null);
    }
  };

  const openVideo = (exercise: Exercise) => {
    if (exercise.video_url) {
      setSelectedVideo({
        uri: exercise.video_url,
        title: exercise.name,
        description: exercise.description,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando exercícios...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercisePlan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhum exercício ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Seu fisioterapeuta irá prescrever exercícios em breve
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const exercises = exercisePlan.exercises || [];
  const completedCount = exercises.filter(e => e.completed).length;
  const totalCount = exercises.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Sync Indicator */}
      <SyncIndicator />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Plan Info Card */}
        <Card style={styles.planInfoCard}>
          <Text style={[styles.planName, { color: colors.text }]}>
            {exercisePlan.name}
          </Text>
          {exercisePlan.description && (
            <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
              {exercisePlan.description}
            </Text>
          )}
        </Card>

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
                { backgroundColor: progress === 100 ? colors.success : colors.primary, width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progress === 100
              ? 'Parabéns! Você completou todos os exercícios!'
              : `Faltam ${totalCount - completedCount} exercício${totalCount - completedCount !== 1 ? 's' : ''}`}
          </Text>
        </Card>

        {/* Exercise List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Meus Exercícios
        </Text>

        {exercises.map((exercise, index) => (
          <TouchableOpacity
            key={exercise.id}
            onPress={() => toggleExercise(exercise)}
            activeOpacity={0.7}
            disabled={completingExercise === exercise.id}
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
                  <View style={styles.exerciseNumber}>
                    <Text style={[styles.exerciseNumberText, { color: colors.primary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.exerciseDetails}>
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
                      {exercise.sets} séries × {exercise.reps} reps
                      {exercise.hold_time && ` • ${exercise.hold_time}s descenso`}
                      {exercise.rest_time && ` • ${exercise.rest_time}s descanso`}
                    </Text>
                  </View>
                </View>
                {completingExercise === exercise.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name={exercise.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={exercise.completed ? colors.success : colors.textMuted}
                  />
                )}
              </View>
              {exercise.description && (
                <Text
                  style={[styles.exerciseDescription, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {exercise.description}
                </Text>
              )}
              {exercise.video_url && (
                <TouchableOpacity
                  style={[styles.videoIndicator, { backgroundColor: colors.surface }]}
                  onPress={() => openVideo(exercise)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-circle" size={16} color={colors.primary} />
                  <Text style={[styles.videoIndicatorText, { color: colors.textSecondary }]}>
                    Ver vídeo
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Video Modal */}
      <VideoModal
        visible={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUri={selectedVideo?.uri || ''}
        title={selectedVideo?.title}
        description={selectedVideo?.description}
        autoPlay={true}
      />

      {/* Feedback Modal */}
      <ExerciseFeedbackModal
        visible={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          setFeedbackExercise(null);
        }}
        onSubmit={handleFeedbackSubmit}
        exerciseName={feedbackExercise?.name || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  planInfoCard: {
    marginBottom: 16,
    padding: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressCard: {
    marginBottom: 24,
    padding: 16,
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
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
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
    marginTop: 8,
  },
  videoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 36,
    marginTop: 8,
    gap: 6,
  },
  videoIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
