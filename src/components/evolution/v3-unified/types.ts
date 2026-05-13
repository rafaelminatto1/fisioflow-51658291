export type EvolutionItemType = "procedure" | "exercise";

export interface EvolutionItemV3 {
  id: string;
  name: string;
  completed: boolean;
  type: EvolutionItemType;
  
  // Specific to exercises
  prescription?: string;
  patientFeedback?: string;
  
  // Specific to procedures
  notes?: string;
  
  // Metadata
  category?: string;
  intensity?: string | "low" | "medium" | "high";
  difficulty?: "easy" | "adequate" | "hard";
  order?: number;
}

export interface EvolutionBlockV3Props {
  items: EvolutionItemV3[];
  onChange: (items: EvolutionItemV3[]) => void;
  type: EvolutionItemType | "unified";
  title?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  accentColor?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}
