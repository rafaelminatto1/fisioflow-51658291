/**
 * usePatientStats - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('appointments') → Firestore collection 'appointments'
 * - supabase.from('soap_records') → Firestore collection 'soap_records'
 */

import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';


// ============================================================================================
// TYPES & INTERFACES
// ============================================================================================

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

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  status: string;
  payment_status?: string;
}

export interface SOAPRecord {
  id: string;
  patient_id: string;
  created_at: string;
  status: string;
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

/**
 * Calculates the number of days between two dates
 */
function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  return differenceInDays(today, date);
}

/**
 * Checks if an appointment has a completed status
 */
function isAppointmentCompleted(appointment: Appointment): boolean {
  return COMPLETED_STATUSES.includes(appointment.status as typeof COMPLETED_STATUSES[number]);
}

/**
 * Checks if an appointment is scheduled/upcoming
 */
function isAppointmentScheduled(appointment: Appointment): boolean {
  return SCHEDULED_STATUSES.includes(appointment.status as typeof SCHEDULED_STATUSES[number]);
}

/**
 * Checks if an appointment was missed
 */
function isAppointmentMissed(appointment: Appointment): boolean {
  return MISSED_STATUSES.includes(appointment.status as typeof MISSED_STATUSES[number]);
}

/**
 * Checks if an appointment was a no-show
 */
function isAppointmentNoShow(appointment: Appointment): boolean {
  return NO_SHOW_STATUSES.includes(appointment.status as typeof NO_SHOW_STATUSES[number]);
}

/**
 * Checks if an appointment is unpaid (pending payment and completed)
 */
function isAppointmentUnpaid(appointment: Appointment): boolean {
  return appointment.payment_status === 'pending' && isAppointmentCompleted(appointment);
}

/**
 * Checks if an appointment date is today or in the future
 */
function isAppointmentUpcoming(appointment: Appointment): boolean {
  const appointmentDate = new Date(appointment.appointment_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return appointmentDate >= today && isAppointmentScheduled(appointment);
}

/**
 * Counts appointments by a predicate function
 */
function countAppointments(appointments: Appointment[], predicate: (a: Appointment) => boolean): number {
  return appointments.filter(predicate).length;
}

/**
 * Finds the first completed appointment or returns undefined
 */
function findFirstCompletedAppointment(appointments: Appointment[]): Appointment | undefined {
  return appointments.find(isAppointmentCompleted);
}

/**
 * Finds the first SOAP record (oldest) or returns undefined
 */
function findFirstSOAPRecord(soapRecords: SOAPRecord[]): SOAPRecord | undefined {
  return soapRecords[soapRecords.length - 1];
}

/**
 * Determines the first evaluation date from available data
 */
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

/**
 * Calculates statistics for a single patient from raw data
 */
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

/**
 * Classifies a patient based on their statistics
 */
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

// Helper to convert Firestore doc to Appointment
const convertDocToAppointment = (doc: { id: string; data: () => Record<string, unknown> }): Appointment => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Appointment;
};

// Helper to convert Firestore doc to SOAPRecord
const convertDocToSOAPRecord = (doc: { id: string; data: () => Record<string, unknown> }): SOAPRecord => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as SOAPRecord;
};

// ============================================================================================
// HOOKS
// ============================================================================================

/**
 * Hook to fetch statistics for a specific patient
 * @param patientId - The ID of the patient to fetch stats for
 */
export const usePatientStats = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ['patient-stats', patientId],
    queryFn: async (): Promise<PatientStats> => {
      if (!patientId) {
        throw new Error('ID do paciente não fornecido');
      }

      // Fetch all patient appointments
      const appointmentsQ = query(
        collection(db, 'appointments'),
        where('patient_id', '==', patientId),
        orderBy('appointment_date', 'desc')
      );
      const appointmentsSnap = await getDocs(appointmentsQ);
      const appointments = appointmentsSnap.docs.map(convertDocToAppointment);

      // Fetch finalized SOAP records
      const soapQ = query(
        collection(db, 'soap_records'),
        where('patient_id', '==', patientId),
        where('status', '==', 'finalized')
      );
      const soapSnap = await getDocs(soapQ);
      const soapRecords = soapSnap.docs.map(convertDocToSOAPRecord);

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

/**
 * Hook to fetch statistics for multiple patients at once
 * @param patientIds - Array of patient IDs to fetch stats for
 */
export const useMultiplePatientStats = (patientIds: string[]) => {
  return useQuery({
    queryKey: ['multiple-patient-stats', patientIds],
    queryFn: async (): Promise<Record<string, PatientStats>> => {
      if (!patientIds.length) {
        return {};
      }

      // Firestore has limit of 10 items in 'in' query, so we need to batch
      const batchSize = 10;
      const allAppointments: Appointment[] = [];
      const allSoapRecords: SOAPRecord[] = [];
      const batches = [];

      // Prepare batches
      for (let i = 0; i < patientIds.length; i += batchSize) {
        batches.push(patientIds.slice(i, i + batchSize));
      }

      // ⚡ Bolt Performance: Fetch batches in parallel and fix query bug
      // Previously sequential loop + broken query (searching documentId instead of patient_id)
      const batchResults = await Promise.all(
        batches.map(async (batch) => {
          // Fetch appointments and SOAP records in parallel for this batch
          const [appointmentsSnap, soapSnap] = await Promise.all([
            getDocs(query(
              collection(db, 'appointments'),
              where('patient_id', 'in', batch)
            )),
            getDocs(query(
              collection(db, 'soap_records'),
              where('patient_id', 'in', batch),
              where('status', '==', 'finalized')
            ))
          ]);

          return {
            appointments: appointmentsSnap.docs.map(convertDocToAppointment),
            soapRecords: soapSnap.docs.map(convertDocToSOAPRecord)
          };
        })
      );

      // Aggregate results
      batchResults.forEach(result => {
        allAppointments.push(...result.appointments);
        allSoapRecords.push(...result.soapRecords);
      });

      // Process each patient
      const statsMap: Record<string, PatientStats> = {};

      for (const id of patientIds) {
        const patientAppointments = allAppointments.filter(a => a.patient_id === id);
        const patientSoapRecords = allSoapRecords.filter(s => s.patient_id === id);

        const stats = calculatePatientStats({
          appointments: patientAppointments,
          soapRecords: patientSoapRecords,
        });

        const classification = classifyPatient(stats);

        statsMap[id] = {
          ...stats,
          classification,
        } as PatientStats;
      }

      return statsMap;
    },
    enabled: patientIds.length > 0,
    staleTime: QUERY_CONFIG.STALE_TIME,
  });
};

// ============================================================================================
// EXPORTED UTILITY FUNCTIONS
// ============================================================================================

/**
 * Formats the first evaluation date for display
 * @param dateString - The date string to format
 * @returns A human-readable relative date string
 */
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

/**
 * Formats a date string for display
 * @param dateString - The date string to format
 * @returns A formatted date string in pt-BR locale
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';

  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Gets the classification filter data for a given classification
 * @param classification - The classification to get filter data for
 * @returns The classification filter object or undefined
 */
export function getClassificationFilter(
  classification: PatientClassification
): PatientClassificationFilter | undefined {
  return PATIENT_CLASSIFICATIONS[classification];
}

/**
 * Gets all available classification filters
 * @returns An array of all classification filters
 */
export function getAllClassificationFilters(): PatientClassificationFilter[] {
  return Object.values(PATIENT_CLASSIFICATIONS);
}
