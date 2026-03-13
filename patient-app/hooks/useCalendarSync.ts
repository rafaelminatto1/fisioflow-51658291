import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { patientApi } from '@/lib/api';
import { log } from '@/lib/logger';
import { useLocalStorage } from './useLocalStorage';

const CALENDAR_NAME = 'FisioFlow Appointments';
const SYNC_STORAGE_KEY = 'fisioflow_calendar_sync_enabled';

/**
 * Hook para sincronização automática de agendamentos com a agenda nativa do celular.
 * Funciona apenas em ambiente nativo (iOS/Android).
 */
export function useCalendarSync(patientId: string | undefined) {
  const [isSyncEnabled, setSyncEnabled] = useLocalStorage<boolean>(SYNC_STORAGE_KEY, false);

  useEffect(() => {
    if (!patientId || Platform.OS === 'web') return;

    const sync = async () => {
      try {
        // 1. Pedir permissão se ainda não tivermos
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
          log.warn('CALENDAR_SYNC', 'Permissão de calendário negada pelo usuário.');
          return;
        }

        setSyncEnabled(true);

        // 2. Buscar agendamentos futuros do paciente
        const appointments = await patientApi.getAppointments(true);
        if (!appointments || appointments.length === 0) return;

        // 3. Encontrar ou criar o calendário do FisioFlow
        const calendarId = await getOrCreateCalendarId();
        if (!calendarId) return;

        // 4. Sincronizar cada agendamento
        for (const app of appointments) {
          await syncAppointmentToCalendar(calendarId, app);
        }

        log.info('CALENDAR_SYNC', `${appointments.length} agendamentos sincronizados.`);
      } catch (error) {
        log.error('CALENDAR_SYNC', 'Erro ao sincronizar calendário:', error);
      }
    };

    // Sincroniza ao montar o hook se estiver logado
    sync();
  }, [patientId]);

  return { isSyncEnabled };
}

/**
 * Busca o ID do calendário do FisioFlow ou cria um novo se não existir.
 */
async function getOrCreateCalendarId() {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existingCalendar = calendars.find((c) => c.title === CALENDAR_NAME);

  if (existingCalendar) {
    return existingCalendar.id;
  }

  // Cria um novo calendário se não existir
  const defaultCalendarSource =
    Platform.OS === 'ios'
      ? await getDefaultSource()
      : { isLocalAccount: true, name: CALENDAR_NAME, type: 'LOCAL' };

  if (!defaultCalendarSource) return null;

  return await Calendar.createCalendarAsync({
    title: CALENDAR_NAME,
    color: '#0ea5e9',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: (defaultCalendarSource as any).id,
    source: defaultCalendarSource as any,
    name: 'fisioflow_internal',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Helper para pegar o source padrão no iOS
 */
async function getDefaultSource() {
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  return defaultCalendar.source;
}

/**
 * Sincroniza um agendamento específico, evitando duplicatas.
 */
async function syncAppointmentToCalendar(calendarId: string, app: any) {
  const startDate = new Date(app.date + 'T' + app.start_time);
  const endDate = new Date(app.date + 'T' + app.end_time);

  // Verifica se o evento já existe na agenda (busca por título e data)
  const existingEvents = await Calendar.getEventsAsync(
    [calendarId],
    new Date(startDate.getTime() - 1000),
    new Date(startDate.getTime() + 1000)
  );

  const isDuplicate = existingEvents.some(
    (e) => e.title === 'Fisioterapia: FisioFlow' || e.title.includes('FisioFlow')
  );

  if (isDuplicate) return;

  // Insere o novo evento
  await Calendar.createEventAsync(calendarId, {
    title: `Fisioterapia: FisioFlow`,
    startDate,
    endDate,
    location: app.clinic_name || 'Clínica de Fisioterapia',
    notes: `Consulta agendada via FisioFlow. Status: ${app.status}`,
    alarms: [{ relativeOffset: -120 }], // Alerta 2 horas antes
  });
}
