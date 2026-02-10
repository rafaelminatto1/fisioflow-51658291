import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColors } from '@/hooks/useColorScheme';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { AppointmentBase } from '@/types';

export type ViewMode = 'day' | 'week' | 'month';

interface CalendarViewProps {
    appointments: AppointmentBase[];
    date: Date;
    onDateChange: (date: Date) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}

export const CalendarView = ({
    appointments,
    date,
    onDateChange,
    viewMode,
    onViewModeChange
}: CalendarViewProps) => {
    const colors = useColors();

    const navigateDate = (direction: 'prev' | 'next') => {
        if (viewMode === 'day') {
            onDateChange(direction === 'prev' ? subDays(date, 1) : addDays(date, 1));
        } else if (viewMode === 'week') {
            onDateChange(direction === 'prev' ? subWeeks(date, 1) : addWeeks(date, 1));
        } else {
            onDateChange(direction === 'prev' ? subMonths(date, 1) : addMonths(date, 1));
        }
    };

    const renderHeader = () => (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.navigation}>
                <TouchableOpacity onPress={() => navigateDate('prev')} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.dateTitle, { color: colors.text }]}>
                    {viewMode === 'day'
                        ? format(date, "d 'de' MMMM", { locale: ptBR })
                        : viewMode === 'week'
                            ? `Semana ${format(startOfWeek(date), 'd/MM')} - ${format(endOfWeek(date), 'd/MM')}`
                            : format(date, 'MMMM yyyy', { locale: ptBR })}
                </Text>
                <TouchableOpacity onPress={() => navigateDate('next')} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={[styles.viewSwitcher, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                    <TouchableOpacity
                        key={mode}
                        style={[
                            styles.switchButton,
                            viewMode === mode && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => onViewModeChange(mode)}
                    >
                        <Text style={[
                            styles.switchText,
                            { color: viewMode === mode ? '#fff' : colors.textSecondary }
                        ]}>
                            {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {renderHeader()}
            <View style={styles.content}>
                {viewMode === 'day' && <DayView date={date} appointments={appointments} startHour={7} />}
                {viewMode === 'week' && <WeekView date={date} appointments={appointments} startHour={7} />}
                {viewMode === 'month' && (
                    <MonthView
                        selectedDate={date}
                        onSelectDate={(newDate) => {
                            onDateChange(newDate);
                            onViewModeChange('day'); // Switch to day view when a date is selected in month view
                        }}
                        appointments={appointments}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
    },
    navigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    navButton: {
        padding: 8,
    },
    dateTitle: {
        fontSize: 18,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    viewSwitcher: {
        flexDirection: 'row',
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    switchButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
    },
    switchText: {
        fontSize: 14,
        fontWeight: '500',
    },
    content: {
        flex: 1,
    }
});
