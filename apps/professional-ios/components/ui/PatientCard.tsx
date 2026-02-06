import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from './Card';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { getInitials } from '@/lib/utils';
import type { Patient } from '@/types';

export interface PatientCardProps {
  patient: Patient;
  onPress?: () => void;
  showProgress?: boolean;
  showLastVisit?: boolean;
  style?: ViewStyle;
}

export function PatientCard({
  patient,
  onPress,
  showProgress = true,
  showLastVisit = false,
  style,
}: PatientCardProps) {
  const { colors } = useTheme();

  const getStatusColor = () => {
    switch (patient.status) {
      case 'Em Tratamento':
        return colors.primary;
      case 'Recuperação':
        return colors.warning;
      case 'Inicial':
        return colors.notification;
      case 'Concluído':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getProgressColor = () => {
    const progress = patient.progress || 0;
    if (progress < 30) return colors.error;
    if (progress < 70) return colors.warning;
    return colors.success;
  };

  const daysSinceLastVisit = patient.updatedAt
    ? differenceInDays(new Date(), new Date(patient.updatedAt))
    : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}>
      <Card variant="elevated" style={styles.container}>
        <View style={styles.content}>
          {/* Avatar */}
          <Avatar
            src={patient.photo_url}
            name={patient.name}
            size={56}
          />

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.headerRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {patient.name}
              </Text>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            </View>

            {patient.mainCondition && (
              <Text style={[styles.condition, { color: colors.textSecondary }]} numberOfLines={1}>
                {patient.mainCondition}
              </Text>
            )}

            <View style={styles.row}>
              {patient.phone && (
                <View style={styles.rowItem}>
                  <Icon name="phone" size={12} color={colors.textSecondary} />
                  <Text style={[styles.rowText, { color: colors.textSecondary }]}>
                    {patient.phone}
                  </Text>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            {showProgress && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBackground, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${patient.progress || 0}%`,
                        backgroundColor: getProgressColor(),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {patient.progress || 0}%
                </Text>
              </View>
            )}

            {/* Last Visit */}
            {showLastVisit && daysSinceLastVisit !== null && (
              <View style={styles.lastVisit}>
                <Icon
                  name="calendar"
                  size={12}
                  color={daysSinceLastVisit > 30 ? colors.error : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.lastVisitText,
                    { color: daysSinceLastVisit > 30 ? colors.error : colors.textSecondary },
                  ]}
                >
                  {daysSinceLastVisit === 0
                    ? 'Última visita: hoje'
                    : daysSinceLastVisit === 1
                    ? 'Última visita: ontem'
                    : `Última visita: ${daysSinceLastVisit} dias`}
                </Text>
              </View>
            )}
          </View>

          {/* Chevron */}
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  condition: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowText: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  lastVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  lastVisitText: {
    fontSize: 11,
  },
});
