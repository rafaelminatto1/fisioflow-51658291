import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { AppointmentCard } from '@/components/ui/AppointmentCard';
import { FilterChip } from '@/components/ui/FilterChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { useAppointments } from '@/hooks/useAppointments';
import { HapticFeedback } from '@/lib/haptics';
import type { AppointmentStatus, AppointmentType } from '@/types';

const { width } = Dimensions.get('window');

type CalendarView = 'day' | 'week' | 'month';

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
];

const getStatusFilters = (colors: any) => [
  { value: 'all' as const, label: 'Todos', color: '#6b7280' },
  { value: 'agendado' as const, label: 'Agendados', color: colors.primary },
  { value: 'confirmado' as const, label: 'Confirmados', color: '#22c55e' },
  { value: 'em_andamento' as const, label: 'Em Andamento', color: '#f59e0b' },
  { value: 'concluido' as const, label: 'Concluídos', color: '#10b981' },
  { value: 'cancelado' as const, label: 'Cancelados', color: '#ef4444' },
];

const TYPE_FILTERS: { value: AppointmentType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'Consulta Inicial', label: 'Consulta Inicial' },
  { value: 'Fisioterapia', label: 'Fisioterapia' },
  { value: 'Reavaliação', label: 'Reavaliação' },
  { value: 'Avaliação Funcional', label: 'Avaliação Funcional' },
];

export default function AgendaScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: appointments, isLoading, refetch } = useAppointments();

  const [selectedView, setSelectedView] = useState<CalendarView>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AppointmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate week dates
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments?.filter(apt => {
      const aptDate = parseISO(apt.date as string);

      // Date filter based on view
      let dateMatch = true;
      if (selectedView === 'day') {
        dateMatch = isSameDay(aptDate, selectedDate);
      } else if (selectedView === 'week') {
        dateMatch = weekDates.some(d => isSameDay(aptDate, d));
      }
      // Month view shows all (filtered by month in real implementation)

      // Status filter
      const statusMatch = statusFilter === 'all' || apt.status === statusFilter;

      // Type filter
      const typeMatch = typeFilter === 'all' || apt.type === typeFilter;

      // Search filter
      const searchMatch = !searchQuery ||
        apt.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.type?.toLowerCase().includes(searchQuery.toLowerCase());

      return dateMatch && statusMatch && typeMatch && searchMatch;
    }) || [];
  }, [appointments, selectedDate, selectedView, weekDates, statusFilter, typeFilter, searchQuery]);

  // Group appointments by date for week view
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, typeof filteredAppointments>();
    weekDates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      grouped.set(dateStr, filteredAppointments.filter(apt =>
        isSameDay(parseISO(apt.date as string), date)
      ));
    });
    return grouped;
  }, [filteredAppointments, weekDates]);

  const handleViewChange = useCallback((view: CalendarView) => {
    HapticFeedback.selection();
    setSelectedView(view);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    HapticFeedback.light();
    setSelectedDate(date);
    if (selectedView === 'month') {
      setSelectedView('day');
    }
  }, [selectedView]);

  const handleNewAppointment = useCallback(() => {
    HapticFeedback.light();
    router.push('/agenda/new');
  }, [router]);

  const handleAppointmentPress = useCallback((appointmentId: string) => {
    HapticFeedback.light();
    router.push(`/agenda/${appointmentId}`);
  }, [router]);

  const handleStartSession = useCallback((appointmentId: string) => {
    HapticFeedback.medium();
    router.push(`/agenda/${appointmentId}/start`);
  }, [router]);

  const handleStartEvaluation = useCallback((appointmentId: string) => {
    HapticFeedback.medium();
    router.push(`/agenda/${appointmentId}/evaluate`);
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Agenda</Text>
          <Button
            variant="primary"
            size="sm"
            onPress={handleNewAppointment}
            leftIcon={<Icon name="plus" size={18} color="#fff" />}
          >
            Novo
          </Button>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar paciente ou tipo..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="x-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* View Selector */}
        <View style={styles.viewSelector}>
          {VIEW_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => handleViewChange(option.value)}
              style={({ pressed }) => [
                styles.viewOption,
                {
                  backgroundColor: selectedView === option.value ? colors.primary : colors.card,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.viewOptionText,
                  { color: selectedView === option.value ? '#fff' : colors.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Date Selector */}
        {selectedView === 'day' && (
          <DayDateSelector
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            colors={colors}
          />
        )}

        {selectedView === 'week' && (
          <WeekDateSelector
            weekDates={weekDates}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            appointmentsByDate={appointmentsByDate}
            colors={colors}
          />
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {getStatusFilters(colors).map((filter) => (
              <FilterChip
                key={filter.value}
                label={filter.label}
                selected={statusFilter === filter.value}
                color={filter.color}
                onPress={() => setStatusFilter(filter.value)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {TYPE_FILTERS.map((filter) => (
              <FilterChip
                key={filter.value}
                label={filter.label}
                selected={typeFilter === filter.value}
                color={colors.primary}
                onPress={() => setTypeFilter(filter.value)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Appointments List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon="calendar-x"
            title="Nenhum agendamento encontrado"
            message="Tente ajustar os filtros ou criar um novo agendamento"
            actionLabel="Novo Agendamento"
            onAction={handleNewAppointment}
          />
        ) : (
          <View style={styles.appointmentsList}>
            {selectedView === 'week' ? (
              // Week view: grouped by date
              weekDates.map((date) => {
                const dateAppointments = appointmentsByDate.get(format(date, 'yyyy-MM-dd')) || [];
                if (dateAppointments.length === 0) return null;

                return (
                  <Animated.View key={format(date, 'yyyy-MM-dd')} entering={FadeIn}>
                    <Text style={[styles.dateGroupTitle, { color: colors.textSecondary }]}>
                      {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </Text>
                    {dateAppointments.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onPress={() => handleAppointmentPress(apt.id)}
                        onStartSession={() => handleStartSession(apt.id)}
                        onStartEvaluation={() => handleStartEvaluation(apt.id)}
                        style={styles.appointmentCard}
                      />
                    ))}
                  </Animated.View>
                );
              })
            ) : (
              // Day view: flat list
              filteredAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onPress={() => handleAppointmentPress(apt.id)}
                  onStartSession={() => handleStartSession(apt.id)}
                  onStartEvaluation={() => handleStartEvaluation(apt.id)}
                  style={styles.appointmentCard}
                />
              ))
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleNewAppointment}
        hitSlop={16}
      >
        <Icon name="plus" size={24} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

// Day Date Selector Component
function DayDateSelector({
  selectedDate,
  onDateSelect,
  colors,
}: {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  colors: any;
}) {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i - 3); // Show 3 days before and after today
    return date;
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateSelectorScroll}
    >
      {dates.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());

        return (
          <Pressable
            key={date.toISOString()}
            onPress={() => onDateSelect(date)}
            style={({ pressed }) => [
              styles.dateItem,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                opacity: pressed ? 0.8 : 1,
                borderWidth: isToday && !isSelected ? 2 : 0,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.dateItemDay,
                { color: isSelected ? '#fff' : colors.text },
              ]}
            >
              {format(date, 'EEE', { locale: ptBR })}
            </Text>
            <Text
              style={[
                styles.dateItemDate,
                { color: isSelected ? '#fff' : colors.text },
              ]}
            >
              {format(date, 'd')}
            </Text>
            {isToday && !isSelected && (
              <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Week Date Selector Component
function WeekDateSelector({
  weekDates,
  selectedDate,
  onDateSelect,
  appointmentsByDate,
  colors,
}: {
  weekDates: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointmentsByDate: Map<string, any[]>;
  colors: any;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateSelectorScroll}
    >
      {weekDates.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());
        const hasAppointments = (appointmentsByDate.get(format(date, 'yyyy-MM-dd')) || []).length > 0;

        return (
          <Pressable
            key={date.toISOString()}
            onPress={() => onDateSelect(date)}
            style={({ pressed }) => [
              styles.weekDateItem,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                opacity: pressed ? 0.8 : 1,
                borderWidth: isToday && !isSelected ? 2 : 0,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.weekDateItemDay,
                { color: isSelected ? '#fff' : colors.text },
              ]}
            >
              {format(date, 'EEE', { locale: ptBR })}
            </Text>
            <Text
              style={[
                styles.weekDateItemDate,
                { color: isSelected ? '#fff' : colors.text },
              ]}
            >
              {format(date, 'd')}
            </Text>
            {hasAppointments && (
              <View style={[styles.appointmentDot, { backgroundColor: isSelected ? '#fff' : colors.primary }]} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  viewSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  viewOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateSelectorScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dateItem: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  dateItemDay: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateItemDate: {
    fontSize: 20,
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  weekDateItem: {
    width: 56,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  weekDateItemDay: {
    fontSize: 11,
    fontWeight: '500',
  },
  weekDateItemDate: {
    fontSize: 18,
    fontWeight: '700',
  },
  appointmentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  filtersContainer: {
    paddingVertical: 8,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  appointmentsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  dateGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  appointmentCard: {
    marginHorizontal: 0,
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
