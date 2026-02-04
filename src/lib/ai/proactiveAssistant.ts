import { db, collection, getDocs, query as firestoreQuery, where, orderBy, limit, getDoc, doc } from '@/integrations/firebase/app';
import { differenceInDays, subDays, addDays, format, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ProactiveSuggestion {
  id: string;
  type: 'no-show-alert' | 'schedule-optimization' | 'inventory-alert' | 'retention-warning' | 'appointment-gap';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ScheduleSuggestion {
  date: Date;
  timeSlots: Array<{ start: string; end: string; availability: 'high' | 'medium' | 'low' }>;
  recommendedFor?: string[]; // patient IDs
  reason: string;
}

export interface InventoryAlert {
  itemName: string;
  currentStock: number;
  projectedStock: number;
  reorderThreshold: number;
  daysUntilStockout: number;
  suggestedOrderQuantity: number;
}

/**
 * Analyze practice data and generate proactive suggestions
 */
export async function generateProactiveSuggestions(
  organizationId: string,
  options?: {
    includeNoShows?: boolean;
    includeScheduleOptimization?: boolean;
    includeInventoryAlerts?: boolean;
    includeRetentionWarnings?: boolean;
    daysAhead?: number;
  }
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  const opts = {
    includeNoShows: true,
    includeScheduleOptimization: true,
    includeInventoryAlerts: true,
    includeRetentionWarnings: true,
    daysAhead: 14,
    ...options,
  };

  // 1. No-show alerts
  if (opts.includeNoShows) {
    const noShowSuggestions = await generateNoShowAlerts(organizationId);
    suggestions.push(...noShowSuggestions);
  }

  // 2. Schedule optimization
  if (opts.includeScheduleOptimization) {
    const scheduleSuggestions = await generateScheduleOptimization(organizationId, opts.daysAhead);
    suggestions.push(...scheduleSuggestions);
  }

  // 3. Retention warnings
  if (opts.includeRetentionWarnings) {
    const retentionSuggestions = await generateRetentionWarnings(organizationId);
    suggestions.push(...retentionSuggestions);
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions.slice(0, 10); // Limit to top 10 suggestions
}

/**
 * Generate alerts for patients at risk of no-show
 */
async function generateNoShowAlerts(organizationId: string): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  const tomorrow = addDays(new Date(), 1);
  const threeDaysLater = addDays(new Date(), 3);

  // Get appointments in the next 3 days
  const upcomingAppointmentsQuery = firestoreQuery(
    collection(db, 'appointments'),
    where('organization_id', '==', organizationId),
    where('appointment_date', '>=', tomorrow.toISOString()),
    where('appointment_date', '<=', threeDaysLater.toISOString()),
    where('status', '==', 'agendado')
  );

  const upcomingSnapshot = await getDocs(upcomingAppointmentsQuery);

  for (const appointmentDoc of upcomingSnapshot.docs) {
    const appointment = appointmentDoc.data();
    const patientId = appointment.patient_id;
    if (!patientId) continue;

    // Check patient's no-show history
    const patientHistoryQuery = firestoreQuery(
      collection(db, 'appointments'),
      where('patient_id', '==', patientId),
      where('status', '==', 'falta'),
      orderBy('appointment_date', 'desc'),
      // @ts-ignore
      limit(5)
    );

    const historySnapshot = await getDocs(patientHistoryQuery);
    const noShowCount = historySnapshot.size;

    // Check if patient has missed last appointment
    const lastApptQuery = firestoreQuery(
      collection(db, 'appointments'),
      where('patient_id', '==', patientId),
      orderBy('appointment_date', 'desc'),
      // @ts-ignore
      limit(1)
    );

    const lastApptSnapshot = await getDocs(lastApptQuery);
    let lastWasNoShow = false;
    if (!lastApptSnapshot.empty) {
      lastWasNoShow = lastApptSnapshot.docs[0].data().status === 'falta';
    }

    // High risk: missed last appointment OR 3+ no-shows
    if (lastWasNoShow || noShowCount >= 3) {
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      const patientName = patientDoc.exists()
        ? patientDoc.data()?.full_name || patientDoc.data()?.name
        : 'Paciente';

      suggestions.push({
        id: `noshow-${appointmentDoc.id}`,
        type: 'no-show-alert',
        priority: lastWasNoShow ? 'urgent' : 'high',
        title: 'Risco de não comparecimento',
        description: `${patientName} tem ${noShowCount} faltas${lastWasNoShow ? ' e faltou à última consulta' : ''}. Considere confirmar o agendamento de ${format(new Date(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}.`,
        actionLabel: 'Entrar em Contato',
        actionUrl: `/pacientes/${patientId}`,
        metadata: {
          patientId,
          appointmentId: appointmentDoc.id,
          appointmentDate: appointment.appointment_date,
          noShowCount,
          lastWasNoShow,
        },
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

/**
 * Generate schedule optimization suggestions
 */
async function generateScheduleOptimization(
  organizationId: string,
  daysAhead: number = 14
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  const startDate = new Date();
  const endDate = addDays(startDate, daysAhead);

  // Analyze each day in the range
  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    // Skip weekends
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // Get appointments for this day
    const dayAppointmentsQuery = firestoreQuery(
      collection(db, 'appointments'),
      where('organization_id', '==', organizationId),
      where('appointment_date', '>=', dayStart.toISOString()),
      where('appointment_date', '<=', dayEnd.toISOString())
    );

    const daySnapshot = await getDocs(dayAppointmentsQuery);
    const appointments = daySnapshot.docs.map((d) => d.data());

    // Analyze time slots
    const hourCounts = new Map<number, number>();
    appointments.forEach((apt: any) => {
      const hour = new Date(apt.appointment_date).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Find gaps and peaks
    const workingHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    let maxConcurrent = 0;
    let minConcurrent = Infinity;

    workingHours.forEach((hour) => {
      const count = hourCounts.get(hour) || 0;
      maxConcurrent = Math.max(maxConcurrent, count);
      minConcurrent = Math.min(minConcurrent, count);
    });

    // Suggest if there's a significant gap (more than 3x difference)
    if (maxConcurrent > 0 && minConcurrent < maxConcurrent / 3 && maxConcurrent >= 2) {
      // Find the quiet hours
      const quietHours = workingHours.filter((h) => (hourCounts.get(h) || 0) <= minConcurrent + 1);
      const quietRange = `${Math.min(...quietHours)}:00 - ${Math.max(...quietHours) + 1}:00`;

      suggestions.push({
        id: `schedule-gap-${format(day, 'yyyy-MM-dd')}`,
        type: 'schedule-optimization',
        priority: 'medium',
        title: 'Horário disponível detectedado',
        description: `O dia ${format(day, 'dd/MM MMM', { locale: ptBR })} tem horários livres das ${quietRange}. Considere agendar pacientes de retorno ou sessões de avaliação.`,
        actionLabel: 'Ver Agenda',
        actionUrl: '/agenda',
        metadata: {
          date: day.toISOString(),
          quietHours,
          appointmentCount: appointments.length,
        },
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

/**
 * Generate retention warnings for inactive patients
 */
async function generateRetentionWarnings(organizationId: string): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60);
  const ninetyDaysAgo = subDays(new Date(), 90);

  // Get patients who haven't returned in 30+ days
  const recentAppointmentsQuery = firestoreQuery(
    collection(db, 'appointments'),
    where('organization_id', '==', organizationId),
    where('appointment_date', '>=', ninetyDaysAgo.toISOString()),
    orderBy('appointment_date', 'desc')
  );

  const recentSnapshot = await getDocs(recentAppointmentsQuery);
  const recentPatientIds = new Set(
    recentSnapshot.docs.map((d) => d.data().patient_id).filter(Boolean)
  );

  // Get all patients
  const allPatientsSnapshot = await getDocs(
    firestoreQuery(
      collection(db, 'patients'),
      where('organization_id', '==', organizationId)
    )
  );

  for (const patientDoc of allPatientsSnapshot.docs) {
    const patientId = patientDoc.id;
    if (recentPatientIds.has(patientId)) continue;

    // This patient hasn't had any appointment in 90+ days
    const patientData = patientDoc.data();

    // Get last appointment ever
    const lastApptQuery = firestoreQuery(
      collection(db, 'appointments'),
      where('patient_id', '==', patientId),
      orderBy('appointment_date', 'desc'),
      // @ts-ignore
      limit(1)
    );

    const lastApptSnapshot = await getDocs(lastApptQuery);
    if (!lastApptSnapshot.empty) {
      const lastAppt = lastApptSnapshot.docs[0].data();
      const daysSinceLastAppt = differenceInDays(new Date(), new Date(lastAppt.appointment_date));

      let priority: ProactiveSuggestion['priority'] = 'low';
      let daysThreshold = 30;

      if (daysSinceLastAppt >= 90) {
        priority = 'high';
        daysThreshold = 90;
      } else if (daysSinceLastAppt >= 60) {
        priority = 'medium';
        daysThreshold = 60;
      } else if (daysSinceLastAppt >= 30) {
        priority = 'low';
        daysThreshold = 30;
      }

      suggestions.push({
        id: `retention-${patientId}`,
        type: 'retention-warning',
        priority,
        title: 'Paciente inativo detectado',
        description: `${patientData.full_name || patientData.name || 'Um paciente'} não comparece há ${daysSinceLastAppt} dias. Considere entrar em contato para reagendar.`,
        actionLabel: 'Ver Paciente',
        actionUrl: `/pacientes/${patientId}`,
        metadata: {
          patientId,
          daysInactive: daysSinceLastAppt,
          lastAppointment: lastAppt.appointment_date,
        },
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

/**
 * Analyze appointment patterns to detect scheduling gaps
 */
export async function detectAppointmentGaps(
  organizationId: string,
  lookbackDays: number = 30
): Promise<Array<{ day: Date; gapStart: string; gapEnd: string; gapMinutes: number }>> {
  const gaps: Array<{ day: Date; gapStart: string; gapEnd: string; gapMinutes: number }> = [];
  const startDate = subDays(new Date(), lookbackDays);

  const appointmentsQuery = firestoreQuery(
    collection(db, 'appointments'),
    where('organization_id', '==', organizationId),
    where('appointment_date', '>=', startDate.toISOString()),
    orderBy('appointment_date', 'asc')
  );

  const snapshot = await getDocs(appointmentsQuery);
  const appointments = snapshot.docs.map((d) => {
    const data = d.data();
    return { ...data, date: new Date(data.appointment_date) };
  });

  // Group by day
  const appointmentsByDay = new Map<string, typeof appointments>();
  appointments.forEach((apt) => {
    const dayKey = format(apt.date, 'yyyy-MM-dd');
    if (!appointmentsByDay.has(dayKey)) {
      appointmentsByDay.set(dayKey, []);
    }
    appointmentsByDay.get(dayKey)!.push(apt);
  });

  // Find gaps for each day
  appointmentsByDay.forEach((dayAppointments, dayKey) => {
    if (dayAppointments.length < 2) return;

    const sorted = dayAppointments.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gapMinutes = (next.date.getTime() - current.date.getTime()) / (1000 * 60);

      // Consider gaps of 60+ minutes (typical session duration)
      if (gapMinutes >= 60) {
        gaps.push({
          day: new Date(dayKey),
          gapStart: format(current.date, 'HH:mm'),
          gapEnd: format(next.date, 'HH:mm'),
          gapMinutes: Math.round(gapMinutes),
        });
      }
    }
  });

  return gaps.sort((a, b) => b.gapMinutes - a.gapMinutes);
}

/**
 * Generate proactive insights for dashboard
 */
export async function generateDashboardInsights(
  organizationId: string
): Promise<{
  suggestions: ProactiveSuggestion[];
  stats: {
    upcomingAppointments: number;
    atRiskPatients: number;
    scheduleGaps: number;
    retentionRate: number;
  };
}> {
  // Get suggestions
  const suggestions = await generateProactiveSuggestions(organizationId, {
    daysAhead: 7,
  });

  // Get quick stats
  const tomorrow = addDays(new Date(), 1);
  const weekFromNow = addDays(new Date(), 7);

  const upcomingQuery = firestoreQuery(
    collection(db, 'appointments'),
    where('organization_id', '==', organizationId),
    where('appointment_date', '>=', tomorrow.toISOString()),
    where('appointment_date', '<=', weekFromNow.toISOString()),
    where('status', '==', 'agendado')
  );

  const upcomingSnapshot = await getDocs(upcomingQuery);
  const upcomingAppointments = upcomingSnapshot.size;

  // Count at-risk patients (30+ days inactive)
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentQuery = firestoreQuery(
    collection(db, 'appointments'),
    where('organization_id', '==', organizationId),
    where('appointment_date', '>=', thirtyDaysAgo.toISOString())
  );

  const recentSnapshot = await getDocs(recentQuery);
  const activePatientIds = new Set(
    recentSnapshot.docs.map((d) => d.data().patient_id).filter(Boolean)
  );

  const allPatientsSnapshot = await getDocs(
    firestoreQuery(
      collection(db, 'patients'),
      where('organization_id', '==', organizationId)
    )
  );
  const atRiskPatients = allPatientsSnapshot.size - activePatientIds.size;

  // Get schedule gaps
  const gaps = await detectAppointmentGaps(organizationId, 7);

  // Calculate retention rate (active / total)
  const retentionRate =
    allPatientsSnapshot.size > 0
      ? Math.round((activePatientIds.size / allPatientsSnapshot.size) * 100)
      : 0;

  return {
    suggestions: suggestions.slice(0, 5), // Top 5 for dashboard
    stats: {
      upcomingAppointments,
      atRiskPatients,
      scheduleGaps: gaps.length,
      retentionRate,
    },
  };
}
