import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useEvolutions } from '@/hooks';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EvolutionsListScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const patientId = params.patientId as string;
  const patientName = params.patientName as string || 'Paciente';

  const { light, medium } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  const { evolutions, isLoading, refetch } = useEvolutions(patientId);

  const onRefresh = async () => {
    setRefreshing(true);
    light();
    await refetch();
    setRefreshing(false);
  };

  // Prepare data for pain chart
  const painData = evolutions
    .slice(0, 10) // Last 10 evolutions
    .reverse()
    .map(e => e.painLevel || 0);

  const chartData = {
    labels: evolutions.slice(0, 10).reverse().map((_, i) => `${i + 1}`),
    datasets: [{
      data: painData.length > 0 ? painData : [0],
    }],
  };

  const getPainColor = (level: number) => {
    if (level === 0) return colors.textMuted;
    if (level <= 3) return '#10B981';
    if (level <= 6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Evoluções</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patientName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            medium();
            router.push(`/evolution-form?patientId=${patientId}&patientName=${patientName}` as any);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Pain Chart */}
        {evolutions.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Evolução da Dor</Text>
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - 48}
              height={200}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: () => colors.primary,
                labelColor: () => colors.textSecondary,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: colors.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
              Últimas {Math.min(10, evolutions.length)} sessões
            </Text>
          </View>
        )}

        {/* Evolutions List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : evolutions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma evolução registrada
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                medium();
                router.push(`/evolution-form?patientId=${patientId}&patientName=${patientName}` as any);
              }}
            >
              <Text style={styles.emptyButtonText}>Criar Primeira Evolução</Text>
            </TouchableOpacity>
          </View>
        ) : (
          evolutions.map((evolution) => (
            <TouchableOpacity
              key={evolution.id}
              style={[styles.evolutionCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                light();
                router.push(`/evolution-detail?evolutionId=${evolution.id}&patientId=${patientId}&patientName=${patientName}` as any);
              }}
            >
              <View style={styles.evolutionHeader}>
                <View style={styles.evolutionDate}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.evolutionDateText, { color: colors.text }]}>
                    {evolution.date ? format(new Date(evolution.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Data não disponível'}
                  </Text>
                </View>
                {evolution.painLevel !== undefined && (
                  <View style={[styles.painBadge, { backgroundColor: getPainColor(evolution.painLevel) + '20' }]}>
                    <Text style={[styles.painBadgeText, { color: getPainColor(evolution.painLevel) }]}>
                      Dor: {evolution.painLevel}
                    </Text>
                  </View>
                )}
              </View>

              {evolution.subjective && (
                <View style={styles.evolutionSection}>
                  <Text style={[styles.evolutionLabel, { color: colors.textSecondary }]}>Subjetivo:</Text>
                  <Text style={[styles.evolutionText, { color: colors.text }]} numberOfLines={2}>
                    {evolution.subjective}
                  </Text>
                </View>
              )}

              {evolution.assessment && (
                <View style={styles.evolutionSection}>
                  <Text style={[styles.evolutionLabel, { color: colors.textSecondary }]}>Avaliação:</Text>
                  <Text style={[styles.evolutionText, { color: colors.text }]} numberOfLines={2}>
                    {evolution.assessment}
                  </Text>
                </View>
              )}

              <View style={styles.evolutionFooter}>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  evolutionCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  evolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evolutionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evolutionDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  painBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  painBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  evolutionSection: {
    gap: 4,
  },
  evolutionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  evolutionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  evolutionFooter: {
    alignItems: 'flex-end',
  },
});
