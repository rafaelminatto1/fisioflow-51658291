/**
 * Exercise Detail Screen
 *
 * Tela de detalhes de um exercício específico com instruções
 * completas, vídeos e histórico de performance.
 *
 * @module app/exercise/[id]
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card, Button, VideoModal } from '@/components';
import { useAuthStore } from '@/store/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

interface ExerciseDetail {
  id: string;
  name: string;
  description?: string;
  instructions?: string[];
  benefits?: string[];
  precautions?: string[];
  sets: number;
  reps: number;
  holdTime?: number;
  restTime?: number;
  videoUrl?: string;
  imageUrl?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface ExerciseHistory {
  date: Date;
  completed: boolean;
  feedback?: {
    difficulty: number;
    pain: number;
  };
}

export default function ExerciseDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const exerciseId = params.id as string;

  const { user } = useAuthStore();
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);

  useEffect(() => {
    if (exerciseId && user?.id) {
      loadExerciseData();
    }
  }, [exerciseId, user?.id]);

  const loadExerciseData = async () => {
    if (!exerciseId || !user?.id) return;

    setLoading(true);

    try {
      // Buscar detalhes do exercício
      // Em uma implementação real, isso viria de uma coleção de exercícios
      // Por ora, simulamos com dados do plano do paciente

      const plansRef = doc(db, 'users', user.id, 'exercise_plans', 'current');
      const planSnap = await getDoc(plansRef);

      if (planSnap.exists()) {
        const planData = planSnap.data();
        const exercises = planData.exercises || [];
        const foundExercise = exercises.find((e: any) => e.id === exerciseId);

        if (foundExercise) {
          setExercise({
            id: foundExercise.id,
            name: foundExercise.name,
            description: foundExercise.description,
            instructions: foundExercise.instructions || [
              'Mantenha a postura correta durante todo o exercício',
              'Respire normalmente, não prenda a respiração',
              'Execute o movimento de forma controlada',
            ],
            benefits: foundExercise.benefits || [
              'Melhora a flexibilidade',
              'Fortalece os músculos',
              'Reduz a dor',
            ],
            precautions: foundExercise.precautions || [
              'Pare se sentir dor intensa',
              'Não force além dos seus limites',
            ],
            sets: foundExercise.sets || 3,
            reps: foundExercise.reps || 10,
            holdTime: foundExercise.holdTime,
            restTime: foundExercise.restTime,
            videoUrl: foundExercise.videoUrl,
            imageUrl: foundExercise.imageUrl,
            category: foundExercise.category,
            difficulty: foundExercise.difficulty,
          });

          setCompleted(foundExercise.completed || false);
        }
      }
    } catch (error) {
      console.error('Error loading exercise:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do exercício.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!exercise || !user?.id) return;

    setCompleting(true);

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Toggle completion status
      const newCompletedState = !completed;
      setCompleted(newCompletedState);

      // Update in Firestore
      const plansRef = doc(db, 'users', user.id, 'exercise_plans', 'current');
      const planSnap = await getDoc(plansRef);

      if (planSnap.exists()) {
        const planData = planSnap.data();
        const exercises = planData.exercises || [];
        const updatedExercises = exercises.map((e: any) =>
          e.id === exerciseId
            ? { ...e, completed: newCompletedState, completedAt: new Date() }
            : e
        );

        await updateDoc(plansRef, { exercises: updatedExercises });
      }

      if (newCompletedState) {
        Alert.alert('Parabéns!', 'Exercício marcado como completo! 💪');
      }
    } catch (error) {
      console.error('Error toggling exercise completion:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o exercício.');
    } finally {
      setCompleting(false);
    }
  };

  const getDifficultyColor = () => {
    if (!exercise?.difficulty) return colors.textSecondary;
    switch (exercise.difficulty) {
      case 'easy': return colors.success;
      case 'medium': return colors.warning;
      case 'hard': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getDifficultyLabel = () => {
    if (!exercise?.difficulty) return '';
    switch (exercise.difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando exercício...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="sad-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Exercício não encontrado
          </Text>
          <Button title="Voltar" onPress={() => router.back()} style={styles.errorButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Detalhes do Exercício</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Thumbnail */}
        {exercise.videoUrl ? (
          <TouchableOpacity
            style={styles.videoThumbnail}
            onPress={() => setShowVideo(true)}
            activeOpacity={0.8}
          >
            {exercise.imageUrl ? (
              <Image source={{ uri: exercise.imageUrl }} style={styles.thumbnailImage} />
            ) : (
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="play-circle" size={64} color={colors.primary} />
              </View>
            )}
            <View style={styles.playButton}>
              <Ionicons name="play" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ) : exercise.imageUrl ? (
          <Image source={{ uri: exercise.imageUrl }} style={styles.headerImage} />
        ) : null}

        {/* Title and Basic Info */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{exercise.name}</Text>
            {exercise.difficulty && (
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() + '20' }]}>
                <Text style={[styles.difficultyText, { color: getDifficultyColor() }]}>
                  {getDifficultyLabel()}
                </Text>
              </View>
            )}
          </View>

          {exercise.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {exercise.description}
            </Text>
          )}

          {/* Exercise Parameters */}
          <View style={styles.paramsContainer}>
            <View style={[styles.paramItem, { backgroundColor: colors.surface }]}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
              <Text style={[styles.paramValue, { color: colors.text }]}>{exercise.sets}</Text>
              <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>séries</Text>
            </View>

            <View style={[styles.paramItem, { backgroundColor: colors.surface }]}>
              <Ionicons name="resize" size={20} color={colors.success} />
              <Text style={[styles.paramValue, { color: colors.text }]}>{exercise.reps}</Text>
              <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>repetições</Text>
            </View>

            {exercise.holdTime && (
              <View style={[styles.paramItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="time" size={20} color={colors.warning} />
                <Text style={[styles.paramValue, { color: colors.text }]}>{exercise.holdTime}s</Text>
                <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>descanso</Text>
              </View>
            )}

            {exercise.restTime && (
              <View style={[styles.paramItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="hourglass" size={20} color={colors.info} />
                <Text style={[styles.paramValue, { color: colors.text }]}>{exercise.restTime}s</Text>
                <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>intervalo</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instructions */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Instruções</Text>
            </View>
            {exercise.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={[styles.instructionNumber, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.instructionNumberText, { color: colors.primary }]}>{index + 1}</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>{instruction}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Benefits */}
        {exercise.benefits && exercise.benefits.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Benefícios</Text>
            </View>
            {exercise.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark" size={16} color={colors.success} />
                <Text style={[styles.benefitText, { color: colors.text }]}>{benefit}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Precautions */}
        {exercise.precautions && exercise.precautions.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Precauções</Text>
            </View>
            {exercise.precautions.map((precaution, index) => (
              <View key={index} style={styles.precautionItem}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={[styles.precautionText, { color: colors.text }]}>{precaution}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="stats-chart" size={20} color={colors.info} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Histórico Recente</Text>
            </View>
            {history.slice(0, 5).map((entry, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                  {format(entry.date, "dd 'de' MMMM", { locale: ptBR })}
                </Text>
                <View style={styles.historyFeedback}>
                  {entry.feedback && (
                    <>
                      <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>Dificuldade:</Text>
                      <Text style={[styles.historyValue, { color: colors.text }]}>
                        {entry.feedback.difficulty}/5
                      </Text>
                    </>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Complete Button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <Button
          title={completed ? '✓ Concluído' : 'Marcar como Concluído'}
          onPress={handleToggleComplete}
          loading={completing}
          variant={completed ? 'solid' : 'primary'}
          style={[
            styles.completeButton,
            completed && styles.completeButtonDone,
          ]}
          textStyle={[
            styles.completeButtonText,
            completed && { color: '#FFFFFF' },
          ]}
        />
      </View>

      {/* Video Modal */}
      {exercise.videoUrl && (
        <VideoModal
          visible={showVideo}
          onClose={() => setShowVideo(false)}
          videoUri={exercise.videoUrl}
          title={exercise.name}
          description={exercise.description}
          autoPlay
        />
      )}
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    minWidth: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  videoThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -30,
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  titleSection: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  paramsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paramItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  paramValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  paramLabel: {
    fontSize: 12,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 15,
    flex: 1,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  precautionText: {
    fontSize: 15,
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  historyDate: {
    fontSize: 14,
  },
  historyFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyLabel: {
    fontSize: 13,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  completeButton: {
    backgroundColor: colors => colors?.primary || '#0D9488',
  },
  completeButtonDone: {
    backgroundColor: '#22c55e',
  },
  completeButtonText: {
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 80,
  },
});
