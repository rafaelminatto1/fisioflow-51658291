import { supabase } from '@/integrations/supabase/client';
import type { Surgery, SurgeryFormData } from '@/types/evolution';
import { differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';

export class SurgeryService {
  static async getSurgeriesByPatientId(patientId: string): Promise<Surgery[]> {
    const { data, error } = await supabase
      .from('patient_surgeries')
      .select('*')
      .eq('patient_id', patientId)
      .order('surgery_date', { ascending: false });

    if (error) throw error;
    return (data || []) as Surgery[];
  }

  static async addSurgery(data: SurgeryFormData): Promise<Surgery> {
    const { data: surgery, error } = await supabase
      .from('patient_surgeries')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return surgery as Surgery;
  }

  static async updateSurgery(surgeryId: string, data: Partial<SurgeryFormData>): Promise<Surgery> {
    const { data: surgery, error } = await supabase
      .from('patient_surgeries')
      .update(data)
      .eq('id', surgeryId)
      .select()
      .single();

    if (error) throw error;
    return surgery as Surgery;
  }

  static async deleteSurgery(surgeryId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_surgeries')
      .delete()
      .eq('id', surgeryId);

    if (error) throw error;
  }

  static calculateTimeSinceSurgery(surgeryDate: string): string {
    const now = new Date();
    const surgery = new Date(surgeryDate);
    
    const days = differenceInDays(now, surgery);
    const months = differenceInMonths(now, surgery);
    const years = differenceInYears(now, surgery);

    if (years > 0) {
      return years === 1 ? 'há 1 ano' : `há ${years} anos`;
    } else if (months > 0) {
      return months === 1 ? 'há 1 mês' : `há ${months} meses`;
    } else if (days > 0) {
      return days === 1 ? 'há 1 dia' : `há ${days} dias`;
    } else {
      return 'hoje';
    }
  }

  static getRecoveryPhase(surgeryDate: string): { phase: string; color: string } {
    const days = differenceInDays(new Date(), new Date(surgeryDate));

    if (days <= 30) {
      return { phase: 'Fase Aguda', color: 'destructive' };
    } else if (days <= 90) {
      return { phase: 'Fase Subaguda', color: 'warning' };
    } else if (days <= 180) {
      return { phase: 'Recuperação', color: 'default' };
    } else {
      return { phase: 'Consolidada', color: 'success' };
    }
  }
}
