import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Button,
  Badge,
  Progress,
  Avatar,
  ListItem,
  Divider,
  useTheme,
  toast,
} from '@fisioflow/shared-ui';
import { LinearGradient } from 'expo-linear-gradient';

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
  date: '25 de janeiro',
  time: '14:00',
  professional: 'Dra. Ana Silva',
};

const mockPainLevel = 3; // 0-10 scale

// Helper function
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [painLevel, setPainLevel] = useState(mockPainLevel);
  const [showPainSelector, setShowPainSelector] = useState(false);

  const handleStartExercises = () => {
    router.push('/(tabs)/exercises');
  };

  const handlePainCheckIn = (level: number) => {
    setPainLevel(level);
    setShowPainSelector(false);
    toast.success(`Nível de dor registrado: ${level}/10`);
    // TODO: Save to Firebase
  };

  const progressPercent = (mockTodayPlan.completedCount / mockTodayPlan.exercisesCount) * 100;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with gradient */}
      <LinearGradient
        colors={[theme.colors.primary[500], theme.colors.primary[600]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>Paciente</Text>
            <Text style={styles.headerSubtitle}>Você está indo muito bem! 🎉</Text>
          </View>

          {/* Streak Badge */}
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color="#F59E0B" />
            <Text style={styles.streakCount}>{mockStreak.current}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card variant="elevated" style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary[500] }]}>
                {mockStreak.current}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
                dias seguidos
              </Text>
            </View>
            <Divider orientation="vertical" length={40} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.warning[500] }]}>
                {mockStreak.best}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
                melhor sequência
              </Text>
            </View>
            <Divider orientation="vertical" length={40} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.success[500] }]}>
                {mockTodayPlan.exercisesCount - mockTodayPlan.completedCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
                pendentes hoje
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Today's Plan Card */}
      <Card variant="elevated" style={styles.card}>
        <CardHeader
          title="Plano de Hoje"
          subtitle={`${mockTodayPlan.completedCount} de ${mockTodayPlan.exercisesCount} exercícios`}
          rightElement={
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={16} color={theme.colors.text.tertiary} />
              <Text style={[styles.timeText, { color: theme.colors.text.tertiary }]}>
                {mockTodayPlan.estimatedTime} min
              </Text>
            </View>
          }
        />

        {/* Progress Bar */}
        <Progress value={progressPercent} size="md" />

        <Button
          onPress={handleStartExercises}
          fullWidth
          leftIcon={<Ionicons name="play" size={20} color="#fff" />}
          style={{ marginTop: 16 }}
        >
          {mockTodayPlan.completedCount > 0 ? 'Continuar' : 'Começar'}
        </Button>
      </Card>

      {/* Pain Check-in */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
          Como está sua dor hoje?
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
          Toque para registrar
        </Text>

        <TouchableOpacity
          style={styles.painButton}
          onPress={() => setShowPainSelector(!showPainSelector)}
        >
          <View style={styles.painScale}>
            <View style={[styles.painIndicator, { left: `${painLevel * 10}%` }]} />
            <LinearGradient
              colors={[theme.colors.success[500], theme.colors.warning[500], theme.colors.danger[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.painGradient}
            />
          </View>
          <View style={styles.painLabels}>
            <Text style={[styles.painLabel, { color: theme.colors.text.tertiary }]}>Nenhuma</Text>
            <Text style={[styles.painLabel, { color: theme.colors.text.tertiary }]}>Moderada</Text>
            <Text style={[styles.painLabel, { color: theme.colors.text.tertiary }]}>Severa</Text>
          </View>
          <Text style={[styles.painValue, { color: theme.colors.text.primary }]}>
            Nível {painLevel}/10
          </Text>
        </TouchableOpacity>

        {showPainSelector && (
          <View style={[styles.painSelector, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <Text style={[styles.painSelectorTitle, { color: theme.colors.text.primary }]}>
              Selecione o nível:
            </Text>
            <View style={styles.painButtons}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.painLevelButton,
                    {
                      backgroundColor: painLevel === level ? theme.colors.primary[500] : theme.colors.background,
                      borderColor: painLevel === level ? theme.colors.primary[500] : theme.colors.border,
                    },
                  ]}
                  onPress={() => handlePainCheckIn(level)}
                >
                  <Text
                    style={[
                      styles.painLevelButtonText,
                      { color: painLevel === level ? '#FFFFFF' : theme.colors.text.secondary },
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Next Session */}
      <Card variant="elevated" style={styles.card}>
        <ListItem
          title={mockNextSession.date}
          subtitle={`${mockNextSession.time} • com ${mockNextSession.professional}`}
          leading={<Ionicons name="calendar-outline" size={24} color={theme.colors.primary[500]} />}
          pressable
          onPress={() => router.push('/(tabs)/profile')}
        />
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.colors.background }]}
          onPress={() => router.push('/(tabs)/exercises')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary[100] }]}>
            <Ionicons name="fitness" size={24} color={theme.colors.primary[500]} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.colors.text.secondary }]}>
            Exercícios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.colors.background }]}
          onPress={() => router.push('/(tabs)/progress')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.success[100] }]}>
            <Ionicons name="stats-chart" size={24} color={theme.colors.success[500]} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.colors.text.secondary }]}>
            Progresso
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.colors.background }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.info[100] }]}>
            <Ionicons name="person" size={24} color={theme.colors.info[500]} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.colors.text.secondary }]}>
            Perfil
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// CardHeader component for reuse
function CardHeader({ title, subtitle, rightElement }: any) {
  return (
    <View style={styles.cardHeader}>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: -20,
  },
  statsCard: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
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
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  painButton: {
    marginTop: 12,
  },
  painScale: {
    height: 40,
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
  },
  painIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  },
  painValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  painSelector: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  painSelectorTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painLevelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
