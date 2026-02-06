import { useState, useCallback, useEffect } from 'react';

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
import { format, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Appointment } from '@/types';

type AppointmentStatus = 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'faltou';

const getStatusOptions = (colors: any) => [
  { value: 'agendado' as const, label: 'Agendado', color: colors.primary },
  { value: 'confirmado' as const, label: 'Confirmado', color: '#22c55e' },
  { value: 'em_andamento' as const, label: 'Em Andamento', color: '#f59e0b' },
  { value: 'concluido' as const, label: 'Concluído', color: '#10b981' },
  { value: 'cancelado' as const, label: 'Cancelado', color: '#ef4444' },
  { value: 'faltou' as const, label: 'Faltou', color: colors.notification },
];

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const appointmentId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    loadAppointment();
  }, [appointmentId]);

  const loadAppointment = async () => {
    try {
      const docRef = doc(db, 'appointments', appointmentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setAppointment({ id: docSnap.id, ...docSnap.data() } as Appointment);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading appointment:', error);
      setLoading(false);
    }
  };

  const handleStatusChange = useCallback(async (status: AppointmentStatus) => {
    try {
      setUpdating(true);
      HapticFeedback.medium();
      await updateDoc(doc(db, 'appointments', appointmentId), { status });
      setAppointment((prev) => prev ? { ...prev, status } : null);
      HapticFeedback.success();
    } catch (error) {
      console.error('Error updating status:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    } finally {
      setUpdating(false);
    }
  }, [appointmentId]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Excluir Agendamento',
      'Tem certeza que deseja excluir este agendamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              HapticFeedback.medium();
              await deleteDoc(doc(db, 'appointments', appointmentId));
              HapticFeedback.success();
              router.back();
            } catch (error) {
              HapticFeedback.error();
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  }, [appointmentId, router]);

  const handleStartSession = useCallback(() => {
    HapticFeedback.light();
    router.push(`/agenda/${appointmentId}/start`);
  }, [appointmentId, router]);

  const handleEvaluate = useCallback(() => {
    HapticFeedback.light();
    router.push(`/agenda/${appointmentId}/evaluate`);
  }, [appointmentId, router]);

  const handleCreateEvolution = useCallback(() => {
    HapticFeedback.light();
    router.push(`/evolutions/new?appointmentId=${appointmentId}&patientId=${appointment?.patientId}`);
  }, [appointmentId, router, appointment?.patientId]);

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
  const isUpcoming = isFuture(aptDate);
  const isPastDate = isPast(aptDate);
  const canStart = appointment.status === 'confirmado' || appointment.status === 'agendado';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Agendamento</Text>
        <Pressable onPress={handleDelete}>
          <Icon name="trash-2" size={24} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Date Card */}
        <Card style={styles.dateCard}>
          <View style={styles.dateContainer}>
            <View style={[styles.dateBox, { backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.dateDay, { color: colors.primary }]}>
                {format(aptDate, 'dd')}
              </Text>
              <Text style={[styles.dateMonth, { color: colors.primary }]}>
                {format(aptDate, 'MMM', { locale: ptBR })}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, { color: colors.text }]}>
                {appointment.time}
              </Text>
              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                {appointment.duration || 60} minutos
              </Text>
            </View>
          </View>
          <Badge variant="default" size="md">{appointment.status}</Badge>
        </Card>

        {/* Patient Info */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Paciente</Text>
          <View style={styles.patientRow}>
            <Avatar name={appointment.patientName || ''} size={48} />
            <View style={styles.patientInfo}>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {appointment.patientName}
              </Text>
              <Text style={[styles.appointmentType, { color: colors.textSecondary }]}>
                {appointment.type}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(`/patients/${appointment.patientId}`)}
              style={[styles.viewButton, { backgroundColor: colors.card }]}
            >
              <Icon name="chevron-right" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </Card>

        {/* Notes */}
        {appointment.notes && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Observações</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>
              {appointment.notes}
            </Text>
          </Card>
        )}

        {/* Status Change */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Atualizar Status</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((status) => (
              <Pressable
                key={status.value}
                onPress={() => handleStatusChange(status.value)}
                disabled={updating}
                style={({ pressed }) => [
                  styles.statusButton,
                  {
                    backgroundColor: appointment.status === status.value ? status.color : colors.card,
                    opacity: pressed ? 0.8 : 1,
                    borderColor: status.color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    { color: appointment.status === status.value ? '#fff' : colors.text },
                  ]}
                >
                  {status.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          {(canStart || isUpcoming) && (
            <Button
              variant="primary"
              size="lg"
              onPress={handleStartSession}
              leftIcon={<Icon name="play" size={20} color="#fff" />}
              style={styles.actionButton}
            >
              Iniciar Sessão
            </Button>
          )}

          {isPastDate && (
            <>
              <Button
                variant="secondary"
                size="lg"
                onPress={handleEvaluate}
                leftIcon={<Icon name="clipboard-list" size={20} color={colors.text} />}
                style={styles.actionButton}
              >
                Avaliar
              </Button>
              <Button
                variant="outline"
                size="lg"
                onPress={handleCreateEvolution}
                leftIcon={<Icon name="file-plus" size={20} color={colors.primary} />}
                style={styles.actionButton}
              >
                Nova Evolução
              </Button>
            </>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  dateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timeContainer: {
    gap: 2,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 13,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentType: {
    fontSize: 14,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    width: '100%',
  },
  bottomSpacing: {
    height: 40,
  },
});
