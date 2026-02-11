import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { TimeGrid } from './TimeGrid';
import { AppointmentBase } from '@/types';
import { router } from 'expo-router';
import { format } from 'date-fns';

interface DayViewProps {
    date: Date;
    appointments: AppointmentBase[];
    startHour?: number;
    endHour?: number;
}

const HOUR_HEIGHT = 60; // Must match TimeGrid

export const DayView = ({
    date,
    appointments,
    startHour = 7,
    endHour = 20
}: DayViewProps) => {
    const colors = useColors();

    const handleGridPress = (hour: number) => {
        // Navigate to appointment form with pre-filled date and time
        const dateStr = format(date, 'dd/MM/yyyy');
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        router.push(`/appointment-form?date=${dateStr}&time=${timeStr}` as any);
    };

    const renderAppointments = () => {
        return appointments
            .filter(apt => {
                // Robust date matching: compare local date components
                const aptDate = new Date(apt.date);
                const viewDate = date;
                
                return (
                    aptDate.getFullYear() === viewDate.getFullYear() &&
                    aptDate.getMonth() === viewDate.getMonth() &&
                    aptDate.getDate() === viewDate.getDate()
                );
            })
            .map((apt) => {
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
                                backgroundColor: colors.primary + '20', // transparent primary
                                borderColor: colors.primary,
                            }
                        ]}
                        onPress={() => router.push(`/appointment-form?id=${apt.id}` as any)}
                    >
                        <Text style={[styles.aptTitle, { color: colors.primary }]} numberOfLines={1}>
                            {apt.patientName}
                        </Text>
                        <Text style={[styles.aptTime, { color: colors.textSecondary }]}>
                            {apt.time || format(new Date(apt.date), 'HH:mm')} - {apt.type}
                        </Text>
                    </TouchableOpacity>
                );
            });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.gridContainer}>
                {/* Render grid lines and labels */}
                <TimeGrid startHour={startHour} endHour={endHour} rowHeight={HOUR_HEIGHT} />

                {/* Transparent touchable overlay for empty slots */}
                <View style={styles.touchableOverlay}>
                    {Array.from({ length: endHour - startHour + 1 }, (_, i) => {
                        const hour = startHour + i;
                        return (
                            <TouchableOpacity
                                key={`slot-${hour}`}
                                style={{ height: HOUR_HEIGHT, width: '100%' }}
                                onPress={() => handleGridPress(hour)}
                            />
                        );
                    })}
                </View>

                {/* Appointments Layer */}
                <View style={styles.appointmentsLayer} pointerEvents="box-none">
                    {renderAppointments()}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: 20,
    },
    gridContainer: {
        position: 'relative',
        paddingTop: 10,
    },
    touchableOverlay: {
        position: 'absolute',
        top: 10, // Match paddingTop of gridContainer if needed, but TimeGrid handles rows
        left: 50, // Match TimeGrid label width
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    appointmentsLayer: {
        position: 'absolute',
        top: 10,
        left: 50,
        right: 0,
        bottom: 0,
        zIndex: 2, // Above touchable overlay
    },
    appointmentItem: {
        position: 'absolute',
        left: 2,
        right: 2,
        borderRadius: 8,
        borderLeftWidth: 4,
        padding: 4,
        overflow: 'hidden',
    },
    aptTitle: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    aptTime: {
        fontSize: 10,
    },
});
