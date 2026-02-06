import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from './Button';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';

export interface DatePickerProps {
  date: Date;
  onSelect: (date: Date) => void;
  onCancel: () => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({ date, onSelect, onCancel, minDate, maxDate }: DatePickerProps) {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = React.useState(date);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => {
    HapticFeedback.selection();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    HapticFeedback.selection();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleSelectDate = (selectedDate: Date) => {
    HapticFeedback.selection();
    onSelect(selectedDate);
  };

  const isSameMonth = (d1: Date, d2: Date) => {
    return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && isSameMonth(d, today);
  };

  const isSelected = (d: Date) => {
    return d.getDate() === date.getDate() && isSameMonth(d, date);
  };

  const getDaysForMonth = () => {
    const firstDay = monthStart.getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0

    return Array.from({ length: offset }, () => null).concat(days);
  };

  return (
    <Modal transparent visible animationType="slide">
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={prevMonth} style={styles.navButton}>
              <Icon name="chevron-left" size={24} color={colors.text} />
            </Pressable>

            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Text>

            <Pressable onPress={nextMonth} style={styles.navButton}>
              <Icon name="chevron-right" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdays}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Text key={day} style={[styles.weekday, { color: colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <ScrollView contentContainerStyle={styles.calendarGrid}>
            {getDaysForMonth().map((day, index) => {
              if (!day) {
                return <View key={index} style={styles.dayCell} />;
              }

              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => handleSelectDate(day)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    {
                      backgroundColor: selected ? colors.primary : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: selected ? '#fff' : colors.text },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {today && !selected && (
                    <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button variant="outline" size="sm" onPress={onCancel}>
              Cancelar
            </Button>
            <Text style={[styles.selectedDateText, { color: colors.text }]}>
              {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
