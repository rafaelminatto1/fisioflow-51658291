import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DIFFICULTY_UI } from "@/lib/constants/exerciseConstants";

interface ExerciseDifficultyBadgeProps {
  difficulty: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function ExerciseDifficultyBadge({
  difficulty,
  className,
  size = "md",
  showLabel = true,
}: ExerciseDifficultyBadgeProps) {
  if (!difficulty) return null;

  const ui = DIFFICULTY_UI[difficulty as keyof typeof DIFFICULTY_UI];

  if (!ui) return null;

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        sizeClasses,
        ui.badgeClass,
        className,
      )}
    >
      {showLabel ? ui.label : difficulty}
    </Badge>
  );
}