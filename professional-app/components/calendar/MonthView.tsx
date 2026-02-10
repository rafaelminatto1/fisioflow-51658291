import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useColors } from '@/hooks/useColorScheme';
import { AppointmentBase } from '@/types';
import { format } from 'date-fns';

interface MonthViewProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    appointments: AppointmentBase[];
}

export const MonthView = ({
    selectedDate,
    onSelectDate,
    appointments
}: MonthViewProps) => {
    const colors = useColors();

    const markedDates = appointments.reduce((acc, apt) => {
        const dateStr = format(new Date(apt.date), 'yyyy-MM-dd');
        acc[dateStr] = { marked: true, dotColor: colors.primary };
        return acc;
    }, {} as any);

    markedDates[format(selectedDate, 'yyyy-MM-dd')] = {
        ...markedDates[format(selectedDate, 'yyyy-MM-dd')],
        selected: true,
        selectedColor: colors.primary,
    };

    return (
        <View style={styles.container}>
            <Calendar
                current={format(selectedDate, 'yyyy-MM-dd')}
                onDayPress={(day: any) => {
                    const newDate = new Date(day.timestamp);
                    // Adjust for timezone offset if necessary, keeping it simple for now
                    // Assuming local time for simplicity or UTC
                    const adjustedDate = new Date(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate());
                    onSelectDate(adjustedDate);
                }}
                markedDates={markedDates}
                theme={{
                    backgroundColor: colors.background,
                    calendarBackground: colors.background,
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: colors.primary,
                    dayTextColor: colors.text,
                    textDisabledColor: colors.textMuted,
                    dotColor: colors.primary,
                    selectedDotColor: '#ffffff',
                    arrowColor: colors.primary,
                    monthTextColor: colors.text,
                    indicatorColor: colors.primary,
                    textDayFontWeight: '300',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '300',
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 16
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
