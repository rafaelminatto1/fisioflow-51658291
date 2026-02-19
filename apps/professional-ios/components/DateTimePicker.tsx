import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';

export interface DateTimePickerProps {
  date: Date;
  time: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const { colors } = useTheme();
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Generate date options (7 days before and after)
  const dateOptions = Array.from({ length: 15 }, (_, i) => {
    return subDays(date, 7 - i);
  });

  const handleDateSelect = (selectedDate: Date) => {
    HapticFeedback.selection();
    onDateChange(selectedDate);
  };

  const handleTimePress = () => {
    if (Platform.OS === 'android') {
      showAndroidTimePicker();
    } else {
      setShowTimePicker(true);
    }
  };

  const showAndroidTimePicker = () => {
    const [hours, minutes] = time.split(':').map(Number);
    const baseDate = new Date();
    baseDate.setHours(hours, minutes, 0, 0);

    DateTimePickerAndroid.open({
      value: baseDate,
      mode: 'time',
      is24Hour: true,
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          const newTime = format(selectedDate, 'HH:mm');
          onTimeChange(newTime);
          HapticFeedback.selection();
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Date Selector */}
      <View style={styles.dateSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Data</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScroll}
        >
          {dateOptions.map((dateOption) => {
            const isSelected = dateOption.toDateString() === date.toDateString();
            const isToday = dateOption.toDateString() === new Date().toDateString();
            const isPast = dateOption < new Date().setHours(0, 0, 0, 0);

            return (
              <Pressable
                key={dateOption.toISOString()}
                onPress={() => handleDateSelect(dateOption)}
                style={({ pressed }) => [
                  styles.dateItem,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    opacity: isPast ? 0.5 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateDay,
                    { color: isSelected ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {format(dateOption, 'EEE', { locale: ptBR })}
                </Text>
                <Text
                  style={[
                    styles.dateNumber,
                    { color: isSelected ? '#fff' : colors.text },
                  ]}
                >
                  {format(dateOption, 'd')}
                </Text>
                {isToday && !isSelected && (
                  <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Time Selector */}
      <View style={styles.timeSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Horário</Text>
        <Pressable
          onPress={handleTimePress}
          style={({ pressed }) => [
            styles.timeSelector,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Icon name="clock" size={20} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.text }]}>{time}</Text>
          <Icon name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Quick Time Options */}
        <View style={styles.quickTimes}>
          {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((timeOption) => (
            <Pressable
              key={timeOption}
              onPress={() => {
                HapticFeedback.selection();
                onTimeChange(timeOption);
              }}
              style={({ pressed }) => [
                styles.quickTimeChip,
                {
                  backgroundColor: time === timeOption ? colors.primary : colors.card,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.quickTimeText,
                  { color: time === timeOption ? '#fff' : colors.text },
                ]}
              >
                {timeOption}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* iOS Time Picker Modal */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal
          transparent
          visible={showTimePicker}
          onRequestClose={() => setShowTimePicker(false)}
          animationType="slide"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowTimePicker(false)}
          >
            <Pressable style={styles.modalContent}>
              <View style={styles.timePickerHeader}>
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.modalButton, { color: colors.primary }]}>Cancelar</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar horário</Text>
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.modalButton, { color: colors.primary }]}>Confirmar</Text>
                </Pressable>
              </View>
              {/* iOS time picker would go here */}
              <View style={styles.timeOptionsGrid}>
                {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
                  <View key={hour} style={styles.hourColumn}>
                    {['00', '15', '30', '45'].map((minute) => {
                      const timeOption = `${hour.toString().padStart(2, '0')}:${minute}`;
                      return (
                        <Pressable
                          key={minute}
                          onPress={() => {
                            onTimeChange(timeOption);
                            setShowTimePicker(false);
                            HapticFeedback.selection();
                          }}
                        >
                          <Text
                            style={[
                              styles.timeOptionText,
                              { color: time === timeOption ? colors.primary : colors.text },
                            ]}
                          >
                            {timeOption}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  dateSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateScroll: {
    gap: 10,
  },
  dateItem: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  timeSection: {
    gap: 12,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  quickTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTimeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickTimeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeOptionsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  hourColumn: {
    flex: 1,
    gap: 4,
  },
  timeOptionText: {
    fontSize: 15,
    paddingVertical: 8,
    textAlign: 'center',
  },
});
