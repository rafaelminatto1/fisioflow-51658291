/**
 * Wellness Screen - Patient App
 *
 * Tela de bem-estar com integração a Apple HealthKit (iOS)
 * e Google Health Connect (Android).
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { Spacing } from '@/constants/spacing';
import {
  useHealthConnect,
  getTodayStepsHealthConnect,
} from '@/lib/healthConnect';
import { useHealthKit, getTodaySteps } from '@/lib/healthkit';
import { log } from '@/lib/logger';

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
    initialize: initializeHealthKit,
    requestPermissions: requestHealthKitPermissions,
    getTodayData: getHealthKitTodayData,
  } = useHealthKit();

  // Health Connect (Android) hooks
  const {
    isAvailable: healthConnectAvailable,
    isInstalled: healthConnectInstalled,
    isAuthorized: healthConnectAuthorized,
    initialize: initializeHealthConnect,
    openInstallation: openHealthConnectInstallation,
    requestPermissions: requestHealthConnectPermissions,
    getTodayData: getHealthConnectTodayData,
  } = useHealthConnect();

  const [steps, setSteps] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [calories, setCalories] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
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
      setPermissionDenied(false);
      if (isIOS && healthKitAvailable) {
        await initializeHealthKit();
        if (!healthKitAuthorized) {
          const granted = await requestHealthKitPermissions(['Steps', 'HeartRate', 'RestingHeartRate', 'Distance', 'SleepAnalysis']);
          if (!granted) {
            setPermissionDenied(true);
            setSyncing(false);
            return;
          }
        }
        const data = await getHealthKitTodayData();
        if (data) {
          setSteps(data.steps ?? 0);
          setHeartRate(data.heartRate ?? data.restingHeartRate ?? null);
          setCalories(data.activeEnergy ?? 0);
          setDistance(typeof data.distance === 'number' ? Math.round(data.distance) : null);
          setSleepHours(
            typeof data.sleep?.asleep === 'number'
              ? Math.round(data.sleep.asleep * 10) / 10
              : null
          );
        }
      } else if (isAndroid && healthConnectAvailable) {
        await initializeHealthConnect();
        if (!healthConnectAuthorized) {
          if (!healthConnectInstalled) {
            await openHealthConnectInstallation();
            setSyncing(false);
            return;
          }
          const granted = await requestHealthConnectPermissions(['Steps', 'HeartRate', 'Distance', 'SleepSession']);
          if (!granted) {
            setPermissionDenied(true);
            setSyncing(false);
            return;
          }
        }
        const data = await getHealthConnectTodayData();
        if (data) {
          setSteps(data.steps ?? 0);
          setHeartRate(data.heartRate ?? data.restingHeartRate ?? null);
          setCalories(data.activeCalories ?? 0);
          setDistance(typeof data.distance === 'number' ? Math.round(data.distance) : null);
          setSleepHours(
            typeof data.sleep?.duration === 'number'
              ? Math.round(data.sleep.duration * 10) / 10
              : null
          );
        }
      } else {
        // Dados mockados para Expo Go ou outros
        const mockSteps = await (isIOS ? getTodaySteps() : getTodayStepsHealthConnect());
        setSteps(mockSteps ?? 5000);
      }
    } catch (error) {
      log.error('Error loading health data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    setPermissionDenied(false);
    await loadHealthData();
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {});
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
        <TouchableOpacity
          onPress={loadHealthData}
          style={styles.refreshButton}
          disabled={syncing}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={[styles.statusIcon, { backgroundColor: (healthKitAuthorized || healthConnectAuthorized) ? colors.success + '20' : colors.surfaceHover }]}>
              <Ionicons
                name={(healthKitAuthorized || healthConnectAuthorized) ? 'checkmark-circle' : 'cloud-offline'}
                size={20}
                color={(healthKitAuthorized || healthConnectAuthorized) ? colors.success : colors.textSecondary}
              />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Status</Text>
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
                  <Ionicons name="link" size={18} color="#FFFFFF" style={styles.connectIcon} />
                  <Text style={styles.connectButtonText}>Conectar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Card>

        {/* Steps Card */}
        <Card style={styles.stepsCard}>
          <View style={styles.stepsHeader}>
            <View style={[styles.stepsIcon, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="footsteps" size={26} color={colors.warning} />
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

        {/* Permission Denied Banner */}
        {permissionDenied && (
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Ionicons name="lock-closed" size={22} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', marginBottom: 4 }, { color: colors.text }]}>
                  Permissão Negada
                </Text>
                <Text style={[{ fontSize: 12 }, { color: colors.textSecondary }]}>
                  Ative o acesso aos dados de saúde nas configurações do dispositivo.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }, { backgroundColor: colors.primary }]}
              onPress={handleOpenSettings}
            >
              <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Abrir Configurações</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Loading skeleton */}
        {syncing && !steps && (
          <View style={{ gap: 12 }}>
            {[1, 2].map(i => (
              <Card key={i} style={{ padding: 16, opacity: 0.5 }}>
                <View style={{ height: 20, backgroundColor: colors.border, borderRadius: 4, width: '60%' }} />
                <View style={{ height: 36, backgroundColor: colors.border, borderRadius: 4, width: '40%', marginTop: 8 }} />
              </Card>
            ))}
          </View>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Heart Rate */}
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="heart" size={22} color={colors.error} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Freq. Cardíaca</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {heartRate !== null ? `${heartRate} bpm` : '--'}
              </Text>
            </View>
          </Card>

          {/* Active Calories */}
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="flame" size={22} color={colors.success} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Calorias Ativas</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {calories !== null ? `${calories.toLocaleString()} kcal` : '--'}
              </Text>
            </View>
          </Card>

          {/* Distance */}
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: colors.primaryLight ?? (colors.primary + '20') }]}>
              <Ionicons name="walk" size={22} color={colors.primary} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Distância</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {distance !== null ? `${(distance / 1000).toFixed(1)} km` : '--'}
              </Text>
            </View>
          </Card>

          {/* Sleep */}
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#818cf820' }]}>
              <Ionicons name="moon" size={22} color="#818cf8" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Sono</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {sleepHours !== null ? `${sleepHours}h` : '--'}
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
    padding: Spacing.screen,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  refreshButton: {
    padding: 6,
  },
  content: {
    padding: Spacing.screen,
    gap: Spacing.gap,
  },
  statusCard: {
    padding: Spacing.card,
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
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  connectIcon: {
    marginRight: 2,
  },
  stepsCard: {
    padding: Spacing.card,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepsIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepsInfo: {
    flex: 1,
  },
  stepsLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  stepsValue: {
    fontSize: 26,
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
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.gap,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.card,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricInfo: {},
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCard: {
    padding: Spacing.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
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
    fontSize: 10,
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
    fontSize: 10,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.card,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
