import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Star,
  Copy,
  Eye,
  Edit,
  Play,
  MoreVertical,
  Activity,
  Clock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EvaluationTemplate } from '@/types/clinical-forms';

const CATEGORY_COLORS: Record<string, string> = {
  'esportiva': 'bg-green-500',
  'ortopedica': 'bg-blue-500',
  'neurologica': 'bg-purple-500',
  'respiratoria': 'bg-orange-500',
  'padrao': 'bg-primary',
  'geral': 'bg-gray-500',
  'anamnese': 'bg-cyan-500',
  'avaliacao_postural': 'bg-indigo-500',
  'avaliacao_funcional': 'bg-pink-500',
  'custom': 'bg-slate-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  'esportiva': 'Esportiva',
  'ortopedica': 'Ortopédica',
  'neurologica': 'Neurológica',
  'respiratoria': 'Respiratória',
  'padrao': 'Padrão',
  'geral': 'Geral',
  'anamnese': 'Anamnese',
  'avaliacao_postural': 'Postural',
  'avaliacao_funcional': 'Funcional',
  'custom': 'Personalizada',
};

interface TemplateCardProps {
  template: EvaluationTemplate;
  isFavorite?: boolean;
  onToggleFavorite: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onPreview: (template: EvaluationTemplate) => void;
  onUse: (templateId: string) => void;
}

export function TemplateCard({
  template,
  isFavorite = false,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
  onUse,
}: TemplateCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    onToggleFavorite(template.id);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const categoryColor = CATEGORY_COLORS[template.tipo] || CATEGORY_COLORS['geral'];
  const categoryLabel = CATEGORY_LABELS[template.tipo] || template.tipo;
  const fieldCount = template.evaluation_form_fields?.length || template.fields?.length || 0;
  const usageCount = template.usage_count || 0;
  const estimatedTime = template.estimated_time || Math.ceil(fieldCount * 0.5); // 30s per field

  // Format last used time
  const formatLastUsed = (dateStr?: string | null) => {
    if (!dateStr) return 'Nunca usado';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem atrás`;
    return `${Math.floor(diffDays / 30)} meses atrás`;
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        "border-2",
        isFavorite ? "border-yellow-400/50 shadow-yellow-100/50" : "border-border hover:border-primary/50",
        "hover:-translate-y-1"
      )}
    >
      {/* Color strip header */}
      <div className={cn("h-1.5 w-full", categoryColor)} />

      {/* Card content */}
      <div className="p-4 space-y-3">
        {/* Header: Title + Favorite + Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate pr-2">
                {template.nome}
              </h3>
              {isFavorite && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
              )}
            </div>
            {template.descricao && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.descricao}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Favorite button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 transition-all duration-200",
                isFavorite && "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
              )}
              onClick={handleFavoriteClick}
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-all",
                  isFavorite ? "fill-yellow-400 text-yellow-400 scale-110" : "text-gray-300",
                  isAnimating && "animate-spin"
                )}
              />
            </Button>

            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onUse(template.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Usar Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPreview(template)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(template.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(template.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Category badge */}
        <div>
          <Badge variant="secondary" className="text-xs">
            {categoryLabel}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{fieldCount} campos</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>~{estimatedTime} min</span>
          </div>
        </div>

        {/* Usage stats */}
        {usageCount > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Usado {usageCount}x</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatLastUsed(template.last_used_at)}</span>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onUse(template.id)}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            Usar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(template)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(template.id)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default TemplateCard;
