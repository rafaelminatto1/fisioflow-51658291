import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Mock data - will be replaced with Firebase data
const mockExercises = [
  {
    id: '1',
    name: 'Agachamento Wall Sit',
    category: 'Fortalecimento',
    sets: 3,
    reps: 10,
    duration: 30,
    restTime: 30,
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    videoUrl: 'https://example.com/video1.mp4',
    status: 'pending', // pending, completed, skipped
  },
  {
    id: '2',
    name: 'Elevação Lateral',
    category: 'Mobilidade',
    sets: 3,
    reps: 12,
    duration: 20,
    restTime: 20,
    thumbnail: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400',
    videoUrl: 'https://example.com/video2.mp4',
    status: 'completed',
  },
  {
    id: '3',
    name: 'Pontes de Glúteo',
    category: 'Fortalecimento',
    sets: 3,
    reps: 15,
    duration: 25,
    restTime: 30,
    thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
    videoUrl: 'https://example.com/video3.mp4',
    status: 'pending',
  },
];

type ExerciseStatus = 'pending' | 'completed' | 'skipped';

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState(mockExercises);

  const completedCount = exercises.filter((e) => e.status === 'completed').length;
  const totalCount = exercises.length;

  const handleExercisePress = (exerciseId: string) => {
    router.push(`/exercise/${exerciseId}`);
  };

  const getStatusIcon = (status: ExerciseStatus) => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color="#10B981" />;
      case 'skipped':
        return <Ionicons name="close-circle" size={24} color="#EF4444" />;
      default:
        return <Ionicons name="ellipse-outline" size={24} color="#CBD5E1" />;
    }
  };

  const getStatusText = (status: ExerciseStatus) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'skipped':
        return 'Pulado';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status: ExerciseStatus) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'skipped':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Exercícios de Hoje</Text>
            <Text style={styles.subtitle}>
              {completedCount} de {totalCount} concluídos
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressText}>{Math.round((completedCount / totalCount) * 100)}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${(completedCount / totalCount) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Total Time Badge */}
      <View style={styles.totalTimeBadge}>
        <Ionicons name="time-outline" size={18} color="#64748B" />
        <Text style={styles.totalTimeText}>
          Tempo estimado: {exercises.reduce((acc, e) => acc + (e.duration || 0) + (e.restTime || 0), 0)} min
        </Text>
      </View>

      {/* Exercises List */}
      <View style={styles.exercisesList}>
        {exercises.map((exercise, index) => (
          <TouchableOpacity
            key={exercise.id}
            style={styles.exerciseCard}
            onPress={() => handleExercisePress(exercise.id)}
            activeOpacity={0.7}
          >
            {/* Exercise Number */}
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>

            {/* Thumbnail */}
            <Image
              source={{ uri: exercise.thumbnail }}
              style={styles.exerciseThumbnail}
              resizeMode="cover"
            />

            {/* Status Overlay */}
            <View style={styles.statusOverlay}>
              {getStatusIcon(exercise.status as ExerciseStatus)}
            </View>

            {/* Exercise Info */}
            <View style={styles.exerciseInfo}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(exercise.status as ExerciseStatus)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(exercise.status as ExerciseStatus) }]}>
                    {getStatusText(exercise.status as ExerciseStatus)}
                  </Text>
                </View>
              </View>

              <Text style={styles.exerciseCategory}>{exercise.category}</Text>

              <View style={styles.exerciseDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="repeat" size={14} color="#64748B" />
                  <Text style={styles.detailText}>{exercise.sets}x{exercise.reps}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time" size={14} color="#64748B" />
                  <Text style={styles.detailText}>{exercise.duration}s</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="hourglass-outline" size={14} color="#64748B" />
                  <Text style={styles.detailText}>{exercise.restTime}s desc.</Text>
                </View>
              </View>
            </View>

            {/* Arrow */}
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Complete Session Button */}
      {completedCount === totalCount && (
        <View style={styles.completionBanner}>
          <Ionicons name="trophy" size={24} color="#F59E0B" />
          <View style={styles.completionText}>
            <Text style={styles.completionTitle}>Parabéns!</Text>
            <Text style={styles.completionSubtitle}>Você completou todos os exercícios de hoje!</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter_700',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  totalTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  totalTimeText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  exercisesList: {
    padding: 16,
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseNumber: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700',
  },
  exerciseThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
  },
  statusOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  exerciseInfo: {
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 8,
    fontFamily: 'Inter_600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    fontFamily: 'Inter_400',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  arrowContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  completionText: {
    flex: 1,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    fontFamily: 'Inter_600',
  },
  completionSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    fontFamily: 'Inter_400',
  },
});
