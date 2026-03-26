import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, FlaskConical } from "lucide-react";
import type { ExerciseTemplate } from "@/types/workers";

interface TemplateCardProps {
  template: ExerciseTemplate;
  isSelected: boolean;
  onClick: () => void;
}

export const TemplateCard = memo(function TemplateCard({
  template,
  isSelected,
  onClick,
}: TemplateCardProps) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-bold text-sm leading-tight flex-1">{template.name}</h4>
        {template.templateType === "system" ? (
          <Badge variant="secondary" className="shrink-0 text-xs">
            Sistema
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 text-xs text-green-700 border-green-600">
            Personalizado
          </Badge>
        )}
      </div>

      {template.conditionName && (
        <p className="text-xs text-muted-foreground mb-2">{template.conditionName}</p>
      )}

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Dumbbell className="h-3 w-3" />
          {template.exerciseCount} exercício{template.exerciseCount !== 1 ? "s" : ""}
        </span>

        {template.evidenceLevel && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 flex items-center gap-1">
            <FlaskConical className="h-3 w-3" />
            Evidência {template.evidenceLevel}
          </Badge>
        )}
      </div>
    </Card>
  );
});
