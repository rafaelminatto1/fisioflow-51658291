import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { useColors } from '@/hooks/useColorScheme';
import { useAppointments } from '@/hooks/useAppointments';

console.log('[DEBUG] app/(tabs)/agenda.tsx: Loaded.');

import { useHaptics } from '@/hooks/useHaptics';
import { CalendarView, ViewMode } from '@/components/calendar/CalendarView';

export default function AgendaScreen() {
  // Force rebuild - Syncing new CalendarView
  const colors = useColors();
  const { light } = useHaptics();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate fetch range based on view mode
  const getFetchRange = () => {
    if (viewMode === 'month') {
      return {
        startDate: startOfMonth(selectedDate),
        endDate: endOfMonth(selectedDate),
      };
    }
    // For day and week views, fetch the week
    return {
      startDate: startOfWeek(selectedDate, { weekStartsOn: 0 }),
      endDate: endOfWeek(selectedDate, { weekStartsOn: 0 }),
    };
  };

  const { startDate, endDate } = getFetchRange();

  const fetchOptions = {
    startDate,
    endDate,
    limit: 1000, // Increase limit to fetch all appointments for the range
  };

  // Enable Polling for "Realtime" updates (every 30 seconds)
  const { data: appointments, isLoading, refetch } = useAppointments({
    ...fetchOptions,
    refetchInterval: 30000,
  });

  console.log(' AgendaScreen: Display appointments count:', appointments?.length);

  const handleDateChange = (date: Date) => {
    light();
    setSelectedDate(date);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    light();
    setViewMode(mode);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando agenda...</Text>
        </View>
      ) : (
        <CalendarView
          appointments={appointments || []}
          date={selectedDate}
          onDateChange={handleDateChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  }
});
