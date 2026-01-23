import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EvaluationTemplate } from '@/types/clinical-forms';
import { TemplateCard } from './TemplateCard';
import { cn } from '@/lib/utils';

interface TemplateGridProps {
  templates: EvaluationTemplate[];
  favorites?: Set<string>;
  isLoading?: boolean;
  onToggleFavorite: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onPreview: (template: EvaluationTemplate) => void;
  onUse: (templateId: string) => void;
  maxItems?: number; // Limit number of cards shown (for "Quick Access" section)
  emptyMessage?: string;
  emptyDescription?: string;
}

export function TemplateGrid({
  templates,
  favorites = new Set(),
  isLoading = false,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
  onUse,
  maxItems,
  emptyMessage = "Nenhum template encontrado",
  emptyDescription = "Crie seu primeiro template ou use os modelos padrão",
}: TemplateGridProps) {
  // Limit templates if maxItems is set
  const displayTemplates = maxItems ? templates.slice(0, maxItems) : templates;

  if (isLoading) {
    return <TemplateGridSkeleton count={maxItems || 6} />;
  }

  if (displayTemplates.length === 0) {
    return (
      <div className="col-span-full text-center py-12 px-4">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        // Responsive grid
        "grid-cols-1", // Mobile: 1 column
        "sm:grid-cols-2", // Small screens: 2 columns
        "lg:grid-cols-3", // Large screens: 3 columns
        "xl:grid-cols-4" // Extra large: 4 columns (optional for very wide screens)
      )}
    >
      {displayTemplates.map((template, index) => (
        <div
          key={template.id}
          className="animate-in fade-in zoom-in duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <TemplateCard
            template={template}
            isFavorite={favorites.has(template.id) || template.is_favorite}
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onPreview={onPreview}
            onUse={onUse}
          />
        </div>
      ))}
    </div>
  );
}

interface TemplateGridSkeletonProps {
  count?: number;
}

export function TemplateGridSkeleton({ count = 6 }: TemplateGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1",
        "sm:grid-cols-2",
        "lg:grid-cols-3",
        "xl:grid-cols-4"
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="p-4 space-y-3 animate-pulse"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Color strip */}
          <div className="h-1.5 w-full bg-muted rounded-full" />

          {/* Header skeleton */}
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>

          {/* Category badge */}
          <Skeleton className="h-6 w-20 rounded-full" />

          {/* Stats row */}
          <div className="flex gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Usage stats */}
          <div className="flex gap-3 pt-2 border-t">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default TemplateGrid;
