import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Appointment } from '@/types';

type SessionStatus = 'not_started' | 'running' | 'paused' | 'completed';

interface SessionTimerState {
  status: SessionStatus;
  startedAt: Date | null;
  pausedAt: Date | null;
  totalPausedTime: number;
}

export default function StartSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const appointmentId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerState, setTimerState] = useState<SessionTimerState>({
    status: 'not_started',
    startedAt: null,
    pausedAt: null,
    totalPausedTime: 0,
  });
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAppointment();
    subscribeToAppointment();

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [appointmentId]);

  const subscribeToAppointment = () => {
    const docRef = doc(db, 'appointments', appointmentId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const apt = { id: docSnap.id, ...data } as Appointment;

        setAppointment(apt);

        // Update timer state based on appointment status
        if (apt.status === 'em_andamento' && data.started_at) {
          const startedAt = data.started_at.toDate();
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

          setTimerState({
            status: 'running',
            startedAt,
            pausedAt: data.paused_at?.toDate() || null,
            totalPausedTime: data.total_paused_time || 0,
          });

          startTimerInterval(startedAt, data.paused_at?.toDate(), data.total_paused_time || 0);
        } else if (apt.status === 'concluido') {
          setTimerState((prev) => ({ ...prev, status: 'completed' }));
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        }
      }
    });
  };

  const startTimerInterval = (startedAt: Date, pausedAt: Date | null, totalPausedTime: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      const now = new Date();
      const baseElapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

      if (pausedAt) {
        // If paused, calculate elapsed time up to the pause point
        const pausedElapsed = Math.floor((pausedAt.getTime() - startedAt.getTime()) / 1000);
        setElapsedTime(pausedElapsed);
      } else {
        // If running, subtract total paused time
        setElapsedTime(Math.max(0, baseElapsed - totalPausedTime));
      }
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadAppointment = async () => {
    try {
      const docRef = doc(db, 'appointments', appointmentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setAppointment({ id: docSnap.id, ...docSnap.data() } as Appointment);

        // Check if session is already in progress
        const data = docSnap.data();
        if (data.status === 'em_andamento' && data.started_at) {
          const startedAt = data.started_at.toDate();
          const elapsed = Math.floor((new Date().getTime() - startedAt.getTime()) / 1000);
          setElapsedTime(elapsed);
          setTimerState({
            status: data.paused_at ? 'paused' : 'running',
            startedAt,
            pausedAt: data.paused_at?.toDate() || null,
            totalPausedTime: data.total_paused_time || 0,
          });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading appointment:', error);
      setLoading(false);
    }
  };

  const handleStartSession = useCallback(async () => {
    try {
      setStarting(true);
      HapticFeedback.heavy();

      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: 'em_andamento',
        started_at: serverTimestamp(),
      });

      HapticFeedback.success();
    } catch (error) {
      console.error('Error starting session:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível iniciar a sessão.');
    } finally {
      setStarting(false);
    }
  }, [appointmentId]);

  const handlePauseResume = useCallback(async () => {
    try {
      HapticFeedback.medium();

      if (timerState.status === 'running') {
        // Pause the session
        await updateDoc(doc(db, 'appointments', appointmentId), {
          paused_at: serverTimestamp(),
        });
      } else if (timerState.status === 'paused') {
        // Resume the session - calculate paused duration
        const pausedDuration = timerState.pausedAt
          ? Date.now() - timerState.pausedAt.getTime()
          : 0;

        await updateDoc(doc(db, 'appointments', appointmentId), {
          paused_at: null,
          total_paused_time: (timerState.totalPausedTime || 0) + pausedDuration,
        });
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível pausar/retomar a sessão.');
    }
  }, [appointmentId, timerState]);

  const handleCompleteSession = useCallback(async () => {
    Alert.alert(
      'Concluir Sessão',
      `Tempo total: ${formatTime(elapsedTime)}. Deseja concluir a sessão?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          style: 'default',
          onPress: async () => {
            try {
              HapticFeedback.heavy();

              const finalPausedDuration = timerState.pausedAt
                ? Date.now() - timerState.pausedAt.getTime()
                : 0;

              await updateDoc(doc(db, 'appointments', appointmentId), {
                status: 'concluido',
                ended_at: serverTimestamp(),
                total_duration: elapsedTime,
                total_paused_time: (timerState.totalPausedTime || 0) + finalPausedDuration,
              });

              HapticFeedback.success();
              router.back();
            } catch (error) {
              console.error('Error completing session:', error);
              HapticFeedback.error();
              Alert.alert('Erro', 'Não foi possível concluir a sessão.');
            }
          },
        },
      ]
    );
  }, [appointmentId, elapsedTime, timerState, router]);

  const handleGoToEvolution = useCallback(() => {
    HapticFeedback.light();
    router.push(`/evolutions/new?appointmentId=${appointmentId}&patientId=${appointment?.patientId}`);
  }, [appointmentId, router, appointment?.patientId]);

  const handleGoToMovementAnalysis = useCallback(() => {
    HapticFeedback.light();
    router.push('/movement-analysis');
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="alert-triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Agendamento não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const aptDate = new Date(appointment.date as string);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Iniciar Sessão</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Patient Card */}
        <Card style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <Avatar name={appointment.patientName || ''} size={64} />
            <View style={styles.patientInfo}>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {appointment.patientName}
              </Text>
              <Text style={[styles.appointmentType, { color: colors.textSecondary }]}>
                {appointment.type}
              </Text>
              <Text style={[styles.appointmentDate, { color: colors.textSecondary }]}>
                {format(aptDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Session Timer */}
        <Card style={styles.timerCard}>
          <View style={styles.timerContent}>
            <View style={[styles.timerStatusBadge, {
              backgroundColor: timerState.status === 'running' ? `${colors.success}15` :
                               timerState.status === 'paused' ? `${colors.warning}15` :
                               timerState.status === 'completed' ? `${colors.primary}15` :
                               `${colors.textSecondary}15`
            }]}>
              <Icon
                name={timerState.status === 'running' ? 'play' :
                      timerState.status === 'paused' ? 'pause' :
                      timerState.status === 'completed' ? 'check' : 'clock'}
                size={16}
                color={timerState.status === 'running' ? colors.success :
                       timerState.status === 'paused' ? colors.warning :
                       timerState.status === 'completed' ? colors.primary :
                       colors.textSecondary}
              />
              <Text style={[styles.timerStatusText, {
                color: timerState.status === 'running' ? colors.success :
                       timerState.status === 'paused' ? colors.warning :
                       timerState.status === 'completed' ? colors.primary :
                       colors.textSecondary
              }]}>
                {timerState.status === 'running' ? 'Em andamento' :
                 timerState.status === 'paused' ? 'Pausada' :
                 timerState.status === 'completed' ? 'Concluída' : 'Não iniciada'}
              </Text>
            </View>

            <Text style={[styles.timerText, { color: colors.text }]}>
              {formatTime(elapsedTime)}
            </Text>

            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {timerState.status === 'not_started'
                ? 'Tempo estimado da sessão'
                : 'Tempo decorrido'}
            </Text>

            {/* Timer Controls */}
            {timerState.status !== 'not_started' && timerState.status !== 'completed' && (
              <View style={styles.timerControls}>
                {timerState.status === 'running' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handlePauseResume}
                    style={styles.timerButton}
                  >
                    <Icon name="pause" size={16} color={colors.warning} />
                    {' '}Pausar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handlePauseResume}
                    style={styles.timerButton}
                  >
                    <Icon name="play" size={16} color={colors.success} />
                    {' '}Retomar
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleCompleteSession}
                  style={styles.timerButton}
                >
                  <Icon name="check" size={16} color="#fff" />
                  {' '}Concluir
                </Button>
              </View>
            )}
          </View>
        </Card>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ações Rápidas</Text>

        <ActionCard
          icon="file-plus"
          title="Registrar Evolução SOAP"
          description="Adicione um registro completo de evolução do paciente"
          color="#3b82f6"
          onPress={handleGoToEvolution}
          colors={colors}
        />

        <ActionCard
          icon="video-camera"
          title="Análise de Movimento"
          description="Capture e analise os movimentos do paciente com IA"
          color="#8b5cf6"
          onPress={handleGoToMovementAnalysis}
          colors={colors}
        />

        {timerState.status === 'not_started' && (
          <ActionCard
            icon="play-circle"
            title="Iniciar Sessão"
            description="Comece a contagem de tempo da sessão"
            color="#22c55e"
            onPress={handleStartSession}
            loading={starting}
            colors={colors}
          />
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  icon,
  title,
  description,
  color,
  onPress,
  loading,
  colors,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
  colors: any;
}) {
  return (
    <Pressable onPress={onPress} disabled={loading}>
      <Card style={[styles.actionCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
        <View style={styles.actionContent}>
          <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
            {loading ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <Icon name={icon as any} size={24} color={color} />
            )}
          </View>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  patientCard: {
    padding: 20,
    marginBottom: 20,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  patientInfo: {
    flex: 1,
    gap: 4,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
  },
  appointmentType: {
    fontSize: 15,
    fontWeight: '500',
  },
  appointmentDate: {
    fontSize: 13,
  },
  timerCard: {
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  timerContent: {
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  timerLabel: {
    fontSize: 14,
  },
  timerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  timerStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timerButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionCard: {
    padding: 16,
    marginBottom: 12,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInfo: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 40,
  },
});
