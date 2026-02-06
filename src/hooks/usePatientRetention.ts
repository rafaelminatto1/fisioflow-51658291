

// Query keys for retention

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, orderBy, getDocs, addDoc, updateDoc, doc, db } from '@/integrations/firebase/app';
import { subDays, subMonths, format, differenceInDays, startOfMonth, parseISO } from 'date-fns';
import { CACHE_TIMES, STALE_TIMES } from '@/lib/queryConfig';
import { PatientHelpers } from '@/types';

const RETENTION_KEYS = {
  all: ['retention'] as const,
  metrics: () => [...RETENTION_KEYS.all, 'metrics'] as const,
  patientsAtRisk: (minScore: number) => [...RETENTION_KEYS.all, 'at-risk', minScore] as const,
  cohorts: (months: number) => [...RETENTION_KEYS.all, 'cohorts', months] as const,
  trends: (months: number) => [...RETENTION_KEYS.all, 'trends', months] as const,
};

// Types
export interface RetentionMetrics {
  churnRate: number;
  retentionRate: number;
  averageLTV: number;
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  dormantPatients: number;
  atRiskCount: number;
  projectedRevenueLoss: number;
}

export interface PatientAtRisk {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lastAppointmentDate: string | null;
  daysSinceLastSession: number;
  cancellationRate: number;
  totalSessions: number;
  riskScore: number;
  riskFactors: string[];
  averageSessionValue: number;
}

export interface CohortData {
  cohortMonth: string;
  totalPatients: number;
  retention: number[];
}

export interface ChurnTrend {
  month: string;
  churnRate: number;
  churnCount: number;
  totalActive: number;
}

export interface ReactivationCampaign {
  id: string;
  name: string;
  templateMessage: string;
  patientIds: string[];
  status: 'draft' | 'scheduled' | 'sent' | 'completed';
  scheduledAt: string | null;
  sentAt: string | null;
  responseRate: number | null;
  createdAt: string;
}

// Calculate risk score based on multiple factors
function calculateRiskScore(
  daysSinceLastSession: number,
  cancellationRate: number,
  totalSessions: number
): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Days since last session (0-40 points)
  if (daysSinceLastSession > 90) {
    score += 40;
    factors.push('Sem sessão há mais de 90 dias');
  } else if (daysSinceLastSession > 60) {
    score += 30;
    factors.push('Sem sessão há mais de 60 dias');
  } else if (daysSinceLastSession > 30) {
    score += 20;
    factors.push('Sem sessão há mais de 30 dias');
  } else if (daysSinceLastSession > 14) {
    score += 10;
    factors.push('Sem sessão há mais de 14 dias');
  }

  // Cancellation rate (0-35 points)
  if (cancellationRate > 0.5) {
    score += 35;
    factors.push('Taxa de cancelamento muito alta (>50%)');
  } else if (cancellationRate > 0.3) {
    score += 25;
    factors.push('Taxa de cancelamento alta (>30%)');
  } else if (cancellationRate > 0.15) {
    score += 15;
    factors.push('Taxa de cancelamento moderada (>15%)');
  }

  // Total sessions - new patients are at higher risk (0-25 points)
  if (totalSessions <= 2) {
    score += 25;
    factors.push('Paciente novo (poucas sessões)');
  } else if (totalSessions <= 5) {
    score += 15;
    factors.push('Paciente em fase inicial');
  } else if (totalSessions <= 10) {
    score += 5;
  }

  return { score: Math.min(100, score), factors };
}

// Hook for retention metrics
export function useRetentionMetrics() {
  return useQuery({
    queryKey: RETENTION_KEYS.metrics(),
    queryFn: async (): Promise<RetentionMetrics> => {
      const now = new Date();

      // Get all patients with their activity
      const patientsQuery = firestoreQuery(
        collection(db, 'patients')
      );
      const patientsSnap = await getDocs(patientsQuery);

      if (patientsSnap.empty) {
        return {
          churnRate: 0,
          retentionRate: 0,
          averageLTV: 0,
          totalPatients: 0,
          activePatients: 0,
          inactivePatients: 0,
          dormantPatients: 0,
          atRiskCount: 0,
          projectedRevenueLoss: 0,
        };
      }

      const patients = patientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get appointments for each patient
      const appointmentsQuery = firestoreQuery(
        collection(db, 'appointments'),
        orderBy('appointment_date', 'desc')
      );
      const appointmentsSnap = await getDocs(appointmentsQuery);

      const appointments = appointmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group appointments by patient
      const appointmentsByPatient = new Map<string, typeof appointments>();
      appointments.forEach(apt => {
        const existing = appointmentsByPatient.get(apt.patient_id) || [];
        existing.push(apt);
        appointmentsByPatient.set(apt.patient_id, existing);
      });

      let activeCount = 0;
      let inactiveCount = 0;
      let dormantCount = 0;
      let atRiskCount = 0;
      let totalLTV = 0;
      let projectedLoss = 0;

      patients.forEach(_patient => {
        const patientAppointments = appointmentsByPatient.get(_patient.id) || [];
        const completedAppointments = patientAppointments.filter(a => a.status === 'concluido');
        const lastAppointment = completedAppointments[0];

        // Calculate LTV
        const patientLTV = completedAppointments.reduce((sum, a) => sum + (Number(a.payment_amount) || 0), 0);
        totalLTV += patientLTV;

        if (!lastAppointment) {
          dormantCount++;
          return;
        }

        const lastDate = parseISO(lastAppointment.appointment_date);
        const daysSince = differenceInDays(now, lastDate);

        if (daysSince <= 30) {
          activeCount++;
        } else if (daysSince <= 90) {
          inactiveCount++;
          atRiskCount++;
          // Projected loss: average monthly value * 12 months
          const avgMonthly = patientLTV / Math.max(1, completedAppointments.length / 4);
          projectedLoss += avgMonthly * 3;
        } else {
          dormantCount++;
        }
      });

      const totalPatients = patients.length;
      const churnRate = totalPatients > 0 ? ((inactiveCount + dormantCount) / totalPatients) * 100 : 0;
      const retentionRate = totalPatients > 0 ? (activeCount / totalPatients) * 100 : 0;
      const averageLTV = totalPatients > 0 ? totalLTV / totalPatients : 0;

      return {
        churnRate: Math.round(churnRate * 10) / 10,
        retentionRate: Math.round(retentionRate * 10) / 10,
        averageLTV: Math.round(averageLTV * 100) / 100,
        totalPatients,
        activePatients: activeCount,
        inactivePatients: inactiveCount,
        dormantPatients: dormantCount,
        atRiskCount,
        projectedRevenueLoss: Math.round(projectedLoss * 100) / 100,
      };
    },
    staleTime: STALE_TIMES.STABLE,
    gcTime: CACHE_TIMES.DEFAULT,
  });
}

// Hook for patients at risk
export function usePatientsAtRisk(minRiskScore: number = 30) {
  return useQuery({
    queryKey: RETENTION_KEYS.patientsAtRisk(minRiskScore),
    queryFn: async (): Promise<PatientAtRisk[]> => {
      const now = new Date();

      const patientsQuery = firestoreQuery(
        collection(db, 'patients'),
        where('status', '==', 'ativo')
      );
      const patientsSnap = await getDocs(patientsQuery);

      if (patientsSnap.empty) {
        return [];
      }

      const patients = patientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const appointmentsQuery = firestoreQuery(
        collection(db, 'appointments')
      );
      const appointmentsSnap = await getDocs(appointmentsQuery);

      const appointments = appointmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const appointmentsByPatient = new Map<string, typeof appointments>();
      appointments.forEach(apt => {
        const existing = appointmentsByPatient.get(apt.patient_id) || [];
        existing.push(apt);
        appointmentsByPatient.set(apt.patient_id, existing);
      });

      const patientsAtRisk: PatientAtRisk[] = [];

      patients.forEach(patient => {
        const patientAppointments = appointmentsByPatient.get(patient.id) || [];
        const completedAppointments = patientAppointments.filter(a => a.status === 'concluido');
        const cancelledAppointments = patientAppointments.filter(a => a.status === 'cancelado');

        const totalAppointments = patientAppointments.length;
        const cancellationRate = totalAppointments > 0
          ? cancelledAppointments.length / totalAppointments
          : 0;

        // Find last appointment
        const sortedCompleted = completedAppointments.sort(
          (a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        );
        const lastAppointment = sortedCompleted[0];
        const lastDate = lastAppointment ? parseISO(lastAppointment.appointment_date) : null;
        const daysSinceLastSession = lastDate ? differenceInDays(now, lastDate) : 365;

        const { score, factors } = calculateRiskScore(
          daysSinceLastSession,
          cancellationRate,
          completedAppointments.length
        );

        if (score >= minRiskScore) {
          const totalRevenue = completedAppointments.reduce(
            (sum, a) => sum + (Number(a.payment_amount) || 0), 0
          );
          const avgValue = completedAppointments.length > 0
            ? totalRevenue / completedAppointments.length
            : 0;

          patientsAtRisk.push({
            id: patient.id,
            name: PatientHelpers.getName(patient),
            email: patient.email || null,
            phone: patient.phone || null,
            lastAppointmentDate: lastAppointment?.appointment_date || null,
            daysSinceLastSession,
            cancellationRate: Math.round(cancellationRate * 100),
            totalSessions: completedAppointments.length,
            riskScore: score,
            riskFactors: factors,
            averageSessionValue: Math.round(avgValue * 100) / 100,
          });
        }
      });

      return patientsAtRisk.sort((a, b) => b.riskScore - a.riskScore);
    },
    staleTime: STALE_TIMES.STABLE,
    gcTime: CACHE_TIMES.DEFAULT,
  });
}

// Hook for cohort analysis
export function useCohortAnalysis(months: number = 12) {
  return useQuery({
    queryKey: RETENTION_KEYS.cohorts(months),
    queryFn: async (): Promise<CohortData[]> => {
      const now = new Date();

      // Get patients with creation date
      const patientsQuery = firestoreQuery(
        collection(db, 'patients'),
        where('created_at', '>=', subMonths(now, months).toISOString())
      );
      const patientsSnap = await getDocs(patientsQuery);

      if (patientsSnap.empty) {
        return [];
      }

      const patients = patientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all appointments
      const appointmentsQuery = firestoreQuery(
        collection(db, 'appointments'),
        where('status', '==', 'concluido')
      );
      const appointmentsSnap = await getDocs(appointmentsQuery);

      const appointments = appointmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const appointmentsByPatient = new Map<string, Set<string>>();
      appointments.forEach(apt => {
        const monthKey = format(parseISO(apt.appointment_date), 'yyyy-MM');
        const existing = appointmentsByPatient.get(apt.patient_id) || new Set();
        existing.add(monthKey);
        appointmentsByPatient.set(apt.patient_id, existing);
      });

      // Group patients by cohort month
      const cohorts = new Map<string, string[]>();
      patients.forEach(patient => {
        const cohortMonth = format(parseISO(patient.created_at), 'yyyy-MM');
        const existing = cohorts.get(cohortMonth) || [];
        existing.push(patient.id);
        cohorts.set(cohortMonth, existing);
      });

      // Calculate retention for each cohort
      const cohortData: CohortData[] = [];
      const sortedCohortMonths = Array.from(cohorts.keys()).sort();

      sortedCohortMonths.forEach(cohortMonth => {
        const patientIds = cohorts.get(cohortMonth) || [];
        const totalPatients = patientIds.length;
        const retention: number[] = [];

        // Calculate retention for each subsequent month
        for (let i = 0; i < 12; i++) {
          const targetMonth = format(
            new Date(parseISO(cohortMonth + '-01').getTime() + i * 30 * 24 * 60 * 60 * 1000),
            'yyyy-MM'
          );

          // Check if target month is in the future
          if (parseISO(targetMonth + '-01') > now) {
            break;
          }

          const retainedCount = patientIds.filter(pid => {
            const patientMonths = appointmentsByPatient.get(pid);
            return patientMonths?.has(targetMonth);
          }).length;

          retention.push(totalPatients > 0 ? Math.round((retainedCount / totalPatients) * 100) : 0);
        }

        if (totalPatients > 0) {
          cohortData.push({
            cohortMonth,
            totalPatients,
            retention,
          });
        }
      });

      return cohortData.slice(-12);
    },
    staleTime: STALE_TIMES.STATIC,
    gcTime: CACHE_TIMES.LONG,
  });
}

// Hook for churn trends
export function useChurnTrends(months: number = 12) {
  return useQuery({
    queryKey: RETENTION_KEYS.trends(months),
    queryFn: async (): Promise<ChurnTrend[]> => {
      const now = new Date();
      const trends: ChurnTrend[] = [];

      // Get all patients
      const patientsQuery = firestoreQuery(
        collection(db, 'patients')
      );
      const patientsSnap = await getDocs(patientsQuery);

      if (patientsSnap.empty) {
        return [];
      }

      const patients = patientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all completed appointments
      const appointmentsQuery = firestoreQuery(
        collection(db, 'appointments'),
        where('status', '==', 'concluido'),
        where('appointment_date', '>=', subMonths(now, months + 3).toISOString())
      );
      const appointmentsSnap = await getDocs(appointmentsQuery);

      const appointments = appointmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group appointments by patient and month
      const lastAppointmentByPatient = new Map<string, Date>();
      appointments.forEach(apt => {
        const aptDate = parseISO(apt.appointment_date);
        const current = lastAppointmentByPatient.get(apt.patient_id);
        if (!current || aptDate > current) {
          lastAppointmentByPatient.set(apt.patient_id, aptDate);
        }
      });

      for (let i = months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        const monthKey = format(monthStart, 'MMM/yy');

        // Count active patients at start of month
        let activeAtStart = 0;
        let churnedDuringMonth = 0;

        patients.forEach(patient => {
          const createdAt = parseISO(patient.created_at);
          if (createdAt > monthStart) return;

          const lastApt = lastAppointmentByPatient.get(patient.id);
          if (!lastApt) return;

          // Was active at start of month (had appointment in last 60 days before month)
          const sixtyDaysBeforeMonth = subDays(monthStart, 60);
          if (lastApt >= sixtyDaysBeforeMonth && lastApt < monthStart) {
            activeAtStart++;

            // Check if churned during this month
            const nextApts = appointments.filter(
              a => a.patient_id === patient.id &&
                parseISO(a.appointment_date) >= monthStart &&
                parseISO(a.appointment_date) < monthEnd
            );

            if (!nextApts?.length) {
              churnedDuringMonth++;
            }
          }
        });

        const churnRate = activeAtStart > 0
          ? Math.round((churnedDuringMonth / activeAtStart) * 100 * 10) / 10
          : 0;

        trends.push({
          month: monthKey,
          churnRate,
          churnCount: churnedDuringMonth,
          totalActive: activeAtStart,
        });
      }

      return trends;
    },
    staleTime: STALE_TIMES.STATIC,
    gcTime: CACHE_TIMES.LONG,
  });
}

// Hook for sending reactivation campaigns
export function useSendReactivationCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientIds,
      message,
      channel
    }: {
      patientIds: string[];
      message: string;
      channel: 'whatsapp' | 'email' | 'sms';
    }) => {
      // Create campaign in crm_campanhas
      const campaignData = {
        nome: `Reativação - ${format(new Date(), 'dd/MM/yyyy')}`,
        tipo: channel,
        conteudo: message,
        status: 'enviando',
        total_destinatarios: patientIds.length,
        created_at: new Date().toISOString(),
      };

      const campaignRef = await addDoc(collection(db, 'crm_campanhas'), campaignData);

      if (patientIds.length === 0) {
        // If no patients to send to, just complete the campaign immediately
        await updateDoc(doc(db, 'crm_campanhas', campaignRef.id), {
          status: 'concluida',
          total_enviados: 0,
          concluida_em: new Date().toISOString(),
        });

        return { id: campaignRef.id, ...campaignData };
      }

      // Get patient details for sending
      const patientsQuery = firestoreQuery(
        collection(db, 'patients')
      );
      const patientsSnap = await getDocs(patientsQuery);

      const allPatients = patientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const filteredPatients = allPatients.filter(p => patientIds.includes(p.id));

      // Here you would integrate with actual messaging service
      // For now, we'll just log the campaign envios
      const envios = filteredPatients.map(() => ({
        campanha_id: campaignRef.id,
        lead_id: null,
        status: 'enviado',
        enviado_em: new Date().toISOString(),
      }));

      if (envios?.length) {
        await Promise.all(envios.map(e => addDoc(collection(db, 'crm_campanha_envios'), e)));
      }

      // Update campaign status
      await updateDoc(doc(db, 'crm_campanhas', campaignRef.id), {
        status: 'concluida',
        total_enviados: patientIds.length,
        concluida_em: new Date().toISOString(),
      });

      return { id: campaignRef.id, ...campaignData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RETENTION_KEYS.all });
    },
  });
}
