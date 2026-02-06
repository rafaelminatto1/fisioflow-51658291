import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from '@/integrations/firebase/app';
import {

  PainMapRecord,
  PainEvolutionData,
  PainStatistics,
  BodyRegion
} from '@/types/painMap';

export class PainMapService {
  // Optimized: Select only required columns instead of *
  static async getPainMapsByPatientId(patientId: string): Promise<PainMapRecord[]> {
    const q = query(
      collection(db, 'pain_maps'),
      where('patient_id', '==', patientId),
      orderBy('recorded_at', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        patient_id: data.patient_id,
        global_pain_level: data.global_pain_level,
        pain_points: data.pain_points || [],
        recorded_at: data.recorded_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as PainMapRecord;
    });
  }

  // Optimized: Select only required columns instead of *
  static async getPainMapById(id: string): Promise<PainMapRecord> {
    const docRef = doc(db, 'pain_maps', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Pain map not found');
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      patient_id: data.patient_id,
      global_pain_level: data.global_pain_level,
      pain_points: data.pain_points || [],
      recorded_at: data.recorded_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as PainMapRecord;
  }

  static async createPainMap(painMap: PainMapFormData): Promise<PainMapRecord> {
    const now = new Date().toISOString();
    const dataToSave = {
      ...painMap,
      recorded_at: painMap.recorded_at || now,
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, 'pain_maps'), dataToSave);
    const docSnap = await getDoc(docRef);

    const data = docSnap.data();
    return {
      id: docSnap.id,
      patient_id: data.patient_id,
      global_pain_level: data.global_pain_level,
      pain_points: data.pain_points || [],
      recorded_at: data.recorded_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as PainMapRecord;
  }

  static async updatePainMap(id: string, painMap: Partial<PainMapFormData>): Promise<PainMapRecord> {
    const docRef = doc(db, 'pain_maps', id);

    await updateDoc(docRef, {
      ...painMap,
      updated_at: new Date().toISOString(),
    });

    return this.getPainMapById(id);
  }

  static async deletePainMap(id: string): Promise<void> {
    const docRef = doc(db, 'pain_maps', id);
    await deleteDoc(docRef);
  }

  // Optimized: Select only required columns instead of *
  static async getPainEvolution(patientId: string, startDate?: string, endDate?: string): Promise<PainEvolutionData[]> {
    const q = query(
      collection(db, 'pain_maps'),
      where('patient_id', '==', patientId),
      orderBy('recorded_at', 'asc')
    );

    // Note: Firestore doesn't support multiple range queries in a single query
    // Additional filtering would need to be done client-side or via composite indexes
    // For now, we'll apply date filters in client-side processing if needed

    const snapshot = await getDocs(q);

    const allRecords = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        patient_id: data.patient_id,
        global_pain_level: data.global_pain_level,
        pain_points: data.pain_points || [],
        recorded_at: data.recorded_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as PainMapRecord;
    });

    // Client-side date filtering
    let filteredRecords = allRecords;
    if (startDate) {
      filteredRecords = filteredRecords.filter(r => r.recorded_at >= startDate);
    }
    if (endDate) {
      filteredRecords = filteredRecords.filter(r => r.recorded_at <= endDate);
    }

    return filteredRecords.map(record => ({
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

  private static getMostAffectedRegion(painPoints: { region: BodyRegion; intensity: number }[]): BodyRegion | undefined {
    if (painPoints.length === 0) return undefined;

    const sorted = [...painPoints].sort((a, b) => b.intensity - a.intensity);
    return sorted[0].region;
  }

  static getRegionLabel(region: BodyRegion): string {
    const labels: Record<BodyRegion, string> = {
      cabeca: 'Cabeça',
      cabeca_frente: 'Cabeça (Frente)',
      cabeca_frente_esquerda: 'Cabeça (Frente Esq.)',
      cabeca_frente_direita: 'Cabeça (Frente Dir.)',
      cabeca_nuca_esquerda: 'Nuca (Esq.)',
      cabeca_nuca_direita: 'Nuca (Dir.)',
      pescoco: 'Pescoço',
      pescoco_frontal_esquerdo: 'Pescoço (Frente Esq.)',
      pescoco_frontal_direito: 'Pescoço (Frente Dir.)',
      pescoco_nuca_esquerdo: 'Cervical (Esq.)', // Neck back usually referred to as Cervical in contexts
      pescoco_nuca_direito: 'Cervical (Dir.)',
      ombro_direito: 'Ombro Direito',
      ombro_esquerdo: 'Ombro Esquerdo',
      braco_direito: 'Braço Direito',
      braco_esquerdo: 'Braço Esquerdo',
      antebraco_direito: 'Antebraço Direito',
      antebraco_esquerdo: 'Antebraço Esquerdo',
      mao_direita: 'Mão Direita',
      mao_esquerda: 'Mão Esquerda',
      torax: 'Tórax',
      torax_esquerdo: 'Tórax (Esq.)',
      torax_direito: 'Tórax (Dir.)',
      costas_superior_esquerda: 'Costas Superior (Esq.)',
      costas_superior_direita: 'Costas Superior (Dir.)',
      abdomen: 'Abdômen',
      abdomen_esquerdo: 'Abdômen (Esq.)',
      abdomen_direito: 'Abdômen (Dir.)',
      lombar: 'Lombar',
      lombar_esquerda: 'Lombar (Esq.)',
      lombar_direita: 'Lombar (Dir.)',
      gluteo_esquerdo: 'Glúteo (Esq.)',
      gluteo_direito: 'Glúteo (Dir.)',
      quadril_direito: 'Quadril Direito',
      quadril_esquerdo: 'Quadril Esquerdo',
      coxa_direita: 'Coxa Direita',
      coxa_esquerda: 'Coxa Esquerda',
      joelho_direito: 'Joelho Direito',
      joelho_esquerdo: 'Joelho Esquerdo',
      perna_direita: 'Perna Direita',
      panturrilha_direita: 'Panturrilha Direita',
      perna_esquerda: 'Perna Esquerda',
      panturrilha_esquerda: 'Panturrilha Esquerda',
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
