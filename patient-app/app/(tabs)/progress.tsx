import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, SyncIndicator } from '@/components';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart } from 'react-native-chart-kit';

interface Evolution {
  id: string;
  date: any; // Firestore Timestamp
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  pain_level: number;
  professional_name: string;
  session_number: number;
}

interface Stats {
  totalSessions: number;
  totalDays: number;
  averagePain: number;
  painImprovement: number;
}

const CHART_DAYS = 30; // Last 30 days

export default function ProgressScreen() {
  const colors = useColors();
  const { user } = useAuthStore();

  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    totalDays: 0,
    averagePain: 0,
    painImprovement: 0,
  });

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Fetch evolutions from Firestore
    const evolutionsRef = collection(db, 'users', user.id, 'evolutions');
    const q = query(
      evolutionsRef,
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evolutionsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as Evolution;
      });

      setEvolutions(evolutionsData);
      calculateStats(evolutionsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching evolutions:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.id]);

  const calculateStats = (evolutionsData: Evolution[]) => {
    if (evolutionsData.length === 0) {
      setStats({
        totalSessions: 0,
        totalDays: 0,
        averagePain: 0,
        painImprovement: 0,
      });
      return;
    }

    const totalSessions = evolutionsData.length;

    // Calculate date range
    const dates = evolutionsData.map(e => e.date?.toDate() || new Date()).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const totalDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate average pain
    const painLevels = evolutionsData.map(e => e.pain_level || 0);
    const averagePain = painLevels.reduce((sum, level) => sum + level, 0) / painLevels.length;

    // Calculate pain improvement (first vs last)
    const firstPain = evolutionsData[evolutionsData.length - 1]?.pain_level || 0;
    const lastPain = evolutionsData[0]?.pain_level || 0;
    const painImprovement = firstPain - lastPain;

    setStats({
      totalSessions,
      totalDays,
      averagePain: Math.round(averagePain * 10) / 10,
      painImprovement: Math.round(painImprovement * 10) / 10,
    });
  };

  const getFilteredEvolutions = () => {
    const now = new Date();
    let startDate;

    switch (selectedPeriod) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'all':
      default:
        return evolutions;
    }

    return evolutions.filter(e => {
      const evoDate = e.date?.toDate() || new Date();
      return evoDate >= startOfDay(startDate);
    });
  };

  const getChartData = () => {
    const filtered = getFilteredEvolutions().reverse(); // Oldest to newest

    // Group by date and get latest pain level per day
    const painByDate: Record<string, number> = {};
    const dates: string[] = [];

    filtered.forEach(evo => {
      const date = evo.date?.toDate();
      if (date) {
        const dateStr = format(date, 'dd/MM');
        if (!painByDate[dateStr]) {
          painByDate[dateStr] = evo.pain_level || 0;
          dates.push(dateStr);
        }
      }
    });

    // Limit to last 7-10 data points for cleaner chart
    const displayDates = dates.slice(-10);
    const displayData = displayDates.map(d => painByDate[d]);

    return {
      labels: displayDates,
      datasets: [
        {
          data: displayData,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartConfig = {
    backgroundColor: colors.card || '#ffffff',
    backgroundGradientFrom: colors.card || '#ffffff',
    backgroundGradientTo: colors.card || '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary || '#6b7280',
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary || '#22c55e',
    },
  };

  const filteredEvolutions = getFilteredEvolutions();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando evoluções...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Sync Indicator */}
      <SyncIndicator />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
          />
        }
      >
        {/* Period Selector */}
        <View style={[styles.periodSelector, { backgroundColor: colors.surface }]}>
          {(['week', 'month', 'all'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  { color: selectedPeriod === period ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {period === 'week' ? '7 dias' : period === 'month' ? '30 dias' : 'Tudo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-outline"
            label="Sessões"
            value={stats.totalSessions.toString()}
            colors={colors}
          />
          <StatCard
            icon="time-outline"
            label="Dias"
            value={stats.totalDays.toString()}
            colors={colors}
          />
          <StatCard
            icon="pulse-outline"
            label="Dor Média"
            value={stats.averagePain.toFixed(1)}
            colors={colors}
          />
        </View>

        {stats.painImprovement !== 0 && (
          <Card style={styles.improvementCard}>
            <View style={styles.improvementContent}>
              <Ionicons
                name={stats.painImprovement > 0 ? 'trending-down' : 'trending-up'}
                size={24}
                color={stats.painImprovement > 0 ? colors.success : colors.error}
              />
              <View style={styles.improvementText}>
                <Text style={[styles.improvementLabel, { color: colors.textSecondary }]}>
                  Melhora na dor
                </Text>
                <Text style={[styles.improvementValue, { color: colors.text }]}>
                  {Math.abs(stats.painImprovement).toFixed(1)} pontos
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Pain Chart */}
        {filteredEvolutions.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Nível de Dor
            </Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
              Últimas {selectedPeriod === 'week' ? '7' : selectedPeriod === 'month' ? '30' : 'todas as'} sessões
            </Text>
            <LineChart
              data={getChartData()}
              width={Dimensions.get('window').width - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card>
        )}

        {/* Evolutions Timeline */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Histórico de Evoluções
        </Text>

        {filteredEvolutions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhuma evolução ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedPeriod === 'all'
                ? 'Seu fisioterapeuta registrará suas evoluções aqui'
                : 'Nenhuma evolução neste período'}
            </Text>
          </Card>
        ) : (
          filteredEvolutions.map((evolution) => (
            <EvolutionCard key={evolution.id} evolution={evolution} colors={colors} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Card>
  );
}

function EvolutionCard({ evolution, colors }: { evolution: Evolution; colors: any }) {
  const [expanded, setExpanded] = useState(false);

  const evoDate = evolution.date?.toDate() || new Date();

  return (
    <Card style={styles.evolutionCard}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <View style={styles.evolutionHeader}>
          <View style={[styles.sessionNumber, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.sessionNumberText, { color: colors.primary }]}>
              #{evolution.session_number}
            </Text>
          </View>
          <View style={styles.evolutionHeaderInfo}>
            <Text style={[styles.evolutionDate, { color: colors.text }]}>
              {format(evoDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </Text>
            <Text style={[styles.evolutionProfessional, { color: colors.textSecondary }]}>
              {evolution.professional_name}
            </Text>
          </View>
          <View style={[styles.painIndicator, { backgroundColor: getPainColor(evolution.pain_level, colors) + '20' }]}>
            <Text style={[styles.painIndicatorText, { color: getPainColor(evolution.pain_level, colors) }]}>
              Dor: {evolution.pain_level}/10
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </View>

        {expanded && (
          <View style={styles.evolutionDetails}>
            {evolution.subjective && (
              <SOAPSection label="Subjetivo" content={evolution.subjective} colors={colors} />
            )}
            {evolution.objective && (
              <SOAPSection label="Objetivo" content={evolution.objective} colors={colors} />
            )}
            {evolution.assessment && (
              <SOAPSection label="Avaliação" content={evolution.assessment} colors={colors} />
            )}
            {evolution.plan && (
              <SOAPSection label="Plano" content={evolution.plan} colors={colors} />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );
}

function SOAPSection({ label, content, colors }: { label: string; content: string; colors: any }) {
  return (
    <View style={styles.soapSection}>
      <Text style={[styles.soapLabel, { color: colors.primary }]}>{label}:</Text>
      <Text style={[styles.soapContent, { color: colors.text }]}>{content}</Text>
    </View>
  );
}

function getPainColor(level: number, colors: any): string {
  if (level <= 3) return colors.success;
  if (level <= 6) return colors.warning;
  return colors.error;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  },
  improvementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  improvementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  improvementText: {
    flex: 1,
  },
  improvementLabel: {
    fontSize: 14,
  },
  improvementValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  evolutionCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  evolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sessionNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  evolutionHeaderInfo: {
    flex: 1,
  },
  evolutionDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  evolutionProfessional: {
    fontSize: 13,
  },
  painIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  painIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  evolutionDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  soapSection: {
    marginBottom: 16,
  },
  soapLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  soapContent: {
    fontSize: 14,
    lineHeight: 20,
  },
});
