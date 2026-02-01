import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ViewStyle } from 'react-native';

import { Card } from './Card';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import type { Exercise } from '@/types';

export interface ExerciseCardProps {
  exercise: Exercise;
  onPress?: () => void;
  variant?: 'grid' | 'list';
  style?: ViewStyle;
}

export function ExerciseCard({
  exercise,
  onPress,
  variant = 'grid',
  style,
}: ExerciseCardProps) {
  const { colors } = useTheme();

  const getDifficultyColor = () => {
    switch (exercise.difficulty) {
      case 'Fácil':
        return '#22c55e';
      case 'Médio':
        return '#f59e0b';
      case 'Difícil':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}>
      <Card
        variant="elevated"
        style={[styles.container, variant === 'list' && styles.containerList]}
      >
        {/* Thumbnail */}
        <View style={[styles.thumbnailContainer, variant === 'list' && styles.thumbnailContainerList]}>
          {exercise.image_url || exercise.video_url ? (
            <Image
              source={{ uri: exercise.image_url || exercise.video_url || '' }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.card }]}>
              <Icon name="dumbbell" size={32} color={colors.textSecondary} />
            </View>
          )}
          {exercise.video_url && (
            <View style={styles.videoBadge}>
              <Icon name="play" size={12} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {exercise.name}
          </Text>

          {exercise.category && (
            <Text style={[styles.category, { color: colors.textSecondary }]} numberOfLines={1}>
              {exercise.category}
            </Text>
          )}

          {/* Tags */}
          <View style={styles.tags}>
            {exercise.difficulty && (
              <View style={[styles.difficultyBadge, { backgroundColor: `${getDifficultyColor()}20` }]}>
                <Text style={[styles.difficultyText, { color: getDifficultyColor() }]}>
                  {exercise.difficulty}
                </Text>
              </View>
            )}
            {exercise.body_parts && exercise.body_parts.length > 0 && (
              <View style={[styles.bodyPartBadge, { backgroundColor: colors.card }]}>
                <Text style={[styles.bodyPartText, { color: colors.textSecondary }]}>
                  {exercise.body_parts[0]}
                </Text>
              </View>
            )}
          </View>

          {/* Details */}
          {(exercise.sets || exercise.repetitions || exercise.duration) && (
            <View style={styles.details}>
              {exercise.sets && (
                <View style={styles.detailItem}>
                  <Icon name="layers" size={12} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {exercise.sets} séries
                  </Text>
                </View>
              )}
              {exercise.repetitions && (
                <View style={styles.detailItem}>
                  <Icon name="repeat" size={12} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {exercise.repetitions} reps
                  </Text>
                </View>
              )}
              {exercise.duration && (
                <View style={styles.detailItem}>
                  <Icon name="clock" size={12} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {exercise.duration}s
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    overflow: 'hidden',
  },
  containerList: {
    flexDirection: 'row',
  },
  thumbnailContainer: {
    aspectRatio: 1,
    width: '100%',
  },
  thumbnailContainerList: {
    width: 100,
    aspectRatio: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 12,
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  category: {
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bodyPartBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bodyPartText: {
    fontSize: 10,
    fontWeight: '500',
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
  },
});
