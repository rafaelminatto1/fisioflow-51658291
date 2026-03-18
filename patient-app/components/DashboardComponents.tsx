/**
 * Dashboard Sub-components
 * Extracted components for better organization and maintainability
 */

import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, LinearProgress } from '@/components';
import { Spacing } from '@/constants/spacing';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { useGamification } from '@/hooks/useGamification';
import { Appointment } from '@/types/api';

const HALF_CARD_WIDTH = (Dimensions.get('window').width - Spacing.screen * 2 - Spacing.gap) / 2;
const FULL_CARD_WIDTH = Dimensions.get('window').width - Spacing.screen * 2;

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
  { id: '3', label: 'Consultas', icon: 'calendar-outline', route: '/(tabs)/appointments', color: '#0891b2' },
  { id: '4', label: 'Perfil', icon: 'person-outline', route: '/(tabs)/profile', color: '#059669' },
];

export function DashboardHeader() {
  const colors = useColors();
  const { user } = useAuthStore();
  const { currentLevel } = useGamification();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Paciente'} 👋
        </Text>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          style={[styles.levelBadge, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityLabel={`Nível ${currentLevel}, toque para ver perfil`}
          accessibilityRole="button"
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
  );
}

interface XPProgressBarProps {
  currentXp: number;
  xpPerLevel: number;
  progressPercentage: number;
}

export function XPProgressBar({ currentXp, xpPerLevel, progressPercentage }: XPProgressBarProps) {
  const colors = useColors();
  const xpRemaining = Math.max(xpPerLevel - currentXp, 0);

  return (
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
      <Text style={[styles.xpHint, { color: colors.textSecondary }]}>
        Faltam {xpRemaining} XP para o próximo nível
      </Text>
    </View>
  );
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  colors: any;
  fullWidth?: boolean;
}

export function StatCard({ icon, label, value, color, colors, fullWidth = false }: StatCardProps) {
  return (
    <Card
      style={[
        styles.statCard,
        fullWidth && styles.statCardFull,
        { backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </Card>
  );
}

interface ExercisesSectionProps {
  exercises: any[];
  completedCount: number;
  totalCount: number;
  progress: number;
  colors: any;
}

export function ExercisesSection({ exercises, completedCount, totalCount, progress, colors }: ExercisesSectionProps) {
  return (
    <>
      {exercises.length > 0 ? (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="barbell" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
                  Exercícios de Hoje
                </Text>
                <Text
                  style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  Plano Atual
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/exercises')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Ver todos os exercícios"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.exercisesList}>
            {exercises.slice(0, 3).map((exercise, index) => (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseItem,
                  {
                    backgroundColor: exercise.completed ? colors.success + '10' : colors.surfaceHover,
                    borderColor: exercise.completed ? colors.success + '30' : colors.border,
                  },
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
                    numberOfLines={1}
                  >
                    {exercise.exercise?.name || 'Exercício'}
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

            {exercises.length > 3 && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => router.push('/(tabs)/exercises')}
                accessibilityLabel={`Ver todos ${exercises.length} exercícios`}
                accessibilityRole="button"
              >
                <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                  Ver todos {exercises.length} exercícios
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
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem exercícios hoje</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Quando seu plano estiver disponível, ele aparecerá aqui.
          </Text>
        </Card>
      )}
    </>
  );
}

interface AppointmentCardProps {
  nextAppointment: Appointment | null;
  colors: any;
  getNextAppointmentLabel: () => string | null;
}

export function AppointmentCard({ nextAppointment, colors, getNextAppointmentLabel }: AppointmentCardProps) {
  return (
    <Card style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={[styles.appointmentIcon, { backgroundColor: nextAppointment ? colors.info + '20' : colors.surfaceHover }]}>
          <Ionicons name="calendar" size={nextAppointment ? 24 : 22} color={nextAppointment ? colors.info : colors.textSecondary} />
        </View>
        <View style={styles.appointmentInfo}>
          <Text style={[styles.appointmentLabel, { color: colors.textSecondary }]}>
            Próxima Consulta
          </Text>
          <Text style={[styles.appointmentTime, { color: colors.text }]}>
            {getNextAppointmentLabel() || 'Nenhuma consulta agendada'}
          </Text>
          <Text
            style={[styles.appointmentDetails, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {nextAppointment ? `${nextAppointment.type} com ${nextAppointment.professionalName}` : 'Agende uma nova consulta quando precisar'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function QuickActions() {
  const colors = useColors();

  return (
    <View style={styles.quickActionsGrid}>
      {quickActions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
          onPress={() => router.push(action.route as any)}
          activeOpacity={0.7}
          accessibilityLabel={action.label}
          accessibilityRole="button"
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
  );
}

const styles = StyleSheet.create({
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
  greeting: {
    fontSize: 14,
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
  xpHint: {
    marginTop: 6,
    fontSize: 12,
  },
  statCard: {
    width: HALF_CARD_WIDTH,
    padding: 14,
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 96,
  },
  statCardFull: {
    width: FULL_CARD_WIDTH,
    minHeight: 88,
  },
  statHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionCard: {
    marginBottom: 16,
    padding: Spacing.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  exercisesList: {
    gap: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndexText: {
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 12,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 6,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
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
  emptyCard: {
    padding: Spacing.card,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  appointmentCard: {
    padding: Spacing.card,
    marginBottom: 16,
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
    width: HALF_CARD_WIDTH,
    minHeight: 104,
    aspectRatio: 0.9,
    borderRadius: 16,
    padding: 14,
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
});
