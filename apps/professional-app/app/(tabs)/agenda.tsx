import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useColors } from '@/hooks/useColorScheme';
import { useAppointments } from '@/hooks/useAppointments';
import { useHaptics } from '@/hooks/useHaptics';
import { CalendarView, ViewMode } from '@/components/calendar/CalendarView';

// Cache em memória para navegação rápida entre ranges de datas
const appointmentsCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5;

function getCacheKey(startDate: Date, endDate: Date): string {
  return `${startDate.toISOString()}-${endDate.toISOString()}`;
}

export default function AgendaScreen() {
  const colors = useColors();
  const { light } = useHaptics();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getFetchRange = useCallback(() => {
    if (viewMode === 'month') {
      return {
        startDate: startOfMonth(selectedDate),
        endDate: endOfMonth(selectedDate),
      };
    }
    return {
      startDate: startOfWeek(selectedDate, { weekStartsOn: 0 }),
      endDate: endOfWeek(selectedDate, { weekStartsOn: 0 }),
    };
  }, [viewMode, selectedDate]);

  const { startDate, endDate } = getFetchRange();
  const cacheKey = getCacheKey(startDate, endDate);
  const cached = appointmentsCache.get(cacheKey);
  const isCacheValid = cached && Date.now() - cached.timestamp < CACHE_TTL;

  const { data: appointments, isLoading, } = useAppointments({
    startDate,
    endDate,
    limit: 1000,
    refetchInterval: 30_000,
    initialData: isCacheValid ? cached.data : undefined,
  });

  useEffect(() => {
    if (appointments && appointments.length > 0) {
      appointmentsCache.set(cacheKey, { data: appointments, timestamp: Date.now() });
    }
  }, [appointments, cacheKey]);

  const showLoading = isLoading && !isCacheValid && !appointments?.length;

  const handleDateChange = useCallback((date: Date) => {
    light();
    setSelectedDate(date);
  }, [light]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    light();
    setViewMode(mode);
  }, [light]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Sincronizando agenda…</Text>
        </View>
      ) : (
        <CalendarView
          appointments={appointments ?? []}
          date={selectedDate}
          onDateChange={handleDateChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      )}

      {!showLoading && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => { light(); router.push('/appointment-form'); }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Novo Agendamento"
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
