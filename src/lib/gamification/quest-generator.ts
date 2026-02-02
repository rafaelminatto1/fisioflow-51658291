/**
 * Quest Generator for Gamification
 *
 * Generates personalized quests based on patient state
 * Migrated from Supabase to Firebase Functions
 */

import { differenceInDays } from 'date-fns';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/functions';

export type GeneratedQuest = {
  id: string; // unique code like 'pain_map_update'
  title: string;
  description: string;
  xp: number;
  icon: string;
  completed: boolean;
};

/**
 * Gera missões personalizadas baseadas no estado atual do paciente.
 * Esta função deve ser chamada quando o usuário não tiver missões para o dia atual.
 *
 * @param patientId - Patient ID in Firestore
 * @returns Array of generated quests
 */
export async function generateSmartQuests(
  patientId: string
): Promise<GeneratedQuest[]> {
  const quests: GeneratedQuest[] = [];

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Core Quest: Always present (Session or Exercise)
    // Check if there is an appointment today using Firebase Functions
    const hasAppointmentToday = await checkTodayAppointment(patientId, today);

    if (hasAppointmentToday) {
      quests.push({
        id: 'attend_session',
        title: 'Comparecer à Sessão',
        description: 'Realize seu check-in na clínica hoje.',
        xp: 100,
        icon: 'MapPin',
        completed: false
      });
    } else {
      quests.push({
        id: 'home_exercise',
        title: 'Exercícios em Casa',
        description: 'Complete sua rotina de exercícios prescrita.',
        xp: 50,
        icon: 'Dumbbell',
        completed: false
      });
    }

    // 2. Pain Map Check
    // Check last pain map update
    const daysSincePainUpdate = await getDaysSinceLastPainMap(patientId);

    if (daysSincePainUpdate >= 2) {
      quests.push({
        id: 'update_pain_map',
        title: 'Atualizar Mapa de Dor',
        description: 'Como você está se sentindo hoje? Atualize seu registro.',
        xp: 30,
        icon: 'Activity',
        completed: false
      });
    } else {
      // Fallback hydration quest
      quests.push({
        id: 'hydration_log',
        title: 'Hidratação',
        description: 'Beba 2L de água para ajudar na recuperação muscular.',
        xp: 15,
        icon: 'Droplets',
        completed: false
      });
    }

    // 3. Educational / Engagement (Rotation)
    // Simple logic to rotate miscellaneous quests
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1 || dayOfWeek === 4) { // Mon/Thu
      quests.push({
        id: 'read_tip',
        title: 'Ler Dica de Saúde',
        description: 'Acesse a área de educação e leia uma dica.',
        xp: 10,
        icon: 'BookOpen',
        completed: false
      });
    } else {
      quests.push({
        id: 'stretch_break',
        title: 'Pausa para Alongamento',
        description: 'Faça um alongamento rápido de 5 minutos.',
        xp: 20,
        icon: 'User',
        completed: false
      });
    }

    return quests;
  } catch (error) {
    console.error('Error generating smart quests:', error);
    // Return default quests if there's an error
    return [
      {
        id: 'home_exercise',
        title: 'Exercícios em Casa',
        description: 'Complete sua rotina de exercícios prescrita.',
        xp: 50,
        icon: 'Dumbbell',
        completed: false
      },
      {
        id: 'hydration_log',
        title: 'Hidratação',
        description: 'Beba 2L de água para ajudar na recuperação muscular.',
        xp: 15,
        icon: 'Droplets',
        completed: false
      },
    ];
  }
}

/**
 * Check if patient has an appointment today
 */
async function checkTodayAppointment(patientId: string, today: string): Promise<boolean> {
  try {
    const checkAppointmentsFn = httpsCallable(getFirebaseFunctions(), 'checkPatientAppointments');
    const result = await checkAppointmentsFn({
      patientId,
      startDate: today,
      endDate: today,
    });

    return !!result.data?.hasAppointments;
  } catch (error) {
    console.error('Error checking appointments:', error);
    return false;
  }
}

/**
 * Get days since last pain map update
 */
async function getDaysSinceLastPainMap(patientId: string): Promise<number> {
  try {
    const checkPainMapFn = httpsCallable(getFirebaseFunctions(), 'getLastPainMapDate');
    const result = await checkPainMapFn({ patientId });

    if (result.data?.lastDate) {
      return differenceInDays(new Date(), new Date(result.data.lastDate));
    }
    return 999; // Large number if no pain map found
  } catch (error) {
    console.error('Error checking pain map:', error);
    return 999;
  }
}
