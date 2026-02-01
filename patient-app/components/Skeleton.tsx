/**
 * Skeleton Component
 * Loading placeholders for better UX while data loads
 */

import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { useAnimationDuration } from '@/hooks/useAccessibility';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  style?: any;
}

export function Skeleton({ width, height = 16, style }: SkeletonProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.surface,
          width: width,
          height: height,
        },
        style,
      ]}
    />
  );
}

interface SkeletonTextProps {
  width?: number | string;
  lines?: number;
  style?: any;
}

export function SkeletonText({ width = '100%', lines = 1, style }: SkeletonTextProps) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 && lines > 1 ? '70%' : width}
          height={14}
          style={index > 0 ? { marginTop: 6 } : undefined}
        />
      ))}
    </View>
  );
}

interface SkeletonAvatarProps {
  size?: number;
  style?: any;
}

export function SkeletonAvatar({ size = 48, style }: SkeletonAvatarProps) {
  return <Skeleton width={size} height={size} style={[styles.avatar, style]} />;
}

interface SkeletonCardProps {
  style?: any;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonAvatar size={40} />
        <View style={styles.cardHeaderText}>
          <Skeleton width={120} height={16} />
          <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonText lines={2} style={{ marginTop: 12 }} />
    </View>
  );
}

interface SkeletonExerciseCardProps {
  style?: any;
}

export function SkeletonExerciseCard({ style }: SkeletonExerciseCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.exerciseCard, { backgroundColor: colors.card }, style]}>
      <View style={styles.exerciseHeader}>
        <Skeleton width={32} height={32} style={styles.exerciseCheckbox} />
        <Skeleton width={28} height={28} style={styles.exerciseNumber} />
        <View style={styles.exerciseInfo}>
          <Skeleton width={150} height={16} />
          <Skeleton width={100} height={12} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={24} height={24} />
      </View>
    </View>
  );
}

interface SkeletonListItemProps {
  style?: any;
}

export function SkeletonListItem({ style }: SkeletonListItemProps) {
  const colors = useColors();

  return (
    <View style={[styles.listItem, { borderBottomColor: colors.border }, style]}>
      <SkeletonAvatar size={40} />
      <View style={styles.listItemText}>
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

interface SkeletonStatsProps {
  count?: number;
  style?: any;
}

export function SkeletonStats({ count = 3, style }: SkeletonStatsProps) {
  return (
    <View style={[styles.statsRow, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={styles.statCard} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 4,
  },
  avatar: {
    borderRadius: 999,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  exerciseCard: {
    padding: 12,
    borderRadius: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseCheckbox: {
    borderRadius: 12,
  },
  exerciseNumber: {
    borderRadius: 14,
    marginLeft: 10,
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
  },
});
