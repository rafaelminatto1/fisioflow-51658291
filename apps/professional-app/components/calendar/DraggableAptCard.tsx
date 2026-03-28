import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { format } from 'date-fns';
import { AppointmentBase } from '@/types';

const HOUR_HEIGHT = 60;
const SNAP_PX = 15; // 15 minutes = 15px at 60px/hr

function snapToGrid(rawTop: number): number {
  'worklet';
  return Math.round(rawTop / SNAP_PX) * SNAP_PX;
}

function topToTime(snappedTop: number, startHour: number): string {
  'worklet';
  const totalMinutes = Math.round((snappedTop / HOUR_HEIGHT) * 60) + startHour * 60;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface DraggableAptCardColors {
  primary: string;
  textSecondary: string;
}

export interface DraggableAptCardProps {
  apt: AppointmentBase & { top: number; height: number };
  pos: { left: number; width: number };
  startHour: number;
  endHour: number;
  onReschedule?: (id: string, time: string) => void;
  onScrollEnable: (enabled: boolean) => void;
  colors: DraggableAptCardColors;
  /** Optional onPress for navigating to appointment detail */
  onPress?: () => void;
}

export const DraggableAptCard = ({
  apt,
  pos,
  startHour,
  endHour,
  onReschedule,
  onScrollEnable,
  colors,
  onPress,
}: DraggableAptCardProps) => {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const ghostTop = useSharedValue(apt.top);

  const maxTop = (endHour - startHour) * HOUR_HEIGHT - apt.height;

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(500)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(onScrollEnable)(false);
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      const rawTop = apt.top + e.translationY;
      const clamped = Math.max(0, Math.min(rawTop, maxTop));
      ghostTop.value = snapToGrid(clamped);
    })
    .onEnd(() => {
      const newTime = topToTime(ghostTop.value, startHour);
      translateY.value = withSpring(0);
      isDragging.value = false;
      runOnJS(onScrollEnable)(true);
      if (onReschedule) {
        runOnJS(onReschedule)(apt.id, newTime);
      }
    })
    .onFinalize((_e, success) => {
      if (!success) {
        translateY.value = withSpring(0);
        isDragging.value = false;
        runOnJS(onScrollEnable)(true);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: isDragging.value ? 0.7 : 1,
    zIndex: isDragging.value ? 100 : 2,
    elevation: isDragging.value ? 8 : 2,
  }));

  const ghostAnimatedStyle = useAnimatedStyle(() => ({
    top: ghostTop.value,
    opacity: isDragging.value ? 1 : 0,
  }));

  return (
    <>
      {/* Ghost indicator — dashed border at the snapped target position */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ghost,
          {
            left: pos.left,
            width: pos.width,
            height: apt.height,
            borderColor: colors.primary,
          },
          ghostAnimatedStyle,
        ]}
      />

      {/* Draggable card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.card,
            {
              top: apt.top,
              height: apt.height,
              left: pos.left,
              width: pos.width,
              backgroundColor: colors.primary + '20',
              borderColor: colors.primary,
            },
            cardAnimatedStyle,
          ]}
          onTouchEnd={onPress}
        >
          <Text style={[styles.aptTitle, { color: colors.primary }]} numberOfLines={1}>
            {apt.patientName || 'Paciente'}
          </Text>
          <Text style={[styles.aptTime, { color: colors.textSecondary }]}>
            {apt.time || format(new Date(apt.date), 'HH:mm')} - {apt.type}
          </Text>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  card: {
    position: 'absolute',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 4,
    overflow: 'hidden',
  },
  aptTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  aptTime: {
    fontSize: 10,
  },
});
