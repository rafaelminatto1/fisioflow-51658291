// Evolution V2 Types - Notion/Evernote style block-based evolution

export interface EvolutionV2Data {
  // Header (auto-filled)
  therapistName: string;
  therapistCrefito: string;
  sessionDate: string;
  sessionNumber?: number;
  totalSessions?: number;

  // Patient report
  patientReport: string;

  // Main evolution text (free-form, replaces SOAP)
  evolutionText: string;

  // Procedures / techniques checklist
  procedures: ProcedureItem[];

  // Exercises with status tracking
  exercises: ExerciseV2Item[];

  // Additional observations
  observations: string;

  // Pain level
  painLevel?: number;
  painLocation?: string;
}

export interface ProcedureItem {
  id: string;
  name: string;
  completed: boolean;
  notes?: string;
  category?: ProcedureCategory;
}

export type ProcedureCategory =
  | 'liberacao_miofascial'
  | 'mobilizacao'
  | 'eletroterapia'
  | 'laser'
  | 'ultrassom'
  | 'crioterapia'
  | 'termoterapia'
  | 'bandagem'
  | 'outro';

export const PROCEDURE_CATEGORY_LABELS: Record<ProcedureCategory, string> = {
  liberacao_miofascial: 'Liberação Miofascial',
  mobilizacao: 'Mobilização',
  eletroterapia: 'Eletroterapia',
  laser: 'Laser',
  ultrassom: 'Ultrassom',
  crioterapia: 'Crioterapia',
  termoterapia: 'Termoterapia',
  bandagem: 'Bandagem',
  outro: 'Outro',
};

// Common procedure suggestions for autocomplete
export const COMMON_PROCEDURES: Array<{ name: string; category: ProcedureCategory }> = [
  // Liberação Miofascial
  { name: 'Lib miofascial manual', category: 'liberacao_miofascial' },
  { name: 'Lib miofascial instrumental (IASTM)', category: 'liberacao_miofascial' },
  { name: 'Lib mio manual TFS', category: 'liberacao_miofascial' },
  { name: 'Dry needling', category: 'liberacao_miofascial' },
  { name: 'Ventosaterapia', category: 'liberacao_miofascial' },
  { name: 'Liberação de trigger points', category: 'liberacao_miofascial' },

  // Mobilização
  { name: 'Mob articular AP', category: 'mobilizacao' },
  { name: 'Mob articular PA', category: 'mobilizacao' },
  { name: 'Mob longitudinal', category: 'mobilizacao' },
  { name: 'Mob patelar inf e sup', category: 'mobilizacao' },
  { name: 'Mob AP femurotibial', category: 'mobilizacao' },
  { name: 'Mob cápsula inferior', category: 'mobilizacao' },
  { name: 'Mob neural', category: 'mobilizacao' },
  { name: 'Tração articular', category: 'mobilizacao' },
  { name: 'Manipulação articular', category: 'mobilizacao' },

  // Eletroterapia
  { name: 'TENS', category: 'eletroterapia' },
  { name: 'EENM (FES)', category: 'eletroterapia' },
  { name: 'Corrente Russa', category: 'eletroterapia' },
  { name: 'Corrente Interferencial', category: 'eletroterapia' },
  { name: 'Microcorrente', category: 'eletroterapia' },

  // Laser
  { name: 'Laser terapêutico', category: 'laser' },
  { name: 'Laser em região acromial', category: 'laser' },
  { name: 'Laser no tendão patelar', category: 'laser' },
  { name: 'Laser em região lombar', category: 'laser' },

  // Ultrassom
  { name: 'Ultrassom terapêutico', category: 'ultrassom' },
  { name: 'Ultrassom pulsado', category: 'ultrassom' },

  // Crioterapia
  { name: 'Crioterapia', category: 'crioterapia' },
  { name: 'Gelo local', category: 'crioterapia' },

  // Termoterapia
  { name: 'Infravermelho', category: 'termoterapia' },
  { name: 'Compressas quentes', category: 'termoterapia' },
  { name: 'Parafina', category: 'termoterapia' },

  // Bandagem
  { name: 'Kinesio taping', category: 'bandagem' },
  { name: 'Bandagem funcional', category: 'bandagem' },
  { name: 'Bota', category: 'bandagem' },
];

export interface ExerciseV2Item {
  id: string;
  exerciseId?: string; // from exercise library
  name: string;
  prescription: string; // e.g., "3x10rep" or "2x1' cada perna"
  completed: boolean;
  patientFeedback?: ExerciseFeedback;
  difficulty?: 'easy' | 'adequate' | 'hard';
  observations?: string;
  image_url?: string;
}

export type ExerciseFeedback = {
  pain: boolean;
  fatigue: boolean;
  difficultyPerforming: boolean;
  notes?: string;
};

export type EvolutionVersion = 'v1-soap' | 'v2-texto';
