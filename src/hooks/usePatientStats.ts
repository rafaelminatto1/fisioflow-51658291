/**
 * usePatientStats - Migrated to Neon/Workers
 */




// ============================================================================================
// TYPES & INTERFACES
// ============================================================================================

import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { appointmentsApi } from '@/api/v2/appointments';
import { sessionsApi } from '@/api/v2/clinical';
import type { AppointmentRow, SessionRecord } from '@/types/workers';

export interface PatientStats {
  sessionsCompleted: number;
  firstEvaluationDate?: string;
  lastAppointmentDate?: string;
  daysSinceLastAppointment: number;
  unpaidSessionsCount: number;
  noShowCount: number;
  missedAppointmentsCount: number;
  upcomingAppointmentsCount: number;
  totalAppointments: number;
  classification: PatientClassification;
}

export type PatientClassification =
  | 'active'
  | 'inactive_7'
  | 'inactive_30'
  | 'inactive_custom'
  | 'no_show_risk'
  | 'has_unpaid'
  | 'new_patient'
  | 'completed_treatment';

export interface PatientClassificationFilter {
  value: PatientClassification | 'all';
  label: string;
  description: string;
  icon: string;
  color: string;
}

export type Appointment = AppointmentRow;

export interface SOAPRecord {
  id: string;
  patient_id: string;
  created_at: string;
  status: string;
  record_date: string;
}

interface PatientStatsInput {
  appointments: Appointment[];
  soapRecords: SOAPRecord[];
}

interface ClassificationStats {
  sessionsCompleted: number;
  daysSinceLastAppointment: number;
  unpaidSessionsCount: number;
  noShowCount: number;
  upcomingAppointmentsCount: number;
  totalAppointments: number;
}

// ============================================================================================
// CONSTANTS
// ============================================================================================

// Status mappings for better type safety
const COMPLETED_STATUSES = ['completed', 'Realizado', 'concluido'] as const;
const SCHEDULED_STATUSES = ['scheduled', 'confirmed', 'agendado', 'confirmado'] as const;
const MISSED_STATUSES = ['cancelled', 'no_show', 'missed', 'Cancelado', 'cancelado', 'falta'] as const;
const NO_SHOW_STATUSES = ['no_show', 'missed', 'falta'] as const;

// Classification thresholds (in days)
const THRESHOLDS = {
  INACTIVE_CUSTOM: 60,
  INACTIVE_30: 30,
  INACTIVE_7: 7,
  NO_SHOW_RISK_COUNT: 2,
} as const;

// Query configuration
const QUERY_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
} as const;

export const PATIENT_CLASSIFICATIONS: Record<PatientClassification, PatientClassificationFilter> = {
  active: {
    value: 'active',
    label: 'Ativos',
    description: 'Pacientes com atividade nos últimos 7 dias',
    icon: '💚',
    color: 'emerald'
  },
  inactive_7: {
    value: 'inactive_7',
    label: 'Inativos (7 dias)',
    description: 'Sem comparecimento há mais de 7 dias',
    icon: '⚠️',
    color: 'amber'
  },
  inactive_30: {
    value: 'inactive_30',
    label: 'Inativos (30 dias)',
    description: 'Sem comparecimento há mais de 30 dias',
    icon: '🔴',
    color: 'red'
  },
  inactive_custom: {
    value: 'inactive_custom',
    label: 'Inativos (60+ dias)',
    description: 'Sem comparecimento há mais de 60 dias',
    icon: '⭕',
    color: 'gray'
  },
  no_show_risk: {
    value: 'no_show_risk',
    label: 'Risco de No-Show',
    description: 'Pacientes com faltas não justificadas',
    icon: '🚫',
    color: 'orange'
  },
  has_unpaid: {
    value: 'has_unpaid',
    label: 'Com Pendências',
    description: 'Possuem sessões pagas e não compareceram',
    icon: '💰',
    color: 'yellow'
  },
  new_patient: {
    value: 'new_patient',
    label: 'Novos Pacientes',
    description: 'Ainda não realizaram sessões',
    icon: '🆕',
    color: 'blue'
  },
  completed_treatment: {
    value: 'completed_treatment',
    label: 'Tratamento Concluído',
    description: 'Pacientes com status concluído',
    icon: '✅',
    color: 'green'
  }
} as const;

// ============================================================================================
// UTILITY FUNCTIONS
// ============================================================================================

function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  return differenceInDays(today, date);
}

function isAppointmentCompleted(appointment: Appointment): boolean {
  return COMPLETED_STATUSES.includes(appointment.status as typeof COMPLETED_STATUSES[number]);
}

function isAppointmentScheduled(appointment: Appointment): boolean {
  return SCHEDULED_STATUSES.includes(appointment.status as typeof SCHEDULED_STATUSES[number]);
}

function isAppointmentMissed(appointment: Appointment): boolean {
  return MISSED_STATUSES.includes(appointment.status as typeof MISSED_STATUSES[number]);
}

function isAppointmentNoShow(appointment: Appointment): boolean {
  return NO_SHOW_STATUSES.includes(appointment.status as typeof NO_SHOW_STATUSES[number]);
}

function isAppointmentUnpaid(appointment: Appointment): boolean {
  return appointment.payment_status === 'pending' && isAppointmentCompleted(appointment);
}

function isAppointmentUpcoming(appointment: Appointment): boolean {
  const appointmentDate = new Date(appointment.appointment_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return appointmentDate >= today && isAppointmentScheduled(appointment);
}

function countAppointments(appointments: Appointment[], predicate: (a: Appointment) => boolean): number {
  return appointments.filter(predicate).length;
}

function findFirstCompletedAppointment(appointments: Appointment[]): Appointment | undefined {
  return appointments.find(isAppointmentCompleted);
}

function findFirstSOAPRecord(soapRecords: SOAPRecord[]): SOAPRecord | undefined {
  return soapRecords[soapRecords.length - 1];
}

function determineFirstEvaluationDate(
  soapRecords: SOAPRecord[],
  appointments: Appointment[]
): string | undefined {
  const firstSoap = findFirstSOAPRecord(soapRecords);
  const firstAppointment = findFirstCompletedAppointment(appointments);
  const lastAppointment = appointments[appointments.length - 1];

  return firstSoap?.created_at ||
    firstAppointment?.appointment_date ||
    lastAppointment?.appointment_date;
}

function calculatePatientStats(input: PatientStatsInput): Omit<PatientStats, 'classification'> {
  const { appointments, soapRecords } = input;

  const sessionsCompleted = soapRecords.length;
  const totalAppointments = appointments.length;

  const firstEvaluationDate = determineFirstEvaluationDate(soapRecords, appointments);
  const lastAppointment = appointments[0];
  const lastAppointmentDate = lastAppointment?.appointment_date;

  const daysSinceLastAppointment = lastAppointmentDate
    ? calculateDaysSince(lastAppointmentDate)
    : 0;

  const unpaidSessionsCount = countAppointments(appointments, isAppointmentUnpaid);
  const noShowCount = countAppointments(appointments, isAppointmentNoShow);
  const missedAppointmentsCount = countAppointments(appointments, isAppointmentMissed);
  const upcomingAppointmentsCount = countAppointments(appointments, isAppointmentUpcoming);

  return {
    sessionsCompleted,
    firstEvaluationDate,
    lastAppointmentDate,
    daysSinceLastAppointment,
    unpaidSessionsCount,
    noShowCount,
    missedAppointmentsCount,
    upcomingAppointmentsCount,
    totalAppointments,
  };
}

function classifyPatient(stats: ClassificationStats): PatientClassification {
  // If has unpaid sessions and no-shows
  if (stats.unpaidSessionsCount > 0 && stats.noShowCount > 0) {
    return 'has_unpaid';
  }

  // If has many no-shows
  if (stats.noShowCount >= THRESHOLDS.NO_SHOW_RISK_COUNT) {
    return 'no_show_risk';
  }

  // If never had sessions
  if (stats.sessionsCompleted === 0 && stats.totalAppointments === 0) {
    return 'new_patient';
  }

  // If has upcoming appointment
  if (stats.upcomingAppointmentsCount > 0) {
    return 'active';
  }

  // Classify by inactivity level
  if (stats.daysSinceLastAppointment >= THRESHOLDS.INACTIVE_CUSTOM) {
    return 'inactive_custom';
  } else if (stats.daysSinceLastAppointment >= THRESHOLDS.INACTIVE_30) {
    return 'inactive_30';
  } else if (stats.daysSinceLastAppointment >= THRESHOLDS.INACTIVE_7) {
    return 'inactive_7';
  }

  return 'active';
}

const sessionToSOAPRecord = (session: SessionRecord): SOAPRecord => ({
  id: session.id,
  patient_id: session.patient_id,
  created_at: session.created_at,
  status: session.status,
  record_date: session.record_date,
});

const sortAppointmentsDesc = (appointments: Appointment[]) =>
  [...appointments].sort((a, b) => {
    const dateA = new Date(a.appointment_date).getTime();
    const dateB = new Date(b.appointment_date).getTime();
    return dateB - dateA;
  });

const sortSoapRecordsDesc = (records: SOAPRecord[]) =>
  [...records].sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());

const fetchAllAppointments = async (patientId: string): Promise<Appointment[]> => {
  const pageSize = 1000;
  const appointments: Appointment[] = [];
  let offset = 0;

  while (true) {
    const res = await appointmentsApi.list({ patientId, limit: pageSize, offset });
    const chunk = (res?.data ?? []) as Appointment[];
    appointments.push(...chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }

  return sortAppointmentsDesc(appointments);
};

const fetchFinalizedSessions = async (patientId: string): Promise<SOAPRecord[]> => {
  const pageSize = 200;
  const records: SOAPRecord[] = [];
  let offset = 0;

  while (true) {
    const res = await sessionsApi.list({
      patientId,
      status: 'finalized',
      limit: pageSize,
      offset,
    });
    const chunk = (res?.data ?? []) as SessionRecord[];
    records.push(...chunk.map(sessionToSOAPRecord));
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }

  return sortSoapRecordsDesc(records);
};

// ============================================================================================
// HOOKS
// ============================================================================================

export const usePatientStats = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ['patient-stats', patientId],
    queryFn: async (): Promise<PatientStats> => {
      if (!patientId) {
        throw new Error('ID do paciente não fornecido');
      }

      const [appointments, soapRecords] = await Promise.all([
        fetchAllAppointments(patientId),
        fetchFinalizedSessions(patientId),
      ]);

      // Calculate statistics
      const stats = calculatePatientStats({
        appointments,
        soapRecords,
      });

      // Determine classification
      const classification = classifyPatient(stats);

      return {
        ...stats,
        classification,
      } as PatientStats;
    },
    enabled: !!patientId,
    staleTime: QUERY_CONFIG.STALE_TIME,
  });
};

export const useMultiplePatientStats = (patientIds: string[]) => {
  return useQuery({
    queryKey: ['multiple-patient-stats', patientIds],
    queryFn: async (): Promise<Record<string, PatientStats>> => {
      if (!patientIds.length) {
        return {};
      }

      const statsMap: Record<string, PatientStats> = {};

      await Promise.all(
        patientIds.map(async (id) => {
          const [appointments, soapRecords] = await Promise.all([
            fetchAllAppointments(id),
            fetchFinalizedSessions(id),
          ]);

          const stats = calculatePatientStats({
            appointments,
            soapRecords,
          });

          const classification = classifyPatient(stats);
          statsMap[id] = { ...stats, classification };
        }),
      );

      return statsMap;
    },
    enabled: patientIds.length > 0,
    staleTime: QUERY_CONFIG.STALE_TIME,
  });
};

// ============================================================================================
// EXPORTED UTILITY FUNCTIONS
// ============================================================================================

export function formatFirstEvaluationDate(dateString?: string): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
  return `${Math.floor(diffDays / 365)} anos atrás`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';

  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function getClassificationFilter(
  classification: PatientClassification
): PatientClassificationFilter | undefined {
  return PATIENT_CLASSIFICATIONS[classification];
}

export function getAllClassificationFilters(): PatientClassificationFilter[] {
  return Object.values(PATIENT_CLASSIFICATIONS);
}
