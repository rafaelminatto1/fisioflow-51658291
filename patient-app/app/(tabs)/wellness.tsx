/**
 * Wellness Screen - Patient App
 *
 * Tela de bem-estar com integração a Apple HealthKit (iOS)
 * e Google Health Connect (Android).
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import {
  useHealthKit,
  getTodaySteps,
} from '@/lib/healthkit';
import {
  useHealthConnect,
  getTodayStepsHealthConnect,
} from '@/lib/healthConnect';

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  iconBgColor: string;
}

export default function WellnessScreen() {
  const colors = useColors();

  // HealthKit (iOS) hooks
  const {
    isAvailable: healthKitAvailable,
    isAuthorized: healthKitAuthorized,
    healthData: healthKitData,
    loading: healthKitLoading,
    initialize: initializeHealthKit,
    requestPermissions: requestHealthKitPermissions,
    getTodayData: getHealthKitTodayData,
  } = useHealthKit();

  // Health Connect (Android) hooks
  const {
    isAvailable: healthConnectAvailable,
    isInstalled: healthConnectInstalled,
    isAuthorized: healthConnectAuthorized,
    healthData: healthConnectData,
    loading: healthConnectLoading,
    initialize: initializeHealthConnect,
    openInstallation: openHealthConnectInstallation,
    requestPermissions: requestHealthConnectPermissions,
    getTodayData: getHealthConnectTodayData,
  } = useHealthConnect();

  const [steps, setSteps] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [calories, setCalories] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    // Carregar dados ao montar
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    setSyncing(true);

    try {
      if (isIOS && healthKitAvailable) {
        await initializeHealthKit();
        const data = await getHealthKitTodayData();
        if (data) {
          setSteps(data.steps || 0);
          setHeartRate(data.heartRate || data.restingHeartRate || null);
          setCalories(data.activeEnergy || 0);
        }
      } else if (isAndroid && healthConnectAvailable) {
        await initializeHealthConnect();
        const data = await getHealthConnectTodayData();
        if (data) {
          setSteps(data.steps || 0);
          setHeartRate(data.heartRate || data.restingHeartRate || null);
          setCalories(data.activeCalories || 0);
        }
      } else {
        // Dados mockados para Expo Go ou outros
        const mockSteps = await (isIOS ? getTodaySteps() : getTodayStepsHealthConnect());
        setSteps(mockSteps || 5000);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    if (isIOS) {
      const granted = await requestHealthKitPermissions(['Steps', 'HeartRate', 'RestingHeartRate']);
      if (granted) {
        await loadHealthData();
      }
    } else if (isAndroid) {
      if (!healthConnectInstalled) {
        await openHealthConnectInstallation();
        return;
      }
      const granted = await requestHealthConnectPermissions(['Steps', 'HeartRate']);
      if (granted) {
        await loadHealthData();
      }
    }
  };

  const getPlatformName = () => {
    if (isIOS) return 'Apple Health';
    if (isAndroid) return 'Google Health Connect';
    return 'Dados de saúde';
  };

  const getConnectionStatus = () => {
    if (syncing) return 'Sincronizando...';
    if (isIOS && healthKitAuthorized) return 'Conectado ao Apple Health';
    if (isAndroid && healthConnectAuthorized) return 'Conectado ao Health Connect';
    return 'Não conectado';
  };

  const getStepProgress = () => {
    if (!steps) return 0;
    const goal = 10000;
    return Math.min((steps / goal) * 100, 100);
  };

  const getStepColor = () => {
    const progress = getStepProgress();
    if (progress >= 100) return '#22c55e';
    if (progress >= 50) return '#f59e0b';
    return '#f97316';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Bem-Estar</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {getPlatformName()}
          </Text>
        </View>
        <TouchableOpacity onPress={loadHealthData} style={styles.refreshButton} disabled={syncing}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={[styles.statusIcon, { backgroundColor: (healthKitAuthorized || healthConnectAuthorized) ? colors.success + '20' : colors.border }]}>
              <Ionicons
                name={(healthKitAuthorized || healthConnectAuthorized) ? 'checkmark-circle' : 'cloud-offline'}
                size={20}
                color={(healthKitAuthorized || healthConnectAuthorized) ? colors.success : colors.textSecondary}
              />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: colors.text }]}>Status</Text>
              <Text style={[styles.statusValue, { color: colors.textSecondary }]}>
                {syncing ? 'Sincronizando...' : getConnectionStatus()}
              </Text>
            </View>
          </View>
          {!(healthKitAuthorized || healthConnectAuthorized) && (
            <TouchableOpacity
              style={[styles.connectButton, { backgroundColor: colors.primary }]}
              onPress={handleConnect}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="connect" size={18} color="#FFFFFF" style={styles.connectIcon} />
                  <Text style={styles.connectButtonText}>Conectar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Card>

        {/* Steps Card */}
        <Card style={styles.stepsCard}>
          <View style={styles.stepsHeader}>
            <View style={[styles.stepsIcon, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="footsteps" size={28} color="#F97316" />
            </View>
            <View style={styles.stepsInfo}>
              <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>Passos Hoje</Text>
              <Text style={[styles.stepsValue, { color: colors.text }]}>
                {steps !== null ? steps.toLocaleString() : '--'}
              </Text>
            </View>
          </View>
          <View style={styles.stepsProgressContainer}>
            <View style={[styles.stepsProgressBg, { backgroundColor: colors.border }]}>
              <View
                style={[styles.stepsProgressFill, { backgroundColor: getStepColor(), width: `${getStepProgress()}%` }]}
              />
            </View>
            <Text style={[styles.stepsProgressText, { color: colors.textSecondary }]}>
              Meta: 10.000 passos
            </Text>
          </View>
        </Card>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Heart Rate */}
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="heart" size={24} color="#EF4444" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Frequência Cardíaca</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {heartRate !== null ? `${heartRate} bpm` : '--'}
              </Text>
            </View>
          </Card>

          {/* Active Calories */}
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="flame" size={24} color="#22c55e" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Calorias Ativas</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {calories !== null ? `${calories.toLocaleString()}` : '--'}
              </Text>
            </View>
          </Card>
        </View>

        {/* Weekly Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="stats-chart" size={20} color={colors.primary} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Resumo Semanal</Text>
          </View>
          <View style={styles.weeklyData}>
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, index) => {
              // Mock data for weekly view
              const daySteps = Math.floor(Math.random() * 8000) + 4000;
              const percentage = Math.min((daySteps / 10000) * 100, 100);
              const isToday = index === new Date().getDay();

              return (
                <View key={day} style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{day}</Text>
                  <View style={[styles.dayBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.dayBarFill,
                        {
                          backgroundColor: percentage >= 100 ? colors.success : percentage >= 50 ? colors.warning : colors.error,
                          height: `${percentage}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayValue, { color: colors.text }]}>
                    {(daySteps / 1000).toFixed(1)}k
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {isIOS
              ? 'Os dados são sincronizados automaticamente com o app Saúde do seu iPhone.'
              : 'Para ver seus dados reais, instale o app Google Fit ou Health Connect no seu Android.'
            }
          </Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  statusCard: {
    padding: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  stepsCard: {
    padding: 20,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepsInfo: {
    flex: 1,
  },
  stepsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  stepsValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  stepsProgressContainer: {
    gap: 8,
  },
  stepsProgressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stepsProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stepsProgressText: {
    fontSize: 13,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricInfo: {},
  metricLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  weeklyData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 11,
    marginBottom: 8,
  },
  dayBar: {
    width: 12,
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dayBarFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 8,
  },
  dayValue: {
    fontSize: 11,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
