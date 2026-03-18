/**
 * Dashboard Screen - Patient App
 * Home screen with today's exercises, appointments, and quick actions
 * Refactored with extracted sub-components and performance optimizations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { useGamification } from '@/hooks/useGamification';
import { Card, NotificationPermissionModal, SyncIndicator } from '@/components';
import { Spacing } from '@/constants/spacing';
import * as Notifications from 'expo-notifications';
import { useExercises } from '@/hooks/useExercises';
import { useAppointments } from '@/hooks/useAppointments';
import {
  DashboardHeader,
  XPProgressBar,
  StatCard,
  ExercisesSection,
  AppointmentCard,
  QuickActions,
} from '@/components/DashboardComponents';
import { useFormattedDate } from '@/hooks/useFormattedDate';

const SCREEN_PADDING = Spacing.screen;
const CARD_GAP = Spacing.gap;
const HALF_CARD_WIDTH = (Dimensions.get('window').width - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const FULL_CARD_WIDTH = Dimensions.get('window').width - SCREEN_PADDING * 2;

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const { currentLevel, currentXp, xpPerLevel, progressPercentage, isLoading: gamificationLoading } = useGamification();
  const { data: exercises = [], isLoading: exercisesLoading } = useExercises();
  const { data: upcomingAppointments = [], isLoading: appointmentsLoading } = useAppointments(true);
  const { format, getRelativeDay, formatAppointment } = useFormattedDate();

  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('notificationPromptShown').then(async (value) => {
      if (!value && user?.id) {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'undetermined') {
          setShowNotificationPrompt(true);
        }
      }
    });
  }, [user?.id]);

  const handleEnableNotifications = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      await AsyncStorage.setItem('notificationPromptShown', 'true');
    }
    setShowNotificationPrompt(false);
  }, []);

  const getTodayLabel = useCallback(() => {
    const today = format(new Date(), { format: 'full' });
    return today.charAt(0).toUpperCase() + today.slice(1);
  }, [format]);

  const completedCount = useMemo(() => exercises.filter(e => e.completed).length, [exercises]);
  const totalCount = useMemo(() => exercises.length, [exercises]);
  const progress = useMemo(() => totalCount > 0 ? (completedCount / totalCount) * 100 : 0, [totalCount, completedCount]);
  const xpRemaining = useMemo(() => Math.max(xpPerLevel - currentXp, 0), [xpPerLevel, currentXp]);
  const nextAppointment = useMemo(() => upcomingAppointments[0], [upcomingAppointments]);
  const streak = 0;

  const getNextAppointmentLabel = useCallback(() => {
    if (!nextAppointment) return null;

    const apptDate = new Date(nextAppointment.date);
    if (isNaN(apptDate.getTime())) return null;

    return formatAppointment(apptDate, nextAppointment.time);
  }, [nextAppointment, formatAppointment]);

  const isLoading = gamificationLoading || exercisesLoading || appointmentsLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <SyncIndicator />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader />

        <Text style={[styles.date, { color: colors.text }]}>
          {getTodayLabel()}
        </Text>

        <XPProgressBar
          currentXp={currentXp}
          xpPerLevel={xpPerLevel}
          progressPercentage={progressPercentage}
        />

        {isLoading ? (
          <View style={styles.loadingPlaceholder}>
            <Card style={styles.placeholderCard}>
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                Carregando suas informações...
              </Text>
            </Card>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                icon="checkmark-circle"
                label="Feitos hoje"
                value={`${completedCount}/${totalCount}`}
                color={progress === 100 ? colors.success : colors.primary}
                colors={colors}
              />
              <StatCard
                icon="flame"
                label="Sequência"
                value={`${streak} dias`}
                color={colors.warning}
                colors={colors}
              />
              <StatCard
                icon="calendar"
                label="Próxima consulta"
                value={getNextAppointmentLabel() || '--'}
                color={colors.info}
                colors={colors}
                fullWidth
              />
            </View>

            <ExercisesSection
              exercises={exercises}
              completedCount={completedCount}
              totalCount={totalCount}
              progress={progress}
              colors={colors}
            />

            <AppointmentCard
              nextAppointment={nextAppointment}
              colors={colors}
              getNextAppointmentLabel={getNextAppointmentLabel}
            />

            <QuickActions />
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <NotificationPermissionModal
        visible={showNotificationPrompt}
        onClose={() => setShowNotificationPrompt(false)}
        onEnable={handleEnableNotifications}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screen,
    paddingBottom: 32,
  },
  date: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  loadingPlaceholder: {
    padding: 40,
  },
  placeholderCard: {
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 20,
  },
  bottomSpacing: {
    height: 16,
  },
});
