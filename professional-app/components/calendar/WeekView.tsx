import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { TimeGrid } from './TimeGrid';
import { AppointmentBase } from '@/types';
import { router } from 'expo-router';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';

interface WeekViewProps {
    date: Date;
    appointments: AppointmentBase[];
    startHour?: number;
    endHour?: number;
}

const HOUR_HEIGHT = 60; // Must match TimeGrid

export const WeekView = ({
    date,
    appointments,
    startHour = 7,
    endHour = 20
}: WeekViewProps) => {
    const colors = useColors();
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const handleGridPress = (day: Date, hour: number) => {
        const dateStr = format(day, 'dd/MM/yyyy');
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        router.push(`/appointment-form?date=${dateStr}&time=${timeStr}` as any);
    };

    const getAppointmentsForDay = (day: Date) => {
        return appointments.filter(apt => {
            const aptDateObj = new Date(apt.date);
            const aptDateStr = aptDateObj.toISOString().split('T')[0];
            const viewDateStr = format(day, 'yyyy-MM-dd');
            return aptDateStr === viewDateStr;
        });
    };

    return (
        <View style={styles.container}>
            {/* Week Header */}
            <View style={styles.header}>
                <View style={styles.timeColumnHeader} />
                {weekDays.map((day) => (
                    <View key={day.toISOString()} style={styles.dayHeader}>
                        <Text style={[styles.dayName, { color: colors.textSecondary }]}>
                            {format(day, 'EEE')}
                        </Text>
                        <Text style={[styles.dayNumber, { color: isSameDay(day, new Date()) ? colors.primary : colors.text }]}>
                            {format(day, 'd')}
                        </Text>
                    </View>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.gridContainer}>
                    {/* Time Grid (Background) */}
                    <TimeGrid startHour={startHour} endHour={endHour} rowHeight={HOUR_HEIGHT} />

                    {/* Columns Overlay */}
                    <View style={styles.columnsContainer}>
                        {weekDays.map((day, dayIndex) => (
                            <View key={day.toISOString()} style={styles.dayColumn}>
                                {/* Touchable slots for each hour */}
                                {Array.from({ length: endHour - startHour + 1 }, (_, hourIndex) => {
                                    const hour = startHour + hourIndex;
                                    return (
                                        <TouchableOpacity
                                            key={`slot-${dayIndex}-${hour}`}
                                            style={{ height: HOUR_HEIGHT, width: '100%', borderRightWidth: 1, borderRightColor: colors.border }}
                                            onPress={() => handleGridPress(day, hour)}
                                        />
                                    );
                                })}

                                {/* Render Appointments for this day */}
                                {getAppointmentsForDay(day).map((apt) => {
                                    let hour = 0;
                                    let minutes = 0;

                                    if (apt.time) {
                                        const [h, m] = apt.time.split(':').map(Number);
                                        hour = h;
                                        minutes = m;
                                    } else {
                                        const aptDate = new Date(apt.date);
                                        hour = aptDate.getHours();
                                        minutes = aptDate.getMinutes();
                                    }

                                    if (hour < startHour || hour > endHour) return null;

                                    const top = (hour - startHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
                                    const height = (apt.duration / 60) * HOUR_HEIGHT;

                                    return (
                                        <TouchableOpacity
                                            key={apt.id}
                                            style={[
                                                styles.appointmentItem,
                                                {
                                                    top,
                                                    height,
                                                    backgroundColor: colors.primary,
                                                    borderRadius: 4,
                                                }
                                            ]}
                                            onPress={() => router.push(`/appointment-form?id=${apt.id}` as any)}
                                        >
                                            {/* Minimal content for week view due to narrow space */}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        height: 50,
        borderBottomWidth: 1,
        borderColor: '#e5e5e5',
    },
    timeColumnHeader: {
        width: 50,
    },
    dayHeader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayName: {
        fontSize: 10,
        textTransform: 'uppercase',
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    gridContainer: {
        position: 'relative',
    },
    columnsContainer: {
        position: 'absolute',
        top: 0,
        left: 50, // After time labels
        right: 0,
        bottom: 0,
        flexDirection: 'row',
    },
    dayColumn: {
        flex: 1,
        position: 'relative',
    },
    appointmentItem: {
        position: 'absolute',
        left: 1,
        right: 1,
        padding: 2,
        zIndex: 10,
    },
});
