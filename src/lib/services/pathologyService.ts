import { supabase } from '@/integrations/supabase/client';
import type { Pathology, PathologyFormData } from '@/types/evolution';

export class PathologyService {
  static async getPathologiesByPatientId(patientId: string): Promise<Pathology[]> {
    const { data, error } = await supabase
      .from('patient_pathologies')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Pathology[];
  }

  static async getActivePathologies(patientId: string): Promise<Pathology[]> {
    const { data, error } = await supabase
      .from('patient_pathologies')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'em_tratamento')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Pathology[];
  }

  static async getResolvedPathologies(patientId: string): Promise<Pathology[]> {
    const { data, error } = await supabase
      .from('patient_pathologies')
      .select('*')
      .eq('patient_id', patientId)
      .in('status', ['tratada', 'cronica'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Pathology[];
  }

  static async addPathology(data: PathologyFormData): Promise<Pathology> {
    const { data: pathology, error } = await supabase
      .from('patient_pathologies')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return pathology as Pathology;
  }

  static async updatePathology(pathologyId: string, data: Partial<PathologyFormData>): Promise<Pathology> {
    const { data: pathology, error } = await supabase
      .from('patient_pathologies')
      .update(data)
      .eq('id', pathologyId)
      .select()
      .single();

    if (error) throw error;
    return pathology as Pathology;
  }

  static async markAsResolved(pathologyId: string): Promise<Pathology> {
    const { data, error } = await supabase
      .from('patient_pathologies')
      .update({ status: 'tratada' })
      .eq('id', pathologyId)
      .select()
      .single();

    if (error) throw error;
    return data as Pathology;
  }

  static async markAsActive(pathologyId: string): Promise<Pathology> {
    const { data, error } = await supabase
      .from('patient_pathologies')
      .update({ status: 'em_tratamento' })
      .eq('id', pathologyId)
      .select()
      .single();

    if (error) throw error;
    return data as Pathology;
  }

  static async deletePathology(pathologyId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_pathologies')
      .delete()
      .eq('id', pathologyId);

    if (error) throw error;
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'em_tratamento': return 'warning';
      case 'tratada': return 'success';
      case 'cronica': return 'secondary';
      default: return 'outline';
    }
  }

  static getStatusLabel(status: string): string {
    switch (status) {
      case 'em_tratamento': return 'Em Tratamento';
      case 'tratada': return 'Tratada';
      case 'cronica': return 'Crônica';
      default: return status;
    }
  }
}
