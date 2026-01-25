import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  ListItem,
  Button,
  Badge,
  Avatar,
  Divider,
  SearchBar,
  Tabs,
  TabPanel,
  Modal,
  useTheme,
  toast,
  Skeleton,
  SkeletonText,
} from '@fisioflow/shared-ui';

// Mock data
const mockAppointments = [
  {
    id: '1',
    date: '2025-01-25',
    time: '14:00',
    duration: 60,
    status: 'scheduled',
    type: 'follow-up',
    professional: {
      id: 'prof1',
      name: 'Dra. Ana Silva',
      specialty: 'Fisioterapia Ortopédica',
      avatar: null,
    },
  },
  {
    id: '2',
    date: '2025-02-01',
    time: '10:00',
    duration: 60,
    status: 'scheduled',
    type: 'evaluation',
    professional: {
      id: 'prof1',
      name: 'Dra. Ana Silva',
      specialty: 'Fisioterapia Ortopédica',
      avatar: null,
    },
  },
  {
    id: '3',
    date: '2025-01-20',
    time: '15:30',
    duration: 45,
    status: 'completed',
    type: 'initial',
    professional: {
      id: 'prof1',
      name: 'Dra. Ana Silva',
      specialty: 'Fisioterapia Ortopédica',
      avatar: null,
    },
  },
];

const tabs = [
  { value: 'upcoming', label: 'Agendadas' },
  { value: 'past', label: 'Histórico' },
];

const statusConfig = {
  scheduled: { label: 'Agendada', color: 'info', icon: 'calendar' },
  completed: { label: 'Concluída', color: 'success', icon: 'checkmark-circle' },
  cancelled: { label: 'Cancelada', color: 'danger', icon: 'close-circle' },
  'no-show': { label: 'Não compareceu', color: 'warning', icon: 'alert-circle' },
};

const typeConfig = {
  initial: { label: 'Avaliação Inicial', color: 'primary' },
  'follow-up': { label: 'Retorno', color: 'secondary' },
  evaluation: { label: 'Avaliação', color: 'info' },
};

export default function AgendaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();
  const upcomingAppointments = mockAppointments.filter((apt) => apt.status === 'scheduled');
  const pastAppointments = mockAppointments.filter((apt) => apt.status !== 'scheduled');

  const filteredUpcoming = searchQuery
    ? upcomingAppointments.filter((apt) =>
      apt.professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.type.includes(searchQuery.toLowerCase())
    )
    : upcomingAppointments;

  const filteredPast = searchQuery
    ? pastAppointments.filter((apt) =>
      apt.professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.type.includes(searchQuery.toLowerCase())
    )
    : pastAppointments;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  const formatTime = (time: string) => {
    return time;
  };

  const handleCancel = () => {
    toast.success('Consulta cancelada com sucesso');
    setShowCancelModal(false);
    setSelectedAppointment(null);
  };

  const handleReschedule = () => {
    router.push('/(tabs)/profile');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.color as any} size="sm">
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const config = typeConfig[type as keyof typeof typeConfig];
    return (
      <Badge variant={config.color as any} size="xs">
        {config.label}
      </Badge>
    );
  };

  const renderAppointmentItem = (appointment: any) => {
    const isPast = appointment.status !== 'scheduled';
    const currentStatusConfig = statusConfig[appointment.status as keyof typeof statusConfig];
    const currentTypeConfig = typeConfig[appointment.type as keyof typeof typeConfig];

    return (
      <Card
        key={appointment.id}
        variant="elevated"
        style={styles.appointmentCard}
        pressable={!isPast}
        onPress={() => isPast ? null : setSelectedAppointment(appointment)}
      >
        <View style={styles.appointmentHeader}>
          <Avatar
            name={appointment.professional.name}
            size="md"
            style={styles.professionalAvatar}
          />
          <View style={styles.appointmentInfo}>
            <Text style={[styles.professionalName, { color: theme.colors.text.primary }]}>
              {appointment.professional.name}
            </Text>
            <Text style={[styles.professionalSpecialty, { color: theme.colors.text.secondary }]}>
              {appointment.professional.specialty}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.text.tertiary} />
            <Text style={[styles.detailText, { color: theme.colors.text.secondary }]}>
              {formatDate(appointment.date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={theme.colors.text.tertiary} />
            <Text style={[styles.detailText, { color: theme.colors.text.secondary }]}>
              {formatTime(appointment.time)}
            </Text>
            <Text style={[styles.detailText, { color: theme.colors.text.tertiary }]}>
              ({appointment.duration} min)
            </Text>
          </View>
        </View>

        <View style={styles.appointmentBadges}>
          <Badge
            variant={currentStatusConfig.color as any}
            size="sm"
            icon={<Ionicons name={currentStatusConfig.icon as any} size={14} color="#fff" />}
          >
            {currentStatusConfig.label}
          </Badge>
          <Badge variant={currentTypeConfig.color as any} size="xs">
            {currentTypeConfig.label}
          </Badge>
        </View>
      </Card>
    );
  };

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={theme.colors.gray[300]} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text.secondary }]}>
        Nenhuma consulta
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>
        {message}
      </Text>
      <Button
        variant="outline"
        onPress={() => router.push('/(tabs)/profile')}
        style={styles.emptyButton}
      >
        Agendar Consulta
      </Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Agenda
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
          Gerencie suas consultas
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar consultas ou profissionais"
        />
      </View>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TabPanel value="upcoming" activeValue={activeTab}>
          {filteredUpcoming.length === 0 ? (
            renderEmptyState('Você não tem consultas agendadas')
          ) : (
            filteredUpcoming.map((appointment) => renderAppointmentItem(appointment))
          )}
        </TabPanel>

        <TabPanel value="past" activeValue={activeTab}>
          {filteredPast.length === 0 ? (
            renderEmptyState('Nenhuma consulta realizada')
          ) : (
            filteredPast.map((appointment) => renderAppointmentItem(appointment))
          )}
        </TabPanel>
      </ScrollView>

      {/* Cancel Appointment Modal */}
      <Modal
        visible={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedAppointment(null);
        }}
        title="Cancelar Consulta"
        actions={[
          {
            label: 'Confirmar Cancelamento',
            onPress: handleCancel,
            variant: 'danger',
          },
          {
            label: 'Manter Consulta',
            onPress: () => setShowCancelModal(false),
            variant: 'ghost',
          },
        ]}
      >
        {selectedAppointment && (
          <View>
            <Text style={[styles.modalText, { color: theme.colors.text.secondary }]}>
              Tem certeza que deseja cancelar a consulta com{' '}
              <Text style={{ fontWeight: '600' }}>
                {selectedAppointment.professional.name}
              </Text>
              ?
            </Text>
            <View style={styles.modalDetails}>
              <Text style={[styles.modalDetailItem, { color: theme.colors.text.secondary }]}>
                • Data: {formatDate(selectedAppointment.date)}
              </Text>
              <Text style={[styles.modalDetailItem, { color: theme.colors.text.secondary }]}>
                • Horário: {selectedAppointment.time}
              </Text>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  appointmentCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  professionalAvatar: {},
  appointmentInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
  },
  professionalSpecialty: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  appointmentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  appointmentBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalDetails: {
    gap: 4,
  },
  modalDetailItem: {
    fontSize: 14,
  },
});
