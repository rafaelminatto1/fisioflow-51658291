import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, Polyline } from 'react-native-svg';

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

export default function ProgressScreen() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'achievements'>('overview');

  // Simple chart data points
  const chartPoints = mockWeeklyData.map((d, i) => {
    const x = i * 40 + 20;
    const y = 120 - (d.completed / d.total) * 100;
    return `${x},${y}`;
  }).join(' ');

  const renderOverview = () => (
    <View>
      {/* Main Stats Cards */}
      <View style={styles.mainStats}>
        <TouchableOpacity style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{mockProgressData.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessões Totais</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{mockProgressData.adherenceRate}%</Text>
          <Text style={styles.statLabel}>Taxa de Adesão</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="flame" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{mockProgressData.currentStreak}</Text>
          <Text style={styles.statLabel}>Dias Seguidos</Text>
        </TouchableOpacity>
      </View>

      {/* Pain Progress Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Evolução da Dor</Text>
          <View style={styles.painChange}>
            <Ionicons name="trending-down" size={16} color="#10B981" />
            <Text style={styles.painChangeText}>
              -{Math.round((1 - mockProgressData.averagePain / mockProgressData.initialPain) * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.painComparison}>
          <View style={styles.painItem}>
            <Text style={styles.painLabel}>Início</Text>
            <View style={[styles.painBar, { width: '100%', backgroundColor: '#FEE2E2' }]}>
              <View style={[styles.painFill, { width: '75%', backgroundColor: '#EF4444' }]} />
            </View>
            <Text style={styles.painValue}>{mockProgressData.initialPain}/10</Text>
          </View>

          <Ionicons name="arrow-forward" size={20} color="#CBD5E1" />

          <View style={styles.painItem}>
            <Text style={styles.painLabel}>Atual</Text>
            <View style={[styles.painBar, { width: '100%', backgroundColor: '#D1FAE5' }]}>
              <View style={[styles.painFill, { width: '32%', backgroundColor: '#10B981' }]} />
            </View>
            <Text style={styles.painValue}>{mockProgressData.averagePain}/10</Text>
          </View>
        </View>
      </View>

      {/* Weekly Progress Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Progresso Semanal</Text>

        <View style={styles.chartContainer}>
          <Svg width="280" height="140">
            {/* Grid lines */}
            <Polyline
              points={`20,20 260,20 20,120 260,120`}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
            />
            {/* Progress line */}
            <Polyline
              points={chartPoints}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Data points */}
            {mockWeeklyData.map((d, i) => {
              const x = i * 40 + 20;
              const y = 120 - (d.completed / d.total) * 100;
              return (
                <Circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="6"
                  fill="#3B82F6"
                  stroke="#fff"
                  strokeWidth="2"
                />
              );
            })}
          </Svg>

          {/* Day labels */}
          <View style={styles.dayLabels}>
            {mockWeeklyData.map((d, i) => (
              <Text key={i} style={styles.dayLabel}>
                {d.day}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Exercises Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumo de Exercícios</Text>
        <View style={styles.exercisesSummary}>
          <View style={styles.exerciseStat}>
            <Text style={styles.exerciseStatValue}>{mockProgressData.totalExercises}</Text>
            <Text style={styles.exerciseStatLabel}>Prescritos</Text>
          </View>
          <View style={styles.exerciseDivider} />
          <View style={styles.exerciseStat}>
            <Text style={[styles.exerciseStatValue, { color: '#10B981' }]}>
              {mockProgressData.completedExercises}
            </Text>
            <Text style={styles.exerciseStatLabel}>Completados</Text>
          </View>
          <View style={styles.exerciseDivider} />
          <View style={styles.exerciseStat}>
            <Text style={[styles.exerciseStatValue, { color: '#EF4444' }]}>
              {mockProgressData.totalExercises - mockProgressData.completedExercises}
            </Text>
            <Text style={styles.exerciseStatLabel}>Pendentes</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View>
      <Text style={styles.sectionTitle}>Sessões Recentes</Text>
      {mockRecentSessions.map((session) => (
        <TouchableOpacity key={session.id} style={styles.sessionCard}>
          <View style={styles.sessionDateContainer}>
            <Text style={styles.sessionDate}>{session.date}</Text>
          </View>

          <View style={styles.sessionInfo}>
            <Text style={styles.sessionExercises}>
              {session.completed} de {session.exercises} exercícios
            </Text>
            <View style={styles.sessionProgress}>
              <View
                style={[
                  styles.sessionProgressBar,
                  { width: `${(session.completed / session.exercises) * 100}%` }
                ]}
              />
            </View>
          </View>

          <View style={styles.sessionPain}>
            <Ionicons
              name="pulse"
              size={16}
              color={session.pain > 5 ? '#EF4444' : session.pain > 3 ? '#F59E0B' : '#10B981'}
            />
            <Text style={styles.sessionPainText}>{session.pain}/10</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAchievements = () => (
    <View>
      <View style={styles.achievementsHeader}>
        <Text style={styles.sectionTitle}>Conquistas</Text>
        <View style={styles.achievementCount}>
          <Text style={styles.achievementCountText}>
            {mockAchievements.filter(a => a.unlocked).length}/{mockAchievements.length}
          </Text>
        </View>
      </View>

      <View style={styles.achievementsGrid}>
        {mockAchievements.map((achievement) => (
          <TouchableOpacity
            key={achievement.id}
            style={[
              styles.achievementCard,
              !achievement.unlocked && styles.achievementCardLocked
            ]}
          >
            <View style={[
              styles.achievementIconContainer,
              !achievement.unlocked && styles.achievementIconContainerLocked
            ]}>
              <Ionicons
                name={achievement.icon as any}
                size={32}
                color={achievement.unlocked ? '#F59E0B' : '#CBD5E1'}
              />
            </View>
            <Text style={[
              styles.achievementTitle,
              !achievement.unlocked && styles.achievementTitleLocked
            ]}>
              {achievement.title}
            </Text>
            <Text style={[
              styles.achievementDescription,
              !achievement.unlocked && styles.achievementDescriptionLocked
            ]}>
              {achievement.description}
            </Text>
            {!achievement.unlocked && (
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                <Text style={styles.lockedBadgeText}>Bloqueado</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Progresso</Text>
        <Text style={styles.subtitle}>Sua evolução</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
            Visão Geral
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>
            Histórico
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'achievements' && styles.tabActive]}
          onPress={() => setSelectedTab('achievements')}
        >
          <Text style={[styles.tabText, selectedTab === 'achievements' && styles.tabTextActive]}>
            Conquistas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'history' && renderHistory()}
        {selectedTab === 'achievements' && renderAchievements()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter_700',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#DBEAFE',
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  tabTextActive: {
    color: '#1E40AF',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter_700',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter_400',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  painChange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  painChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    fontFamily: 'Inter_600',
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
    color: '#64748B',
    marginBottom: 8,
    fontFamily: 'Inter_500',
  },
  painBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  painFill: {
    height: '100%',
    borderRadius: 4,
  },
  painValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent:space-between',
    width: 280,
    marginTop: 8,
  },
  dayLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter_400',
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
    color: '#1E293B',
    fontFamily: 'Inter_700',
  },
  exerciseStatLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  exerciseDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    fontFamily: 'Inter_600',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionDateContainer: {
    width: 60,
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  sessionInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  sessionExercises: {
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 6,
    fontFamily: 'Inter_500',
  },
  sessionProgress: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sessionProgressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  sessionPain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionPainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter_600',
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementCount: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  achievementCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    fontFamily: 'Inter_600',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  achievementCardLocked: {
    opacity: 0.6,
  },
  achievementIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementIconContainerLocked: {
    backgroundColor: '#F1F5F9',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Inter_600',
  },
  achievementTitleLocked: {
    color: '#94A3B8',
  },
  achievementDescription: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter_400',
  },
  achievementDescriptionLocked: {
    color: '#CBD5E1',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  lockedBadgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'Inter_500',
  },
});
