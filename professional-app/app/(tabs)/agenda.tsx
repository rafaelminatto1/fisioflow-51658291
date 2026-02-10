import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useColors } from '@/hooks/useColorScheme';
import { useAppointments } from '@/hooks/useAppointments';

console.log('[DEBUG] app/(tabs)/agenda.tsx: Loaded.');

import { useHaptics } from '@/hooks/useHaptics';
import { CalendarView, ViewMode } from '@/components/calendar/CalendarView';

// Simple in-memory cache for appointments across date range changes
interface CachedAppointments {
  data: any[];
  timestamp: number;
  startDate: string;
  endDate: string;
}

const appointmentsCache = new Map<string, CachedAppointments>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache - matches TanStack Query staleTime

function getCacheKey(startDate: Date, endDate: Date): string {
  return `${startDate.toISOString()}-${endDate.toISOString()}`;
}

export default function AgendaScreen() {
  // Force rebuild - Syncing new CalendarView
  const colors = useColors();
  const { light } = useHaptics();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate fetch range based on view mode
  const getFetchRange = useCallback(() => {
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
  }, [viewMode, selectedDate]);

  const { startDate, endDate } = getFetchRange();

  const fetchOptions = {
    startDate,
    endDate,
    limit: 1000, // Increase limit to fetch all appointments for the range
  };

  // Check cache for initial data
  const cacheKey = getCacheKey(startDate, endDate);
  const cached = appointmentsCache.get(cacheKey);
  const isCacheValid = cached && (Date.now() - cached.timestamp) < CACHE_TTL;

  // Use cached data as initialData for instant display
  const initialData = isCacheValid ? cached.data : undefined;

  // Enable Polling for "Realtime" updates (every 30 seconds)
  const { data: appointments, isLoading, refetch } = useAppointments({
    ...fetchOptions,
    refetchInterval: 30000,
    initialData,
  });

  // Update cache when data arrives
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      appointmentsCache.set(cacheKey, {
        data: appointments,
        timestamp: Date.now(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }
  }, [appointments, cacheKey, startDate, endDate]);

  // Pre-fetch adjacent date ranges for smoother navigation
  // Note: Prefetching is handled by QueryClient's internal caching

  // Show loading only on first mount with no cache
  const showLoading = isLoading && !initialData && (!appointments || appointments.length === 0);

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
      {showLoading ? (
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
