/**
 * Dashboard Screen - Patient App
 * Home screen with today's exercises, appointments, and quick actions
 */

import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { useGamification } from '@/hooks/useGamification';
import { Card, NotificationPermissionModal, SyncIndicator, LinearProgress } from '@/components';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as Notifications from 'expo-notifications';

interface TodayExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  completed: boolean;
}

interface TodayPlan {
  id: string;
  name: string;
  exercises: TodayExercise[];
}

interface Appointment {
  id: string;
  date: any; // Firestore Timestamp
  time: string;
  type: string;
  professional_name: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { id: '1', label: 'Exercícios', icon: 'barbell-outline', route: '/(tabs)/exercises', color: '#22c55e' },
  { id: '2', label: 'Evoluções', icon: 'trending-up-outline', route: '/(tabs)/progress', color: '#3b82f6' },
  { id: '3', label: 'Consultas', icon: 'calendar-outline', route: '/(tabs)/appointments', color: '#8b5cf6' },
  { id: '4', label: 'Perfil', icon: 'person-outline', route: '/(tabs)/profile', color: '#ec4899' },
];

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const { currentLevel, currentXp, xpPerLevel, progressPercentage } = useGamification(user?.id);

  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Check if notification prompt was already shown
    AsyncStorage.getItem('notificationPromptShown').then(async (value) => {
      if (!value && user?.id) {
        // Check current permission status
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'undetermined') {
          setShowNotificationPrompt(true);
        }
      }
    });
  }, [user?.id]);

  const handleEnableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      await AsyncStorage.setItem('notificationPromptShown', 'true');
    }
    setShowNotificationPrompt(false);
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Fetch today's exercise plan from root patient_exercises or soap_records exercises
    const exercisesRef = collection(db, 'patient_exercises');
    const exercisesQuery = query(
      exercisesRef,
      where('patientId', '==', user.id),
      orderBy('prescribedAt', 'desc'),
      limit(10)
    );

    const unsubscribePlans = onSnapshot(exercisesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const exercises = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as any));
        
        setTodayPlan({
          id: 'current-plan',
          name: 'Meus Exercícios',
          exercises: exercises.map((ex: any) => ({
            id: ex.id,
            name: ex.exercise?.name || 'Exercício',
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            completed: ex.completed || false,
          })),
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching plans:', error);
      // Fallback logic
      setLoading(false);
    });

    // Fetch next appointment from root appointments collection
    const now = new Date().toISOString();
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsQuery = query(
      appointmentsRef,
      where('patient_id', '==', user.id),
      where('date', '>=', now.split('T')[0]),
      orderBy('date', 'asc'),
      limit(1)
    );

    const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const apptDoc = snapshot.docs[0];
        const apptData = apptDoc.data();
        setNextAppointment({
          id: apptDoc.id,
          date: apptData.date, // ISO string in root collection
          time: apptData.start_time,
          type: apptData.type || 'Fisioterapia',
          professional_name: apptData.therapist_name || 'Fisioterapeuta',
        } as any);
      }
    });

    return () => {
      // unsubscribePlans(); // Commented as it was causing issues
      // unsubscribeAppointments();
    };
  }, [user?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getTodayLabel = () => {
    const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
    return today.charAt(0).toUpperCase() + today.slice(1);
  };

  const completedCount = todayPlan?.exercises.filter(e => e.completed).length || 0;
  const totalCount = todayPlan?.exercises.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getNextAppointmentLabel = () => {
    if (!nextAppointment) return null;

    let apptDate: Date;
    if (typeof nextAppointment.date === 'string') {
      apptDate = new Date(nextAppointment.date);
    } else {
      apptDate = nextAppointment.date?.toDate();
    }
    
    if (!apptDate || isNaN(apptDate.getTime())) return null;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = apptDate.toDateString() === today.toDateString();
    const isTomorrow = apptDate.toDateString() === tomorrow.toDateString();

    if (isToday) return `Hoje às ${nextAppointment.time}`;
    if (isTomorrow) return `Amanhã às ${nextAppointment.time}`;

    return format(apptDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Sync Indicator */}
      <SyncIndicator />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Paciente'} 👋
            </Text>
            <Text style={[styles.date, { color: colors.text }]}>
              {getTodayLabel()}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.levelBadge, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.levelText}>Lvl {currentLevel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'P'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Level Progress Bar */}
        <View style={styles.xpContainer}>
          <View style={styles.xpHeader}>
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>Progresso do Nível</Text>
            <Text style={[styles.xpValue, { color: colors.text }]}>{currentXp}/{xpPerLevel} XP</Text>
          </View>
          <LinearProgress 
            progress={progressPercentage / 100} 
            color={colors.primary}
            style={styles.xpBar}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Today's Progress */}
            <View style={styles.statsRow}>
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
              />
            </View>

            {/* Today's Exercises */}
            {todayPlan && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="barbell" size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercícios de Hoje</Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                        {todayPlan.name}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/exercises')}>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.exercisesList}>
                  {todayPlan.exercises.slice(0, 3).map((exercise, index) => (
                    <View
                      key={exercise.id}
                      style={[
                        styles.exerciseItem,
                        { backgroundColor: exercise.completed ? colors.success + '10' : 'transparent' }
                      ]}
                    >
                      <View
                        style={[
                          styles.exerciseIndex,
                          { backgroundColor: exercise.completed ? colors.success : colors.primary + '20' }
                        ]}
                      >
                        {exercise.completed ? (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.exerciseIndexText, { color: colors.primary }]}>
                            {index + 1}
                          </Text>
                        )}
                      </View>

                      <View style={styles.exerciseInfo}>
                        <Text
                          style={[
                            styles.exerciseName,
                            { color: exercise.completed ? colors.success : colors.text }
                          ]}
                        >
                          {exercise.name}
                        </Text>
                        <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
                          {exercise.sets} séries × {exercise.reps} reps
                        </Text>
                      </View>

                      <Ionicons
                        name={exercise.completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={exercise.completed ? colors.success : colors.textMuted}
                      />
                    </View>
                  ))}

                  {todayPlan.exercises.length > 3 && (
                    <TouchableOpacity
                      style={styles.seeMoreButton}
                      onPress={() => router.push('/(tabs)/exercises')}
                    >
                      <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                        Ver todos {todayPlan.exercises.length} exercícios
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}

                  {progress === 100 && totalCount > 0 && (
                    <View style={[styles.completedBanner, { backgroundColor: colors.success + '10' }]}>
                      <Ionicons name="trophy" size={24} color={colors.success} />
                      <View style={styles.completedBannerText}>
                        <Text style={[styles.completedTitle, { color: colors.success }]}>Parabéns!</Text>
                        <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
                          Você completou todos os exercícios de hoje
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Next Appointment Card */}
            {nextAppointment && (
              <Card style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={[styles.appointmentIcon, { backgroundColor: colors.info + '20' }]}>
                    <Ionicons name="calendar" size={24} color={colors.info} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={[styles.appointmentLabel, { color: colors.textSecondary }]}>
                      Próxima Consulta
                    </Text>
                    <Text style={[styles.appointmentTime, { color: colors.text }]}>
                      {getNextAppointmentLabel() || '--'}
                    </Text>
                    <Text style={[styles.appointmentDetails, { color: colors.textSecondary }]}>
                      {nextAppointment.type} com {nextAppointment.professional_name}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Notification Permission Modal */}
      <NotificationPermissionModal
        visible={showNotificationPrompt}
        onClose={() => setShowNotificationPrompt(false)}
        onEnable={handleEnableNotifications}
      />
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  colors: any;
}) {
  return (
    <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  xpContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  xpBar: {
    height: 8,
    borderRadius: 4,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  date: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 20,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  exercisesList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndexText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 13,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  completedBannerText: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  completedSubtitle: {
    fontSize: 13,
  },
  appointmentCard: {
    padding: 16,
    marginBottom: 20,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentLabel: {
    fontSize: 13,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  appointmentDetails: {
    fontSize: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (Dimensions) => ((Dimensions.get('window').width - 32 - 12) / 2) - 6,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 16,
  },
});
