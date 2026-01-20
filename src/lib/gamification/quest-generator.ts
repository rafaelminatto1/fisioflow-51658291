import { SupabaseClient } from '@supabase/supabase-js';
import { differenceInDays } from 'date-fns';

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
 */
export async function generateSmartQuests(
  supabase: SupabaseClient,
  patientId: string
): Promise<GeneratedQuest[]> {
  const quests: GeneratedQuest[] = [];

  // 1. Core Quest: Always present (Session or Exercise)
  // Check if there is an appointment today
  const today = new Date().toISOString().split('T')[0];
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', patientId)
    .eq('date', today)
    .maybeSingle();

  if (appointments) {
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
  const { data: lastPainMap } = await supabase
    .from('pain_maps')
    .select('created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const daysSincePainUpdate = lastPainMap 
    ? differenceInDays(new Date(), new Date(lastPainMap.created_at)) 
    : 999;

  if (daysSincePainUpdate >= 2) {
    quests.push({
      id: 'update_pain_map',
      title: 'Atualizar Mapa de Dor',
      description: 'Como você está se sentindo hoje? Atualize seu registro.',
      xp: 30,
      icon: 'Activity', // Changed from Thermometer to Activity for reliability
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
      icon: 'User', // Generic user/stretch icon
      completed: false
    });
  }

  return quests;
}
