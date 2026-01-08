// Pain Map Types

export type PainIntensity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type PainType = 
  | 'aguda' 
  | 'cronica' 
  | 'latejante' 
  | 'queimacao' 
  | 'formigamento' 
  | 'dormencia'
  | 'peso'
  | 'pontada'
  | 'sharp'
  | 'throbbing'
  | 'burning'
  | 'tingling'
  | 'numbness'
  | 'stiffness';

export type BodyRegion = 
  | 'cabeca'
  | 'pescoco'
  | 'ombro_direito'
  | 'ombro_esquerdo'
  | 'braco_direito'
  | 'braco_esquerdo'
  | 'antebraco_direito'
  | 'antebraco_esquerdo'
  | 'mao_direita'
  | 'mao_esquerda'
  | 'torax'
  | 'abdomen'
  | 'lombar'
  | 'quadril_direito'
  | 'quadril_esquerdo'
  | 'coxa_direita'
  | 'coxa_esquerda'
  | 'joelho_direito'
  | 'joelho_esquerdo'
  | 'perna_direita'
  | 'perna_esquerda'
  | 'tornozelo_direito'
  | 'tornozelo_esquerdo'
  | 'pe_direito'
  | 'pe_esquerdo';

export interface PainMapPoint {
  region: BodyRegion;
  intensity: PainIntensity;
  painType: PainType;
  description?: string;
  x: number; // Posição X no SVG (0-100%)
  y: number; // Posição Y no SVG (0-100%)
}

export interface PainMapRecord {
  id: string;
  patient_id: string;
  session_id?: string;
  appointment_id?: string;
  recorded_at: string;
  pain_points: PainMapPoint[];
  global_pain_level: PainIntensity;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PainEvolutionData {
  date: string;
  globalPainLevel: number;
  regionCount: number;
  mostAffectedRegion?: BodyRegion;
  painPoints: PainMapPoint[];
}

export interface PainStatistics {
  averagePainLevel: number;
  painReduction: number; // Percentage
  mostFrequentRegion: BodyRegion;
  painFreeRegionsCount: number;
  improvementTrend: 'improving' | 'stable' | 'worsening';
}

export type PainMapFormData = Omit<PainMapRecord, 'id' | 'created_at' | 'updated_at'>;
