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

function formatStatus(status?: string): string {
  const map: Record<string, string> = {
    agendado: 'Agendado',
    scheduled: 'Agendado',
    confirmado: 'Confirmado',
    confirmed: 'Confirmado',
    em_atendimento: 'Em atendimento',
    in_progress: 'Em atendimento',
    cancelado: 'Cancelado',
    cancelled: 'Cancelado',
    concluido: 'Concluído',
    completed: 'Concluído',
    faltou: 'Faltou',
    no_show: 'Faltou',
  };
  return map[(status || '').toLowerCase()] ?? (status || 'Agendado');
}

function getCardColors(apt: AppointmentBase, primary: string) {
  const typeLower = (apt.type || '').toLowerCase();
  const statusLower = apt.status || '';

  if (statusLower === 'agendado' || statusLower === 'scheduled') {
    return { bg: '#fffbeb', borderLeft: '#f59e0b', border: '#fef3c7', text: '#b45309' }; // Amber
  }
  if (statusLower === 'confirmado' || statusLower === 'confirmed' || typeLower.includes('avaliação') || typeLower.includes('assessment')) {
    return { bg: '#ecfdf5', borderLeft: '#10b981', border: '#d1fae5', text: '#047857' }; // Emerald
  }
  if (statusLower === 'em_atendimento' || statusLower === 'in_progress' || typeLower.includes('pilates') || typeLower.includes('grupo')) {
    return { bg: '#eef2ff', borderLeft: '#6366f1', border: '#e0e7ff', text: '#4338ca' }; // Indigo
  }

  return { bg: primary + '10', borderLeft: primary, border: primary + '30', text: primary }; // Brand default
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
  const cardColors = getCardColors(apt, colors.primary);

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
            borderColor: cardColors.text,
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
              backgroundColor: cardColors.bg,
              borderLeftColor: cardColors.borderLeft,
              borderColor: cardColors.border,
            },
            cardAnimatedStyle,
          ]}
          onTouchEnd={onPress}
        >
          <Animated.View style={styles.cardInner}>
            <Animated.View style={styles.cardHeader}>
              <Text style={[styles.aptType, { color: cardColors.text }]}>
                {formatStatus(apt.status)}
              </Text>
            </Animated.View>
            <Text style={styles.aptTitle} numberOfLines={1}>
              {apt.patientName || 'Paciente'}
            </Text>
            <Text style={styles.aptTime}>
              {apt.time || format(new Date(apt.date), 'HH:mm')}
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  card: {
    position: 'absolute',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardInner: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  aptType: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a', // text-slate-900
  },
  aptTime: {
    fontSize: 12,
    color: '#64748b', // text-slate-500
    marginTop: 4,
  },
});
