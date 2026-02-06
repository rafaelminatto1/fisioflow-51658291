import { useState, useCallback, useEffect } from 'react';

  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Exercise } from '@/types';

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const exerciseId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  const loadExercise = async () => {
    try {
      const docRef = doc(db, 'exercises', exerciseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setExercise({ id: docSnap.id, ...docSnap.data() } as Exercise);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading exercise:', error);
      setLoading(false);
    }
  };

  const handleSelectForPlan = useCallback(() => {
    HapticFeedback.light();
    // Navigate back with selected exercise
    router.back();
  }, [router]);

  const handleWatchVideo = useCallback(() => {
    HapticFeedback.light();
    if (exercise?.video_url) {
      // Open video
    }
  }, [exercise]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="alert-triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Exercício não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Exercício</Text>
        <Pressable onPress={handleSelectForPlan} style={styles.headerButton}>
          <Icon name="plus-circle" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Exercise Image/Video */}
        <Card style={styles.imageCard}>
          {exercise.image_url ? (
            <Image source={{ uri: exercise.image_url }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.card }]}>
              <Icon name="dumbbell" size={64} color={colors.textSecondary} />
            </View>
          )}
          {exercise.video_url && (
            <Pressable
              onPress={handleWatchVideo}
              style={[styles.videoButton, { backgroundColor: colors.primary }]}
            >
              <Icon name="play" size={24} color="#fff" />
              <Text style={styles.videoButtonText}>Ver Vídeo</Text>
            </Pressable>
          )}
        </Card>

        {/* Title and Category */}
        <Text style={[styles.title, { color: colors.text }]}>{exercise.name}</Text>
        <View style={styles.metaRow}>
          <Badge variant="default" size="sm">{exercise.category}</Badge>
          <Badge
            variant="default"
            size="sm"
            color={exercise.difficulty === 'Fácil' ? '#22c55e' : exercise.difficulty === 'Médio' ? '#f59e0b' : '#ef4444'}
          >
            {exercise.difficulty}
          </Badge>
        </View>

        {/* Description */}
        {exercise.description && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Descrição</Text>
            <Text style={[styles.description, { color: colors.text }]}>
              {exercise.description}
            </Text>
          </Card>
        )}

        {/* Instructions */}
        {exercise.instructions && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instruções</Text>
            <Text style={[styles.content, { color: colors.text }]}>
              {exercise.instructions}
            </Text>
          </Card>
        )}

        {/* Parameters */}
        {(exercise.sets || exercise.reps || exercise.hold_time) && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Parâmetros</Text>
            <View style={styles.parametersGrid}>
              {exercise.sets && (
                <ParameterItem label="Séries" value={exercise.sets} colors={colors} />
              )}
              {exercise.reps && (
                <ParameterItem label="Repetições" value={exercise.reps} colors={colors} />
              )}
              {exercise.hold_time && (
                <ParameterItem label="Hold" value={`${exercise.hold_time}s`} colors={colors} />
              )}
            </View>
          </Card>
        )}

        {/* Body Parts */}
        {exercise.body_parts && exercise.body_parts.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Regiões Envolvidas</Text>
            <View style={styles.bodyPartsRow}>
              {exercise.body_parts.map((part, index) => (
                <View key={index} style={[styles.bodyPartChip, { backgroundColor: colors.card }]}>
                  <Text style={[styles.bodyPartText, { color: colors.text }]}>{part}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Contraindications */}
        {exercise.contraindications && (
          <Card style={[styles.card, styles.warningCard]}>
            <View style={styles.warningHeader}>
              <Icon name="alert-triangle" size={20} color={colors.warning} />
              <Text style={[styles.warningTitle, { color: colors.text }]}>Contraindicações</Text>
            </View>
            <Text style={[styles.warningText, { color: colors.text }]}>
              {exercise.contraindications}
            </Text>
          </Card>
        )}

        {/* Select Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleSelectForPlan}
          leftIcon={<Icon name="plus-circle" size={20} color="#fff" />}
          style={styles.selectButton}
        >
          Adicionar ao Plano
        </Button>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ParameterItem({ label, value, colors }: { label: string; value: string | number; colors: any }) {
  return (
    <View style={styles.parameterItem}>
      <Text style={[styles.parameterLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.parameterValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  imageCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  parametersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  parameterItem: {
    alignItems: 'center',
    gap: 4,
  },
  parameterLabel: {
    fontSize: 12,
  },
  parameterValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  bodyPartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyPartChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bodyPartText: {
    fontSize: 13,
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: '#fef3c7',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
  },
  selectButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
