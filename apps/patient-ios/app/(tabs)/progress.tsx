import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, Polyline } from 'react-native-svg';
import {
  Card,
  useTheme,
  Tabs,
  Progress,
  Badge,
  Divider,
} from '@fisioflow/shared-ui';

// Mock data - will be replaced with Firebase data
const mockProgressData = {
  totalSessions: 24,
  adherenceRate: 75,
  currentStreak: 7,
  bestStreak: 14,
  totalExercises: 156,
  completedExercises: 117,
  averagePain: 3.2,
  initialPain: 7.5,
};

const mockWeeklyData = [
  { day: 'Seg', completed: 3, total: 3 },
  { day: 'Ter', completed: 2, total: 3 },
  { day: 'Qua', completed: 3, total: 3 },
  { day: 'Qui', completed: 1, total: 3 },
  { day: 'Sex', completed: 3, total: 3 },
  { day: 'Sáb', completed: 0, total: 2 },
  { day: 'Dom', completed: 0, total: 0 },
];

const mockRecentSessions = [
  { id: '1', date: '24 Jan', exercises: 6, completed: 5, pain: 3 },
  { id: '2', date: '22 Jan', exercises: 5, completed: 5, pain: 2 },
  { id: '3', date: '20 Jan', exercises: 6, completed: 4, pain: 4 },
  { id: '4', date: '18 Jan', exercises: 4, completed: 4, pain: 3 },
];

const mockAchievements = [
  { id: '1', title: 'Primeira Semana', description: 'Completou 7 dias seguidos', icon: 'calendar', unlocked: true },
  { id: '2', title: 'Dedicado', description: '30 dias de exercícios', icon: 'fitness', unlocked: true },
  { id: '3', title: 'Perfeccionista', description: '100% de adesão por uma semana', icon: 'star', unlocked: false },
  { id: '4', title: 'Maratonista', description: '14 dias seguidos', icon: 'trophy', unlocked: false },
];

type ProgressTab = 'overview' | 'history' | 'achievements';

export default function ProgressScreen() {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState<ProgressTab>('overview');

  const tabs = [
    { value: 'overview', label: 'Visão Geral' },
    { value: 'history', label: 'Histórico' },
    { value: 'achievements', label: 'Conquistas' },
  ];

  // Simple chart data points
  const chartPoints = mockWeeklyData.map((d, i) => {
    const x = i * 40 + 20;
    const y = 120 - (d.completed / d.total) * 100;
    return `${x},${y}`;
  }).join(' ');

  const painReductionPercent = Math.round(
    (1 - mockProgressData.averagePain / mockProgressData.initialPain) * 100
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Progresso</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>Sua evolução</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.colors.background }]}>
        <Tabs tabs={tabs} value={selectedTab} onChange={(v) => setSelectedTab(v as ProgressTab)} scrollable={false} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {selectedTab === 'overview' && (
          <OverviewTab
            chartPoints={chartPoints}
            painReductionPercent={painReductionPercent}
            progressData={mockProgressData}
            weeklyData={mockWeeklyData}
          />
        )}
        {selectedTab === 'history' && <HistoryTab sessions={mockRecentSessions} />}
        {selectedTab === 'achievements' && <AchievementsTab achievements={mockAchievements} />}
      </View>
    </ScrollView>
  );
}

// Overview Tab Component
function OverviewTab({
  chartPoints,
  painReductionPercent,
  progressData,
  weeklyData,
}: {
  chartPoints: string;
  painReductionPercent: number;
  progressData: typeof mockProgressData;
  weeklyData: typeof mockWeeklyData;
}) {
  const theme = useTheme();

  return (
    <View>
      {/* Main Stats Cards */}
      <View style={styles.mainStats}>
        <Card variant="elevated" style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary[100] }]}>
            <Ionicons name="calendar" size={24} color={theme.colors.primary[500]} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
            {progressData.totalSessions}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Sessões</Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: theme.colors.success[100] }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success[500]} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
            {progressData.adherenceRate}%
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Adesão</Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: theme.colors.warning[100] }]}>
            <Ionicons name="flame" size={24} color={theme.colors.warning[500]} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
            {progressData.currentStreak}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Dias</Text>
        </Card>
      </View>

      {/* Pain Progress Card */}
      <Card variant="elevated" style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Evolução da Dor</Text>
          <Badge variant="success" size="sm">
            <Ionicons name="trending-down" size={12} color="#fff" />
            <Text style={styles.painChangeText}>-{painReductionPercent}%</Text>
          </Badge>
        </View>

        <View style={styles.painComparison}>
          <View style={styles.painItem}>
            <Text style={[styles.painLabel, { color: theme.colors.text.secondary }]}>Início</Text>
            <Progress value={75} size="sm" />
            <Text style={[styles.painValue, { color: theme.colors.text.primary }]}>
              {progressData.initialPain}/10
            </Text>
          </View>

          <Ionicons name="arrow-forward" size={20} color={theme.colors.text.tertiary} />

          <View style={styles.painItem}>
            <Text style={[styles.painLabel, { color: theme.colors.text.secondary }]}>Atual</Text>
            <Progress value={32} color="success" size="sm" />
            <Text style={[styles.painValue, { color: theme.colors.text.primary }]}>
              {progressData.averagePain}/10
            </Text>
          </View>
        </View>
      </Card>

      {/* Weekly Progress Chart */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Progresso Semanal</Text>

        <View style={styles.chartContainer}>
          <Svg width="280" height="140">
            <Polyline
              points={`20,20 260,20 20,120 260,120`}
              fill="none"
              stroke={theme.colors.border}
              strokeWidth="1"
            />
            <Polyline
              points={chartPoints}
              fill="none"
              stroke={theme.colors.primary[500]}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {weeklyData.map((d, i) => {
              const x = i * 40 + 20;
              const y = 120 - (d.completed / d.total) * 100;
              return (
                <Circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="6"
                  fill={theme.colors.primary[500]}
                  stroke="#fff"
                  strokeWidth="2"
                />
              );
            })}
          </Svg>

          <View style={styles.dayLabels}>
            {weeklyData.map((d, i) => (
              <Text key={i} style={[styles.dayLabel, { color: theme.colors.text.tertiary }]}>
                {d.day}
              </Text>
            ))}
          </View>
        </View>
      </Card>

      {/* Exercises Summary */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Resumo de Exercícios</Text>
        <View style={styles.exercisesSummary}>
          <View style={styles.exerciseStat}>
            <Text style={[styles.exerciseStatValue, { color: theme.colors.text.primary }]}>
              {progressData.totalExercises}
            </Text>
            <Text style={[styles.exerciseStatLabel, { color: theme.colors.text.secondary }]}>
              Prescritos
            </Text>
          </View>
          <Divider orientation="vertical" length={40} />
          <View style={styles.exerciseStat}>
            <Text style={[styles.exerciseStatValue, { color: theme.colors.success[500] }]}>
              {progressData.completedExercises}
            </Text>
            <Text style={[styles.exerciseStatLabel, { color: theme.colors.text.secondary }]}>
              Completados
            </Text>
          </View>
          <Divider orientation="vertical" length={40} />
          <View style={styles.exerciseStat}>
            <Text style={[styles.exerciseStatValue, { color: theme.colors.danger[500] }]}>
              {progressData.totalExercises - progressData.completedExercises}
            </Text>
            <Text style={[styles.exerciseStatLabel, { color: theme.colors.text.secondary }]}>
              Pendentes
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

// History Tab Component
function HistoryTab({ sessions }: { sessions: typeof mockRecentSessions }) {
  const theme = useTheme();

  const getPainColor = (pain: number) => {
    if (pain > 5) return theme.colors.danger[500];
    if (pain > 3) return theme.colors.warning[500];
    return theme.colors.success[500];
  };

  return (
    <View>
      {sessions.map((session) => (
        <Card key={session.id} variant="elevated" style={styles.sessionCard} pressable>
          <View style={styles.sessionDateContainer}>
            <Text style={[styles.sessionDate, { color: theme.colors.text.primary }]}>
              {session.date}
            </Text>
          </View>

          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionExercises, { color: theme.colors.text.primary }]}>
              {session.completed} de {session.exercises} exercícios
            </Text>
            <Progress value={(session.completed / session.exercises) * 100} size="sm" />
          </View>

          <View style={styles.sessionPain}>
            <Ionicons name="pulse" size={16} color={getPainColor(session.pain)} />
            <Text style={[styles.sessionPainText, { color: theme.colors.text.secondary }]}>
              {session.pain}/10
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

// Achievements Tab Component
function AchievementsTab({ achievements }: { achievements: typeof mockAchievements }) {
  const theme = useTheme();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <View>
      <View style={styles.achievementsHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Conquistas</Text>
        <Badge variant="primary" size="sm">
          {unlockedCount}/{achievements.length}
        </Badge>
      </View>

      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => (
          <Card
            key={achievement.id}
            variant={achievement.unlocked ? 'elevated' : 'outlined'}
            style={[
              styles.achievementCard,
              !achievement.unlocked && { opacity: 0.6 },
            ]}
            pressable
          >
            <View
              style={[
                styles.achievementIconContainer,
                achievement.unlocked
                  ? { backgroundColor: theme.colors.warning[100] }
                  : { backgroundColor: theme.colors.backgroundSecondary },
              ]}
            >
              <Ionicons
                name={achievement.icon as any}
                size={32}
                color={achievement.unlocked ? theme.colors.warning[500] : theme.colors.text.tertiary}
              />
            </View>
            <Text
              style={[
                styles.achievementTitle,
                { color: achievement.unlocked ? theme.colors.text.primary : theme.colors.text.tertiary },
              ]}
            >
              {achievement.title}
            </Text>
            <Text
              style={[
                styles.achievementDescription,
                { color: achievement.unlocked ? theme.colors.text.secondary : theme.colors.text.tertiary },
              ]}
            >
              {achievement.description}
            </Text>
            {!achievement.unlocked && (
              <View style={[styles.lockedBadge, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Ionicons name="lock-closed" size={12} color={theme.colors.text.tertiary} />
                <Text style={[styles.lockedBadgeText, { color: theme.colors.text.tertiary }]}>Bloqueado</Text>
              </View>
            )}
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  content: {
    padding: 16,
  },
  mainStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  painChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  painComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  painItem: {
    flex: 1,
  },
  painLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  painValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    marginTop: 8,
  },
  dayLabel: {
    fontSize: 11,
  },
  exercisesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  exerciseStat: {
    alignItems: 'center',
  },
  exerciseStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  exerciseStatLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  sessionDateContainer: {
    width: 60,
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  sessionExercises: {
    fontSize: 14,
    marginBottom: 6,
  },
  sessionPain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionPainText: {
    fontSize: 12,
    fontWeight: '600',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
  },
  achievementIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  lockedBadgeText: {
    fontSize: 10,
  },
});
