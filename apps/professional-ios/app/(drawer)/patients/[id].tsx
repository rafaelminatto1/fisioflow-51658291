import { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, differenceInYears, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { calculateAge, formatPhone, getInitials } from '@/lib/utils';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Patient, SOAPRecord, Appointment, Evaluation } from '@/types';

type TabKey = 'info' | 'evolutions' | 'exercises' | 'appointments' | 'evaluations';

export default function PatientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const patientId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [evolutions, setEvolutions] = useState<SOAPRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  useEffect(() => {
    loadPatientData();
    loadEvolutions();
    loadAppointments();
    loadEvaluations();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPatient({
          id: docSnap.id,
          name: data.name || data.full_name || '',
          email: data.email,
          phone: formatPhone(data.phone || ''),
          cpf: data.cpf,
          birthDate: data.birth_date || data.birthDate || '',
          gender: data.gender,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          emergencyContact: data.emergency_contact || data.emergencyContact,
          emergency_phone: data.emergency_phone,
          medicalHistory: data.medicalHistory,
          mainCondition: data.mainCondition,
          status: data.status,
          progress: data.progress || 0,
          observations: data.observations,
          insurancePlan: data.insurancePlan || data.health_insurance,
          createdAt: data.created_at?.toDate?.() || new Date(),
          updatedAt: data.updated_at?.toDate?.() || new Date(),
        } as Patient);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading patient:', error);
      setLoading(false);
    }
  };

  const loadEvolutions = () => {
    const q = query(
      collection(db, 'evolutions'),
      where('patient_id', '==', patientId),
      orderBy('created_at', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const items: SOAPRecord[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SOAPRecord);
      });
      setEvolutions(items);
    });
  };

  const loadAppointments = () => {
    const q = query(
      collection(db, 'appointments'),
      where('patient_id', '==', patientId),
      orderBy('date', 'desc'),
      orderBy('time', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const items: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
      });
      setAppointments(items.slice(0, 10)); // Last 10
    });
  };

  const loadEvaluations = () => {
    const q = query(
      collection(db, 'evaluations'),
      where('patient_id', '==', patientId),
      orderBy('created_at', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const items: Evaluation[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Evaluation);
      });
      setEvaluations(items);
    });
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatientData();
    setRefreshing(false);
  }, []);

  const handleCall = useCallback(() => {
    if (patient?.phone) {
      HapticFeedback.light();
      Linking.openURL(`tel:${patient.phone}`);
    }
  }, [patient]);

  const handleWhatsApp = useCallback(() => {
    if (patient?.phone) {
      HapticFeedback.light();
      const cleanPhone = patient.phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/55${cleanPhone}`);
    }
  }, [patient]);

  const handleNewEvolution = useCallback(() => {
    HapticFeedback.light();
    router.push(`/evolutions/new?patientId=${patientId}`);
  }, [router, patientId]);

  const handleNewAppointment = useCallback(() => {
    HapticFeedback.light();
    router.push(`/agenda/new?patientId=${patientId}`);
  }, [router, patientId]);

  const handleCreateExercisePlan = useCallback(() => {
    HapticFeedback.light();
    router.push(`/exercise-plans/new?patientId=${patientId}`);
  }, [router, patientId]);

  const handleNewEvaluation = useCallback(() => {
    HapticFeedback.light();
    router.push(`/evaluations/new?patientId=${patientId}`);
  }, [router, patientId]);

  const handleDeletePatient = useCallback(() => {
    Alert.alert(
      'Excluir Paciente',
      'Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'patients', patientId));
              HapticFeedback.success();
              router.back();
            } catch (error) {
              HapticFeedback.error();
              Alert.alert('Erro', 'Não foi possível excluir o paciente.');
            }
          },
        },
      ]
    );
  }, [patientId, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="alert-triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Paciente não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(new Date(patient.birthDate));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Paciente</Text>
        <Pressable onPress={handleDeletePatient}>
          <Icon name="trash-2" size={24} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Patient Header */}
        <Card style={styles.headerCard}>
          <View style={styles.patientHeader}>
            <Avatar name={patient.name} size={72} />
            <View style={styles.patientInfo}>
              <Text style={[styles.patientName, { color: colors.text }]}>{patient.name}</Text>
              <Text style={[styles.patientDetails, { color: colors.textSecondary }]}>
                {age} anos • {patient.gender === 'masculino' ? 'Masculino' : 'Feminino'}
              </Text>
              <Badge variant="default" size="sm">{patient.status}</Badge>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${patient.progress}%`,
                    backgroundColor: patient.progress >= 70 ? colors.success : patient.progress >= 40 ? colors.warning : colors.error,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>Progresso: {patient.progress}%</Text>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable style={[styles.quickActionButton, { backgroundColor: colors.card }]} onPress={handleCall}>
            <Icon name="phone" size={20} color={colors.success} />
          </Pressable>
          <Pressable style={[styles.quickActionButton, { backgroundColor: colors.card }]} onPress={handleWhatsApp}>
            <Icon name="message-square" size={20} color="#25D366" />
          </Pressable>
          <Pressable style={[styles.quickActionButton, { backgroundColor: colors.card }]} onPress={handleNewEvolution}>
            <Icon name="file-plus" size={20} color={colors.primary} />
          </Pressable>
          <Pressable style={[styles.quickActionButton, { backgroundColor: colors.card }]} onPress={handleNewAppointment}>
            <Icon name="calendar-plus" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          <TabButton label="Info" active={activeTab === 'info'} onPress={() => setActiveTab('info')} colors={colors} />
          <TabButton label="Evoluções" active={activeTab === 'evolutions'} onPress={() => setActiveTab('evolutions')} count={evolutions.length} colors={colors} />
          <TabButton label="Exercícios" active={activeTab === 'exercises'} onPress={() => setActiveTab('exercises')} colors={colors} />
          <TabButton label="Agenda" active={activeTab === 'appointments'} onPress={() => setActiveTab('appointments')} count={appointments.length} colors={colors} />
          <TabButton label="Avaliações" active={activeTab === 'evaluations'} onPress={() => setActiveTab('evaluations')} count={evaluations.length} colors={colors} />
        </View>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <InfoSection patient={patient} colors={colors} />
          </View>
        )}

        {activeTab === 'evolutions' && (
          <View style={styles.tabContent}>
            <EvolutionsSection
              evolutions={evolutions}
              onView={(id) => router.push(`/evolutions/${id}`)}
              colors={colors}
            />
            {evolutions.length === 0 && (
              <Card style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhuma evolução registrada
                </Text>
                <Button variant="outline" size="sm" onPress={handleNewEvolution} style={styles.emptyButton}>
                  Nova Evolução
                </Button>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'exercises' && (
          <View style={styles.tabContent}>
            <ExercisesSection
              patientId={patientId}
              onCreatePlan={handleCreateExercisePlan}
              colors={colors}
            />
          </View>
        )}

        {activeTab === 'evaluations' && (
          <View style={styles.tabContent}>
            <EvaluationsSection
              evaluations={evaluations}
              onView={(id) => router.push(`/evaluations/${id}`)}
              onCreateNew={handleNewEvaluation}
              colors={colors}
            />
            {evaluations.length === 0 && (
              <Card style={styles.emptyCard}>
                <Icon name="clipboard" size={48} color={colors.primary} style={styles.emptyIcon} />
                <Text style={[styles.emptyText, { color: colors.text }]}>Nenhuma avaliação registrada</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Registre avaliações iniciais e de acompanhamento
                </Text>
                <Button variant="outline" size="sm" onPress={handleNewEvaluation} style={styles.emptyButton}>
                  Nova Avaliação
                </Button>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'appointments' && (
          <View style={styles.tabContent}>
            <AppointmentsSection
              appointments={appointments}
              onView={(id) => router.push(`/agenda/${id}`)}
              colors={colors}
            />
            {appointments.length === 0 && (
              <Card style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhum agendamento
                </Text>
                <Button variant="outline" size="sm" onPress={handleNewAppointment} style={styles.emptyButton}>
                  Novo Agendamento
                </Button>
              </Card>
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress, count, colors }: any) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Text style={[styles.tabButtonText, { color: active ? colors.primary : colors.textSecondary }]}>
        {label} {count !== undefined && `(${count})`}
      </Text>
      {active && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

function InfoSection({ patient, colors }: { patient: Patient; colors: any }) {
  return (
    <View style={styles.section}>
      {/* Contact Info */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contato</Text>
        <InfoItem icon="phone" label="Telefone" value={formatPhone(patient.phone || '')} colors={colors} />
        <InfoItem icon="mail" label="Email" value={patient.email || 'Não informado'} colors={colors} />
      </Card>

      {/* Address */}
      {patient.address && (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Endereço</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{patient.address}</Text>
          {patient.city && patient.state && (
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {patient.city} - {patient.state}
            </Text>
          )}
        </Card>
      )}

      {/* Medical Info */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Clínicas</Text>
        <InfoItem icon="stethoscope" label="Condição Principal" value={patient.mainCondition} colors={colors} />
        {patient.insurancePlan && (
          <InfoItem icon="credit-card" label="Convênio" value={patient.insurancePlan} colors={colors} />
        )}
        {patient.medicalHistory && (
          <View style={styles.medicalHistory}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Histórico Médico</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{patient.medicalHistory}</Text>
          </View>
        )}
      </Card>
    </View>
  );
}

function InfoItem({ icon, label, value, colors }: any) {
  if (!value) return null;
  return (
    <View style={styles.infoItem}>
      <Icon name={icon} size={18} color={colors.textSecondary} />
      <View style={styles.infoItemContent}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function EvolutionsSection({ evolutions, onView, colors }: any) {
  return (
    <View style={styles.section}>
      {evolutions.map((evolution: SOAPRecord, index: number) => (
        <Pressable key={evolution.id} onPress={() => onView(evolution.id)}>
          <Card style={styles.evolutionCard}>
            <View style={styles.evolutionHeader}>
              <Text style={[styles.evolutionTitle, { color: colors.text }]}>
                Sessão {evolution.sessionNumber}
              </Text>
              <Text style={[styles.evolutionDate, { color: colors.textSecondary }]}>
                {format(new Date(evolution.createdAt), "dd/MM/yyyy 'às' HH:mm")}
              </Text>
            </View>
            {evolution.subjective && (
              <Text style={[styles.evolutionPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                {evolution.subjective}
              </Text>
            )}
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function ExercisesSection({ patientId, onCreatePlan, colors }: any) {
  return (
    <View style={styles.section}>
      <Card style={styles.emptyCard}>
        <Icon name="dumbbell" size={48} color={colors.primary} style={styles.emptyIcon} />
        <Text style={[styles.emptyText, { color: colors.text }]}>Nenhum plano de exercícios</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Crie um plano personalizado para este paciente
        </Text>
        <Button variant="primary" onPress={onCreatePlan} style={styles.emptyButton}>
          Criar Plano
        </Button>
      </Card>
    </View>
  );
}

function AppointmentsSection({ appointments, onView, colors }: any) {
  return (
    <View style={styles.section}>
      {appointments.map((appointment: Appointment) => (
        <Pressable key={appointment.id} onPress={() => onView(appointment.id)}>
          <Card style={styles.appointmentCard}>
            <View style={styles.appointmentRow}>
              <Text style={[styles.appointmentTime, { color: colors.primary }]}>
                {appointment.time}
              </Text>
              <View style={styles.appointmentInfo}>
                <Text style={[styles.appointmentType, { color: colors.text }]}>{appointment.type}</Text>
                <Text style={[styles.appointmentDate, { color: colors.textSecondary }]}>
                  {format(new Date(appointment.date), "dd/MM/yyyy")}
                </Text>
              </View>
              <Badge variant="default" size="sm">{appointment.status}</Badge>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function EvaluationsSection({ evaluations, onView, onCreateNew, colors }: any) {
  return (
    <View style={styles.section}>
      {evaluations.map((evaluation: any) => (
        <Pressable key={evaluation.id} onPress={() => onView(evaluation.id)}>
          <Card style={styles.evaluationCard}>
            <View style={styles.evaluationHeader}>
              <Text style={[styles.evaluationTitle, { color: colors.text }]}>
                {evaluation.chiefComplaint || 'Avaliação'}
              </Text>
              <Text style={[styles.evaluationDate, { color: colors.textSecondary }]}>
                {format(new Date(evaluation.createdAt), "dd/MM/yyyy")}
              </Text>
            </View>
            {evaluation.diagnosis && (
              <Text style={[styles.evaluationPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                <Text style={styles.evaluationDiagnosis}>Diagnóstico:</Text> {evaluation.diagnosis}
              </Text>
            )}
          </Card>
        </Pressable>
      ))}
      {evaluations.length === 0 && (
        <Button variant="primary" onPress={onCreateNew} style={styles.createNewButton}>
          <Icon name="plus" size={16} color="#fff" />
          {' '}Primeira Avaliação
        </Button>
      )}
    </View>
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
  headerCard: {
    margin: 16,
    padding: 16,
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
  patientDetails: {
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    gap: 16,
  },
  sectionCard: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  infoItemContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
  },
  medicalHistory: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  evolutionCard: {
    padding: 14,
    marginBottom: 12,
  },
  evolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evolutionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  evolutionDate: {
    fontSize: 12,
  },
  evolutionPreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  appointmentCard: {
    padding: 14,
    marginBottom: 12,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '700',
    width: 50,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentType: {
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentDate: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    minWidth: 150,
  },
  evaluationCard: {
    padding: 14,
    marginBottom: 12,
  },
  evaluationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evaluationTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  evaluationDate: {
    fontSize: 12,
  },
  evaluationPreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  evaluationDiagnosis: {
    fontWeight: '600',
  },
  createNewButton: {
    minWidth: 150,
  },
  bottomSpacing: {
    height: 40,
  },
});
