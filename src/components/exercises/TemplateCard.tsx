import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  FlaskConical, 
  BarChart, 
  Stethoscope, 
  Maximize2, 
  Timer 
} from "lucide-react";
import type { ExerciseTemplate } from "@/types/workers";

interface TemplateCardProps {
  template: ExerciseTemplate;
  isSelected: boolean;
  onClick: () => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const PHASE_LABELS: Record<string, string> = {
  fase_aguda: "Fase Aguda",
  fase_subaguda: "Fase Subaguda",
  remodelacao: "Remodelação",
  retorno_ao_esporte: "Retorno Esporte",
};

const BODY_PART_LABELS: Record<string, string> = {
  ombro: "Ombro",
  joelho: "Joelho",
  quadril: "Quadril",
  coluna_cervical: "Cervical",
  coluna_lombar: "Lombar",
  tornozelo: "Tornozelo",
  cotovelo: "Cotovelo",
  corpo_todo: "Global",
};

export const TemplateCard = memo(function TemplateCard({
  template,
  isSelected,
  onClick,
}: TemplateCardProps) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md border-l-4 ${
        isSelected 
          ? "ring-1 ring-primary border-l-primary shadow-lg bg-primary/[0.02]" 
          : "border-l-transparent hover:border-l-primary/30"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-bold text-sm leading-tight flex-1 text-foreground" data-testid="template-name">
          {template.name}
        </h4>
        {template.templateType === "system" ? (
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase font-black bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
            Sistema
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase font-black text-green-700 border-green-200 bg-green-50">
            Personalizado
          </Badge>
        )}
      </div>

      {template.conditionName && (
        <p className="text-xs text-muted-foreground mb-3 font-medium line-clamp-1" data-testid="template-condition">
          {template.conditionName}
        </p>
      )}

      {/* Primary Badges (Clinical Info) */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {template.difficultyLevel && (
          <Badge variant="secondary" className="bg-muted/50 text-[10px] px-1.5 py-0 h-5 font-semibold text-muted-foreground border-none">
            <BarChart className="h-2.5 w-2.5 mr-1" />
            {DIFFICULTY_LABELS[template.difficultyLevel] || template.difficultyLevel}
          </Badge>
        )}
        {template.treatmentPhase && (
          <Badge variant="secondary" className="bg-muted/50 text-[10px] px-1.5 py-0 h-5 font-semibold text-muted-foreground border-none">
            <Stethoscope className="h-2.5 w-2.5 mr-1" />
            {PHASE_LABELS[template.treatmentPhase] || template.treatmentPhase}
          </Badge>
        )}
        {template.bodyPart && (
          <Badge variant="secondary" className="bg-muted/50 text-[10px] px-1.5 py-0 h-5 font-semibold text-muted-foreground border-none">
            <Maximize2 className="h-2.5 w-2.5 mr-1" />
            {BODY_PART_LABELS[template.bodyPart] || template.bodyPart}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-dashed">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground" data-testid="exercise-count">
            <Dumbbell className="h-3 w-3 text-primary/70" />
            {template.exerciseCount}
          </span>
          {template.estimatedDuration && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Timer className="h-3 w-3 text-primary/70" />
              {template.estimatedDuration} min
            </span>
          )}
        </div>

        {template.evidenceLevel && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
            <FlaskConical className="h-2.5 w-2.5" />
            EVIDÊNCIA {template.evidenceLevel}
          </div>
        )}
      </div>
    </Card>
  );
});

