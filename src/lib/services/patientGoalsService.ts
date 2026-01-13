import { supabase } from '@/integrations/supabase/client';
import type { PatientGoal, PatientGoalFormData } from '@/types/evolution';
import { differenceInDays } from 'date-fns';

export class PatientGoalsService {
  static async getGoalsByPatientId(patientId: string): Promise<PatientGoal[]> {
    const { data, error } = await supabase
      .from('patient_goals')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(g => ({
      ...g,
      current_progress: 0,
      priority: 'media' as const
    })) as PatientGoal[];
  }

  static async addGoal(data: PatientGoalFormData): Promise<PatientGoal> {
    const { data: goal, error } = await supabase
      .from('patient_goals')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return {
      ...goal,
      current_progress: 0,
      priority: 'media' as const
    } as PatientGoal;
  }

  static async updateGoalProgress(
    goalId: string,
    progress: number,
    currentValue?: string
  ): Promise<PatientGoal> {
    const updates: { current_progress: number; current_value?: string } = { current_progress: progress };
    if (currentValue !== undefined) {
      updates.current_value = currentValue;
    }

    const { data, error } = await supabase
      .from('patient_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      current_progress: progress,
      priority: 'media' as const
    } as PatientGoal;
  }

  static async updateGoal(goalId: string, data: Partial<PatientGoalFormData>): Promise<PatientGoal> {
    const { data: goal, error } = await supabase
      .from('patient_goals')
      .update(data)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return {
      ...goal,
      current_progress: 0,
      priority: 'media' as const
    } as PatientGoal;
  }

  static async deleteGoal(goalId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  }

  static calculateCountdown(targetDate: string): { days: number; formatted: string } {
    const now = new Date();
    const target = new Date(targetDate);
    const days = differenceInDays(target, now);

    if (days < 0) {
      return { days: 0, formatted: 'Vencido' };
    } else if (days === 0) {
      return { days: 0, formatted: 'Hoje' };
    } else if (days === 1) {
      return { days: 1, formatted: 'Amanhã' };
    } else if (days <= 7) {
      return { days, formatted: `${days} dias` };
    } else if (days <= 30) {
      const weeks = Math.floor(days / 7);
      return { days, formatted: `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}` };
    } else {
      const months = Math.floor(days / 30);
      return { days, formatted: `${months} ${months === 1 ? 'mês' : 'meses'}` };
    }
  }

  static async markGoalCompleted(goalId: string): Promise<PatientGoal> {
    const { data, error } = await supabase
      .from('patient_goals')
      .update({
        status: 'concluido',
        completed_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      current_progress: 100,
      priority: 'media' as const
    } as PatientGoal;
  }

  static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critica': return 'destructive';
      case 'alta': return 'warning';
      case 'media': return 'default';
      case 'baixa': return 'secondary';
      default: return 'outline';
    }
  }
}
