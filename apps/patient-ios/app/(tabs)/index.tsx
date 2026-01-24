import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getGreeting } from '@fisioflow/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Mock data - will be replaced with Firebase data
const mockTodayPlan = {
  exercisesCount: 3,
  completedCount: 1,
  estimatedTime: 15,
};

const mockStreak = {
  current: 7,
  best: 14,
};

const mockNextSession = {
  date: '15 de janeiro',
  time: '14:00',
  professional: 'Dra. Ana Silva',
};

const mockPainLevel = 3; // 0-10 scale

export default function HomeScreen() {
  const { user } = useAuth();
  const [painLevel, setPainLevel] = useState(mockPainLevel);
  const [showPainSelector, setShowPainSelector] = useState(false);

  const handleStartExercises = () => {
    router.push('/exercises');
  };

  const handlePainCheckIn = (level: number) => {
    setPainLevel(level);
    setShowPainSelector(false);
    // TODO: Save to Firebase
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'Paciente'}</Text>
          </View>

          {/* Streak Badge */}
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color="#F59E0B" />
            <Text style={styles.streakCount}>{mockStreak.current}</Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>Você está indo muito bem! 🎉</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{mockStreak.current}</Text>
          <Text style={styles.statLabel}>dias seguidos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{mockStreak.best}</Text>
          <Text style={styles.statLabel}>melhor sequência</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{mockTodayPlan.exercisesCount - mockTodayPlan.completedCount}</Text>
          <Text style={styles.statLabel}>pendentes hoje</Text>
        </View>
      </View>

      {/* Today's Plan Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Plano de Hoje</Text>
            <Text style={styles.cardSubtitle}>
              {mockTodayPlan.completedCount} de {mockTodayPlan.exercisesCount} exercícios
            </Text>
          </View>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.timeText}>{mockTodayPlan.estimatedTime} min</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${(mockTodayPlan.completedCount / mockTodayPlan.exercisesCount) * 100}%` }
            ]}
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={handleStartExercises}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {mockTodayPlan.completedCount > 0 ? 'Continuar' : 'Começar'}
          </Text>
        </Pressable>
      </View>

      {/* Pain Check-in */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Como está sua dor hoje?</Text>
        <Text style={styles.cardSubtitle}>Toque para registrar</Text>

        <TouchableOpacity
          style={styles.painButton}
          onPress={() => setShowPainSelector(!showPainSelector)}
        >
          <View style={styles.painScale}>
            <View style={[styles.painIndicator, { left: `${painLevel * 10}%` }]} />
            <View style={styles.painGradient} />
          </View>
          <View style={styles.painLabels}>
            <Text style={styles.painLabel}>Nenhuma</Text>
            <Text style={styles.painLabel}>Moderada</Text>
            <Text style={styles.painLabel}>Severa</Text>
          </View>
          <Text style={styles.painValue}>Nível {painLevel}/10</Text>
        </TouchableOpacity>

        {showPainSelector && (
          <View style={styles.painSelector}>
            <Text style={styles.painSelectorTitle}>Selecione o nível:</Text>
            <View style={styles.painButtons}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.painLevelButton,
                    painLevel === level && styles.painLevelButtonActive
                  ]}
                  onPress={() => handlePainCheckIn(level)}
                >
                  <Text
                    style={[
                      styles.painLevelButtonText,
                      painLevel === level && styles.painLevelButtonTextActive
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Next Session */}
      <View style={styles.card}>
        <View style={styles.sessionHeader}>
          <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
          <Text style={styles.cardTitle}>Próxima Sessão</Text>
        </View>
        <Text style={styles.sessionDate}>{mockNextSession.date}</Text>
        <Text style={styles.sessionTime}>{mockNextSession.time}</Text>
        <Text style={styles.sessionProfessional}>com {mockNextSession.professional}</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/exercises')}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="fitness" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.quickActionText}>Exercícios</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/progress')}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="stats-chart" size={24} color="#10B981" />
          </View>
          <Text style={styles.quickActionText}>Progresso</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/profile')}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="person" size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.quickActionText}>Perfil</Text>
        </TouchableOpacity>
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
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter_400',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
    fontFamily: 'Inter_700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 12,
    fontFamily: 'Inter_500',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: 'Inter_700',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter_700',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },
  painButton: {
    marginTop: 12,
  },
  painScale: {
    height: 40,
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  painGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)',
  },
  painIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    transform: [{ translateX: -16 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  painLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  painLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter_400',
  },
  painValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    fontFamily: 'Inter_600',
  },
  painSelector: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  painSelectorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 12,
    fontFamily: 'Inter_500',
  },
  painButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  painLevelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  painLevelButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  painLevelButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  painLevelButtonTextActive: {
    color: '#fff',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  sessionTime: {
    fontSize: 16,
    color: '#3B82F6',
    marginTop: 4,
    fontFamily: 'Inter_500',
  },
  sessionProfessional: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
});
