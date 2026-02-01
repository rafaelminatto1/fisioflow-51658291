import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from './Button';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';

export interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const { colors } = useTheme();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const monthsDiff = differenceInMonths(endDate, startDate) + 1;

  const handleQuickSelect = useCallback((months: number) => {
    HapticFeedback.selection();
    const now = new Date();
    onStartDateChange(startOfMonth(now));
    onEndDateChange(endOfMonth(addMonths(now, months - 1)));
  }, [onStartDateChange, onEndDateChange]);

  return (
    <View style={styles.container}>
      {/* Start Date */}
      <Pressable onPress={() => setShowStartPicker(true)}>
        <View style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="calendar" size={20} color={colors.primary} />
          <View style={styles.dateInfo}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Data Início</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{format(startDate, "dd 'de' MMMM", { locale: ptBR })}</Text>
          </View>
          <Icon name="chevron-down" size={20} color={colors.textSecondary} />
        </View>
      </Pressable>

      {/* End Date */}
      <Pressable onPress={() => setShowEndPicker(true)}>
        <View style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="calendar" size={20} color={colors.primary} />
          <View style={styles.dateInfo}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Data Fim</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{format(endDate, "dd 'de' MMMM", { locale: ptBR })}</Text>
          </View>
          <Icon name="chevron-down" size={20} color={colors.textSecondary} />
        </View>
      </Pressable>

      {/* Duration Display */}
      <View style={[styles.durationDisplay, { backgroundColor: colors.card }]}>
        <Icon name="clock" size={16} color={colors.textSecondary} />
        <Text style={[styles.durationText, { color: colors.text }]}>
          {monthsDiff} mês{monthsDiff !== 1 ? 'es' : ''}
        </Text>
      </View>

      {/* Quick Select */}
      <Text style={[styles.quickSelectLabel, { color: colors.textSecondary }]}>Seleção Rápida</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickSelectScroll}>
        <QuickSelectChip label="Este Mês" onPress={() => handleQuickSelect(1)} colors={colors} />
        <QuickSelectChip label="Último Mês" onPress={() => handleQuickSelect(1)} colors={colors} />
        <QuickSelectChip label="Últimos 3 Meses" onPress={() => handleQuickSelect(3)} colors={colors} />
        <QuickSelectChip label="Últimos 6 Meses" onPress={() => handleQuickSelect(6)} colors={colors} />
        <QuickSelectChip label="Este Ano" onPress={() => handleQuickSelect(12)} colors={colors} />
      </ScrollView>

      {/* Start Date Picker Modal */}
      <MonthYearPicker
        visible={showStartPicker}
        selectedDate={startDate}
        onSelect={(date) => {
          onStartDateChange(date);
          setShowStartPicker(false);
          HapticFeedback.selection();
        }}
        onCancel={() => setShowStartPicker(false)}
        minDate={minDate}
        maxDate={maxDate || endDate}
        colors={colors}
      />

      {/* End Date Picker Modal */}
      <MonthYearPicker
        visible={showEndPicker}
        selectedDate={endDate}
        onSelect={(date) => {
          onEndDateChange(endOfMonth(date));
          setShowEndPicker(false);
          HapticFeedback.selection();
        }}
        onCancel={() => setShowEndPicker(false)}
        minDate={startDate}
        maxDate={maxDate}
        colors={colors}
      />
    </View>
  );
}

function QuickSelectChip({ label, onPress, colors }: { label: string; onPress: () => void; colors: any }) {
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.quickSelectChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.quickSelectChipText, { color: colors.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function MonthYearPicker({
  visible,
  selectedDate,
  onSelect,
  onCancel,
  minDate,
  maxDate,
  colors,
}: {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onCancel: () => void;
  minDate?: Date;
  maxDate?: Date;
  colors: any;
}) {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate);

  const goToPrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    if (!minDate || newMonth >= minDate) {
      setCurrentMonth(newMonth);
      HapticFeedback.selection();
    }
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    if (!maxDate || newMonth <= maxDate) {
      setCurrentMonth(newMonth);
      HapticFeedback.selection();
    }
  };

  const handleSelectMonth = () => {
    onSelect(currentMonth);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = monthEnd.getDate();

  return (
    <Modal transparent visible animationType="slide">
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.pickerContent}>
          <View style={styles.pickerHeader}>
            <Pressable onPress={goToPrevMonth} style={styles.navButton}>
              <Icon name="chevron-left" size={24} color={colors.text} />
            </Pressable>

            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Text>

            <Pressable onPress={goToNextMonth} style={styles.navButton}>
              <Icon name="chevron-right" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdays}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day) => (
              <Text key={day} style={[styles.weekdayText, { color: colors.textSecondary }]}>{day}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: monthStart.getDay() || 7 }, (_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date().setHours(0, 0, 0, 0);
              const isFuture = date > (maxDate || new Date(2099, 11, 31));
              const isBeforeMin = minDate && date < minDate;

              return (
                <Pressable
                  key={i}
                  onPress={handleSelectMonth}
                  disabled={isBeforeMin || isFuture}
                  style={({ pressed }) => [
                    styles.dayCell,
                    {
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      opacity: isPast ? 0.4 : isBeforeMin ? 0.2 : isFuture ? 0.4 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? '#fff'
                          : isBeforeMin || isFuture
                          ? colors.textSecondary
                          : colors.text,
                        fontWeight: isToday ? '700' : '400',
                      },
                    ]}
                  >
                    {i + 1}
                  </Text>
                  {isToday && !isSelected && (
                    <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.pickerFooter}>
            <Button variant="outline" size="sm" onPress={onCancel}>
              Cancelar
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickSelectLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  quickSelectScroll: {
    gap: 10,
  },
  quickSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickSelectChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 15,
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pickerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
