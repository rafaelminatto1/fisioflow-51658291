import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { AppointmentBase } from '@/types';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  appointments: AppointmentBase[];
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const MonthView = ({
  selectedDate,
  onSelectDate,
  appointments,
}: MonthViewProps) => {
  const colors = useColors();

  const appointmentMetadata = useMemo(() => {
    const map = new Map<string, { hasGroup: boolean; hasUnlimited: boolean; count: number }>();
    appointments.forEach((apt) => {
      const dateKey = format(new Date(apt.date), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || { hasGroup: false, hasUnlimited: false, count: 0 };
      map.set(dateKey, {
        hasGroup: existing.hasGroup || !!apt.isGroup,
        hasUnlimited: existing.hasUnlimited || !!apt.isUnlimited,
        count: existing.count + 1,
      });
    });
    return map;
  }, [appointments]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const rangeStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let current = rangeStart;

    while (current <= rangeEnd) {
      days.push(current);
      current = addDays(current, 1);
    }

    return days;
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <Text style={[styles.monthTitle, { color: colors.text }]}>
        {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
      </Text>

      <View style={styles.weekHeader}>
        {WEEK_DAYS.map((day) => (
          <Text key={day} style={[styles.weekLabel, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const inMonth = isSameMonth(day, selectedDate);
          const dateKey = format(day, "yyyy-MM-dd");
          const meta = appointmentMetadata.get(dateKey);

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: colors.primary },
              ]}
              onPress={() => onSelectDate(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: isSelected
                      ? "#fff"
                      : inMonth
                        ? colors.text
                        : colors.textMuted,
                  },
                ]}
              >
                {format(day, "d")}
              </Text>
              <View style={styles.dotContainer}>
                {meta && (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isSelected
                          ? "#fff"
                          : meta.hasUnlimited || meta.hasGroup
                            ? "#6366f1" // Indigo for special sessions
                            : colors.primary,
                      },
                    ]}
                  />
                )}
                {meta && meta.hasUnlimited && (
                  <View
                    style={[
                      styles.tinyBadge,
                      {
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.3)"
                          : "#6366f120",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tinyBadgeText,
                        { color: isSelected ? "#fff" : "#6366f1" },
                      ]}
                    >
                      ∞
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  tinyBadge: {
    paddingHorizontal: 2,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinyBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
});
