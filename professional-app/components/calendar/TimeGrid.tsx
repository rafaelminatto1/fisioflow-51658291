import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

interface TimeGridProps {
    startHour?: number;
    endHour?: number;
    rowHeight?: number;
}

export const TimeGrid = ({
    startHour = 7,
    endHour = 20,
    rowHeight = 60
}: TimeGridProps) => {
    const colors = useColors();
    const hours = Array.from(
        { length: endHour - startHour + 1 },
        (_, i) => startHour + i
    );

    return (
        <View style={styles.container}>
            {hours.map((hour) => (
                <View key={hour} style={[styles.row, { height: rowHeight }]}>
                    <View style={styles.timeLabelContainer}>
                        <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                            {`${hour.toString().padStart(2, '0')}:00`}
                        </Text>
                    </View>
                    <View style={[styles.gridLine, { borderTopColor: colors.border }]} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center', // Change to 'flex-start' if we want the line at the top of the hour
    },
    timeLabelContainer: {
        width: 50,
        alignItems: 'flex-end',
        paddingRight: 8,
        transform: [{ translateY: -10 }], // Center label on the line
    },
    timeLabel: {
        fontSize: 12,
    },
    gridLine: {
        flex: 1,
        borderTopWidth: 1,
        height: '100%',
    },
});
