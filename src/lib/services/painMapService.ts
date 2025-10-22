import { supabase } from '@/integrations/supabase/client';
import type { 
  PainMapRecord, 
  PainMapFormData, 
  PainEvolutionData,
  PainStatistics,
  BodyRegion 
} from '@/types/painMap';

export class PainMapService {
  static async getPainMapsByPatientId(patientId: string): Promise<PainMapRecord[]> {
    const { data, error } = await supabase
      .from('pain_maps')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getPainMapById(id: string): Promise<PainMapRecord> {
    const { data, error } = await supabase
      .from('pain_maps')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async createPainMap(painMap: PainMapFormData): Promise<PainMapRecord> {
    const { data, error } = await supabase
      .from('pain_maps')
      .insert(painMap)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePainMap(id: string, painMap: Partial<PainMapFormData>): Promise<PainMapRecord> {
    const { data, error } = await supabase
      .from('pain_maps')
      .update(painMap)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deletePainMap(id: string): Promise<void> {
    const { error } = await supabase
      .from('pain_maps')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getPainEvolution(patientId: string, startDate?: string, endDate?: string): Promise<PainEvolutionData[]> {
    let query = supabase
      .from('pain_maps')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: true });

    if (startDate) query = query.gte('recorded_at', startDate);
    if (endDate) query = query.lte('recorded_at', endDate);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(record => ({
      date: record.recorded_at,
      globalPainLevel: record.global_pain_level,
      regionCount: record.pain_points.length,
      mostAffectedRegion: this.getMostAffectedRegion(record.pain_points),
      painPoints: record.pain_points
    }));
  }

  static async getPainStatistics(patientId: string): Promise<PainStatistics> {
    const records = await this.getPainMapsByPatientId(patientId);
    
    if (records.length === 0) {
      return {
        averagePainLevel: 0,
        painReduction: 0,
        mostFrequentRegion: 'lombar',
        painFreeRegionsCount: 0,
        improvementTrend: 'stable'
      };
    }

    const painLevels = records.map(r => r.global_pain_level);
    const averagePainLevel = painLevels.reduce((a, b) => a + b, 0) / painLevels.length;

    const firstPain = records[records.length - 1].global_pain_level;
    const lastPain = records[0].global_pain_level;
    const painReduction = firstPain > 0 ? ((firstPain - lastPain) / firstPain) * 100 : 0;

    const regionFrequency = new Map<BodyRegion, number>();
    records.forEach(record => {
      record.pain_points.forEach(point => {
        regionFrequency.set(point.region, (regionFrequency.get(point.region) || 0) + 1);
      });
    });

    const mostFrequentRegion = Array.from(regionFrequency.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'lombar';

    const allRegions = new Set<BodyRegion>();
    records[0]?.pain_points.forEach(p => allRegions.add(p.region));
    const painFreeRegionsCount = 25 - allRegions.size; // 25 regiões totais

    let improvementTrend: PainStatistics['improvementTrend'] = 'stable';
    if (records.length >= 3) {
      const recent = records.slice(0, 3).map(r => r.global_pain_level);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (recent[0] < avg - 1) improvementTrend = 'improving';
      else if (recent[0] > avg + 1) improvementTrend = 'worsening';
    }

    return {
      averagePainLevel,
      painReduction,
      mostFrequentRegion,
      painFreeRegionsCount,
      improvementTrend
    };
  }

  private static getMostAffectedRegion(painPoints: any[]): BodyRegion | undefined {
    if (painPoints.length === 0) return undefined;
    
    const sorted = [...painPoints].sort((a, b) => b.intensity - a.intensity);
    return sorted[0].region;
  }

  static getRegionLabel(region: BodyRegion): string {
    const labels: Record<BodyRegion, string> = {
      cabeca: 'Cabeça',
      pescoco: 'Pescoço',
      ombro_direito: 'Ombro Direito',
      ombro_esquerdo: 'Ombro Esquerdo',
      braco_direito: 'Braço Direito',
      braco_esquerdo: 'Braço Esquerdo',
      antebraco_direito: 'Antebraço Direito',
      antebraco_esquerdo: 'Antebraço Esquerdo',
      mao_direita: 'Mão Direita',
      mao_esquerda: 'Mão Esquerda',
      torax: 'Tórax',
      abdomen: 'Abdômen',
      lombar: 'Lombar',
      quadril_direito: 'Quadril Direito',
      quadril_esquerdo: 'Quadril Esquerdo',
      coxa_direita: 'Coxa Direita',
      coxa_esquerda: 'Coxa Esquerda',
      joelho_direito: 'Joelho Direito',
      joelho_esquerdo: 'Joelho Esquerdo',
      perna_direita: 'Perna Direita',
      perna_esquerda: 'Perna Esquerda',
      tornozelo_direito: 'Tornozelo Direito',
      tornozelo_esquerdo: 'Tornozelo Esquerdo',
      pe_direito: 'Pé Direito',
      pe_esquerdo: 'Pé Esquerdo'
    };
    return labels[region];
  }

  static getPainIntensityColor(intensity: number): string {
    if (intensity === 0) return 'hsl(var(--muted))';
    if (intensity <= 3) return 'hsl(47, 100%, 60%)'; // Amarelo
    if (intensity <= 6) return 'hsl(30, 100%, 50%)'; // Laranja
    return 'hsl(0, 80%, 50%)'; // Vermelho
  }
}
