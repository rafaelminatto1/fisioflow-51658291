export type AnalysisMode = "live" | "video" | "photo";
export type AnalysisType = "postura" | "marcha" | "articulacao" | "plumb";

export interface AnglePoint {
  x: number;
  y: number;
  label: string;
}

export interface AnalysisResult {
  id?: string;
  type: AnalysisType;
  angles: {
    joint: string;
    angle: number;
    reference: number;
    status: "ok" | "warning" | "alert";
  }[];
  observations: string;
  timestamp: string;
  mediaUri?: string;
  patientId?: string;
  patientName?: string;
  symmetries?: {
    joint: string;
    diff: number;
    percentage: number;
  }[];
  trajectories?: Record<string, { x: number; y: number }[]>;
  isSigned?: boolean;
  signature?: {
    signer: string;
    signedAt: string;
    hash: string;
  };
}

export const ANALYSIS_TYPES: { id: AnalysisType; label: string; icon: any; description: string }[] =
  [
    {
      id: "postura",
      label: "Análise Postural",
      icon: "body",
      description: "Avaliação de desvios posturais globais",
    },
    {
      id: "marcha",
      label: "Análise de Marcha",
      icon: "walk",
      description: "Ciclo de marcha, eventos e simetria",
    },
    {
      id: "articulacao",
      label: "Ângulos Articulares",
      icon: "analytics",
      description: "Medição de ADM em articulações específicas",
    },
    {
      id: "plumb",
      label: "Linha de Prumo",
      icon: "git-commit",
      description: "Alinhamento vertical do centro de gravidade",
    },
  ];

export const REFERENCE_ANGLES: Record<
  string,
  { label: string; reference: number; tolerance: number }
> = {
  joelho_flex: { label: "Flexão de Joelho", reference: 140, tolerance: 10 },
  joelho_ext: { label: "Extensão de Joelho", reference: 0, tolerance: 5 },
  quadril_flex: { label: "Flexão de Quadril", reference: 120, tolerance: 10 },
  quadril_abd: { label: "Abdução de Quadril", reference: 45, tolerance: 5 },
  ombro_flex: { label: "Flexão de Ombro", reference: 180, tolerance: 15 },
  tornozelo_dors: { label: "Dorsiflexão", reference: 20, tolerance: 5 },
  coluna_cervical_flex: { label: "Cervical Flex", reference: 45, tolerance: 5 },
  coluna_lombar_flex: { label: "Lombar Flex", reference: 60, tolerance: 10 },
  tronco_inclinacao: { label: "Inclinação de Tronco", reference: 0, tolerance: 3 },
  valgo_dinamico: { label: "Valgo Dinâmico", reference: 180, tolerance: 5 }, // 180 = neutro
};
