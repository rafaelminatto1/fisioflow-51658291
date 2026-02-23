import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { isPast, isToday } from 'date-fns';
import { Card } from './Card';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import type { Appointment } from '@/types';

export interface AppointmentCardProps {
  appointment: Appointment;
  onPress?: () => void;
  onStartSession?: () => void;
  onStartEvaluation?: () => void;
  showActions?: boolean;
  style?: ViewStyle;
}

/**
 * AppointmentCard - Componente otimizado com memoização para listas
 *
 * Utiliza React.memo com custom comparison para evitar re-renders desnecessários.
 */
export const AppointmentCard = memo(({
  appointment,
  onPress,
  onStartSession,
  onStartEvaluation,
  showActions = false,
  style,
}: AppointmentCardProps) => {
  const { colors } = useTheme();
  const [actionsPressed, setActionsPressed] = React.useState(false);

  const getStatusInfo = () => {
    switch (appointment.status) {
      case 'agendado':
        return { label: 'Agendado', color: colors.primary as const, variant: 'default' as const };
      case 'confirmado':
        return { label: 'Confirmado', color: '#22c55e' as const, variant: 'success' as const };
      case 'em_andamento':
        return { label: 'Em Andamento', color: '#f59e0b' as const, variant: 'warning' as const };
      case 'concluido':
        return { label: 'Concluído', color: '#10b981' as const, variant: 'success' as const };
      case 'cancelado':
        return { label: 'Cancelado', color: '#ef4444' as const, variant: 'error' as const };
      case 'faltou':
        return { label: 'Faltou', color: '#ef4444' as const, variant: 'error' as const };
      default:
        return { label: appointment.status, color: '#6b7280' as const, variant: 'default' as const };
    }
  };

  const statusInfo = getStatusInfo();
  const appointmentDate = new Date(appointment.date);
  const isPastAppointment = isPast(appointmentDate) && !isToday(appointmentDate);
  const isTodayAppointment = isToday(appointmentDate);

  return (
    <Pressable
      onPress={() => {
        if (!actionsPressed && onPress) {
          onPress();
        }
      }}
      onPressIn={() => setActionsPressed(false)}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}
    >
      <Card
        variant={isPastAppointment ? 'default' : 'elevated'}
        style={[
          styles.container,
          isPastAppointment && styles.pastAppointment,
        ]}
      >
        <View style={styles.content}>
          {/* Time Column */}
          <View style={styles.timeColumn}>
            <Text style={[styles.time, { color: colors.text }]}>
              {appointment.time}
            </Text>
            {isTodayAppointment && (
              <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
            )}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Info Column */}
          <View style={styles.infoColumn}>
            <View style={styles.headerRow}>
              <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                {appointment.patientName}
              </Text>
              <Badge variant={statusInfo.variant} size="sm">
                {statusInfo.label}
              </Badge>
            </View>

            <Text style={[styles.appointmentType, { color: colors.textSecondary }]} numberOfLines={1}>
              {appointment.type}
            </Text>

            {appointment.room && (
              <View style={styles.row}>
                <Icon name="map-pin" size={14} color={colors.textSecondary} />
                <Text style={[styles.rowText, { color: colors.textSecondary }]}>
                  Sala {appointment.room}
                </Text>
              </View>
            )}

            {appointment.notes && (
              <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={1}>
                {appointment.notes}
              </Text>
            )}
          </View>

          {/* Actions */}
          {(showActions || onStartSession || onStartEvaluation) && (
            <View style={styles.actionsColumn}>
              {onStartSession && appointment.status !== 'concluido' && (
                <Button
                  size="xs"
                  onPressIn={() => setActionsPressed(true)}
                  onPress={() => {
                    HapticFeedback.light();
                    onStartSession();
                  }}
                >
                  Iniciar
                </Button>
              )}
              {onStartEvaluation && (
                <Button
                  size="xs"
                  variant="outline"
                  onPressIn={() => setActionsPressed(true)}
                  onPress={() => {
                    HapticFeedback.light();
                    onStartEvaluation();
                  }}
                  leftIcon={<Icon name="clipboard-list" size={14} color={colors.primary} />}
                >
                  Avaliar
                </Button>
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
    padding: 12,
  },
  pastAppointment: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeColumn: {
    alignItems: 'center',
    minWidth: 50,
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
  },
  infoColumn: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  patientName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  appointmentType: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowText: {
    fontSize: 12,
  },
  notes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionsColumn: {
    gap: 6,
  },
}, (prev, next) => {
  // Custom comparison para evitar re-renders desnecessários
  return prev.appointment.id === next.appointment.id &&
         prev.appointment.status === next.appointment.status &&
         prev.appointment.date === next.appointment.date &&
         prev.appointment.patientName === next.appointment.patientName;
});
