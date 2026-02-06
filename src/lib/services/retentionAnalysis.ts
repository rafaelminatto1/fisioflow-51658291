import { db, collection, getDocs, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { differenceInDays, subDays, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export interface RetentionMetrics {
  totalPatients: number;
  activePatients: number;
  atRiskPatients: number;
  churnedPatients: number;
  retentionRate: number;
  avgDaysBetweenSessions: number;
  newPatientsThisMonth: number;
  returningPatientsThisMonth: number;
}

export interface PatientRetentionData {
  patientId: string;
  patientName: string;
  lastAppointmentDate: Date;
  daysInactive: number;
  totalSessions: number;
  avgDaysBetweenSessions: number;
  riskLevel: 'active' | 'at-risk' | 'churned';
}

export interface MonthlyRetentionData {
  month: string;
  newPatients: number;
  returningPatients: number;
  totalPatients: number;
  retentionRate: number;
}

/**
 * Calculate retention metrics for the practice
 */
export async function calculateRetentionMetrics(
  organizationId?: string
): Promise<RetentionMetrics> {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);
  const ninetyDaysAgo = subDays(now, 90);
  const monthStart = startOfMonth(now);

  // Get all appointments in the last 90 days
  const appointmentsQuery = firestoreQuery(
    collection(db, 'appointments'),
    where('appointment_date', '>=', ninetyDaysAgo.toISOString()),
    orderBy('appointment_date', 'desc')
  );

  const appointmentsSnapshot = await getDocs(appointmentsQuery);
  const appointments = appointmentsSnapshot.docs.map((doc) => ({
    ...normalizeFirestoreData(doc.data()),
    id: doc.id,
  }));

  // Group by patient
  const patientData = new Map<
    string,
    {
      lastAppointment: Date;
      totalSessions: number;
      appointments: Array<{ date: Date }>;
    }
  >();

  appointments.forEach((apt: any) => {
    const patientId = apt.patient_id;
    if (!patientId) return;

    const aptDate = new Date(apt.appointment_date);

    if (!patientData.has(patientId)) {
      patientData.set(patientId, {
        lastAppointment: aptDate,
        totalSessions: 1,
        appointments: [{ date: aptDate }],
      });
    } else {
      const data = patientData.get(patientId)!;
      data.totalSessions++;
      data.appointments.push({ date: aptDate });
      if (aptDate > data.lastAppointment) {
        data.lastAppointment = aptDate;
      }
    }
  });

  // Calculate metrics
  const totalPatients = patientData.size;

  const activePatients = Array.from(patientData.values()).filter(
    (p) => differenceInDays(now, p.lastAppointment) <= 30
  ).length;

  const atRiskPatients = Array.from(patientData.values()).filter(
    (p) => differenceInDays(now, p.lastAppointment) > 30 && differenceInDays(now, p.lastAppointment) <= 90
  ).length;

  const churnedPatients = Array.from(patientData.values()).filter(
    (p) => differenceInDays(now, p.lastAppointment) > 90
  ).length;

  const retentionRate = totalPatients > 0 ? (activePatients / totalPatients) * 100 : 0;

  // Calculate average days between sessions
  let totalDaysBetweenSessions = 0;
  let totalPatientGaps = 0;

  patientData.forEach((data) => {
    if (data.appointments.length > 1) {
      const sortedDates = data.appointments.map((a) => a.date).sort((a, b) => b.getTime() - a.getTime());
      for (let i = 0; i < sortedDates.length - 1; i++) {
        totalDaysBetweenSessions += differenceInDays(sortedDates[i], sortedDates[i + 1]);
        totalPatientGaps++;
      }
    }
  });

  const avgDaysBetweenSessions = totalPatientGaps > 0 ? totalDaysBetweenSessions / totalPatientGaps : 0;

  // Get new vs returning patients this month
  const currentMonthAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.appointment_date);
    return aptDate >= monthStart && aptDate <= now;
  });

  const newPatientIds = new Set<string>();
  const returningPatientIds = new Set<string>();

  currentMonthAppointments.forEach((apt: any) => {
    const patientId = apt.patient_id;
    if (!patientId) return;

    // Check if this patient had appointments before this month
    const patientHistory = patientData.get(patientId);
    if (patientHistory && patientHistory.totalSessions > 1) {
      const hasAppointmentBeforeMonth = patientHistory.appointments.some(
        (a) => a.date < monthStart
      );
      if (hasAppointmentBeforeMonth) {
        returningPatientIds.add(patientId);
      } else {
        newPatientIds.add(patientId);
      }
    }
  });

  return {
    totalPatients,
    activePatients,
    atRiskPatients,
    churnedPatients,
    retentionRate: Math.round(retentionRate * 10) / 10,
    avgDaysBetweenSessions: Math.round(avgDaysBetweenSessions),
    newPatientsThisMonth: newPatientIds.size,
    returningPatientsThisMonth: returningPatientIds.size,
  };
}

/**
 * Get detailed retention data for each patient
 */
export async function getPatientRetentionData(
  organizationId?: string
): Promise<PatientRetentionData[]> {
  const now = new Date();
  const ninetyDaysAgo = subDays(now, 90);

  const appointmentsQuery = firestoreQuery(
    collection(db, 'appointments'),
    where('appointment_date', '>=', ninetyDaysAgo.toISOString()),
    orderBy('appointment_date', 'desc')
  );

  const appointmentsSnapshot = await getDocs(appointmentsQuery);

  // Get patient names
  const patientIds = new Set(
    appointmentsSnapshot.docs
      .map((d) => d.data().patient_id)
      .filter(Boolean)
  );

  const patientNames = new Map<string, string>();
  await Promise.all(
    Array.from(patientIds).map(async (pid) => {
      try {
        const patientDoc = await getDoc(doc(db, 'patients', pid));
        if (patientDoc.exists()) {
          patientNames.set(pid, patientDoc.data()?.full_name || patientDoc.data()?.name || 'Paciente');
        }
      } catch {
        // Ignore errors
      }
    })
  );

  // Process patient data
  const patientMap = new Map<
    string,
    {
      lastAppointment: Date;
      totalSessions: number;
      appointments: Date[];
    }
  >();

  appointmentsSnapshot.docs.forEach((doc) => {
    const apt = normalizeFirestoreData(doc.data());
    const patientId = apt.patient_id;
    if (!patientId) return;

    const aptDate = new Date(apt.appointment_date);

    if (!patientMap.has(patientId)) {
      patientMap.set(patientId, {
        lastAppointment: aptDate,
        totalSessions: 1,
        appointments: [aptDate],
      });
    } else {
      const data = patientMap.get(patientId)!;
      data.totalSessions++;
      data.appointments.push(aptDate);
      if (aptDate > data.lastAppointment) {
        data.lastAppointment = aptDate;
      }
    }
  });

  const result: PatientRetentionData[] = [];

  patientMap.forEach((data, patientId) => {
    const daysInactive = differenceInDays(now, data.lastAppointment);
    const appointments = data.appointments.sort((a, b) => b.getTime() - a.getTime());

    // Calculate average days between sessions
    let totalGap = 0;
    for (let i = 0; i < appointments.length - 1; i++) {
      totalGap += differenceInDays(appointments[i], appointments[i + 1]);
    }
    const avgGap = appointments.length > 1 ? totalGap / (appointments.length - 1) : 0;

    let riskLevel: PatientRetentionData['riskLevel'];
    if (daysInactive <= 30) {
      riskLevel = 'active';
    } else if (daysInactive <= 90) {
      riskLevel = 'at-risk';
    } else {
      riskLevel = 'churned';
    }

    result.push({
      patientId,
      patientName: patientNames.get(patientId) || 'Paciente',
      lastAppointmentDate: data.lastAppointment,
      daysInactive,
      totalSessions: data.totalSessions,
      avgDaysBetweenSessions: Math.round(avgGap),
      riskLevel,
    });
  });

  // Sort by days inactive (most at risk first)
  return result.sort((a, b) => b.daysInactive - a.daysInactive);
}

/**
 * Get monthly retention data for charts
 */
export async function getMonthlyRetentionData(
  months: number = 12
): Promise<MonthlyRetentionData[]> {
  const now = new Date();
  const result: MonthlyRetentionData[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const monthStartStr = monthDate.toISOString();
    const monthEndStr = monthEnd.toISOString();

    // Get appointments for this month
    const appointmentsQuery = firestoreQuery(
      collection(db, 'appointments'),
      where('appointment_date', '>=', monthStartStr),
      where('appointment_date', '<=', monthEndStr)
    );

    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    const appointments = appointmentsSnapshot.docs.map((d) => d.data());

    const patientIds = new Set(appointments.map((a: any) => a.patient_id).filter(Boolean));
    const totalPatients = patientIds.size;

    // Get new vs returning patients
    const newPatients = new Set<string>();
    const returningPatients = new Set<string>();

    // Check each patient if they had appointments before this month
    await Promise.all(
      Array.from(patientIds).map(async (pid) => {
        try {
          const beforeMonthQuery = firestoreQuery(
            collection(db, 'appointments'),
            where('patient_id', '==', pid),
            where('appointment_date', '<', monthStartStr),
            // @ts-expect-error - limit workaround for firestore query typing
            where('limit', '==', 1)
          );

          const beforeSnapshot = await getDocs(beforeMonthQuery);
          if (beforeSnapshot.empty) {
            newPatients.add(pid);
          } else {
            returningPatients.add(pid);
          }
        } catch {
          // Ignore errors
        }
      })
    );

    result.push({
      month: format(monthDate, 'MMM/yyyy', { locale: ptBR }),
      newPatients: newPatients.size,
      returningPatients: returningPatients.size,
      totalPatients,
      retentionRate: totalPatients > 0 ? (returningPatients.size / totalPatients) * 100 : 0,
    });
  }

  return result;
}