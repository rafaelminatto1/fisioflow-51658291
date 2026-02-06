/**
 * AutomationCard - Card de automação para dashboard
 */

import React from 'react';
import { MoreVertical, Edit2, Copy, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {

  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Automation } from '@/types/automation';

function toDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  const n = Number(v);
  return !isNaN(n) ? new Date(n) : null;
}

interface AutomationCardProps {
  automation: Automation;
  onToggleActive: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function AutomationCard({
  automation,
  onToggleActive,
  onEdit,
  onDuplicate,
  onDelete,
}: AutomationCardProps) {
  const getTriggerLabel = () => {
    switch (automation.trigger.type) {
      case 'patient.created':
        return 'Quando paciente for criado';
      case 'appointment.created':
        return 'Quando agendamento for criado';
      case 'schedule.daily':
        return 'Diariamente';
      case 'schedule.weekly':
        return 'Semanalmente';
      case 'schedule.cron':
        return 'Agendado (cron)';
      case 'webhook.received':
        return 'Via webhook';
      default:
        return automation.trigger.type;
    }
  };

  const getStatusColor = () => {
    if (!automation.is_active) return 'secondary';
    if (automation.last_status === 'success') return 'default';
    if (automation.last_status === 'error') return 'destructive';
    return 'default';
  };

  return (
    <Card className={automation.is_active ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold line-clamp-1">{automation.name}</h3>
              <Badge variant={getStatusColor()} className="text-xs">
                {automation.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {automation.description}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Trigger */}
        <div className="text-sm">
          <span className="text-muted-foreground">Trigger: </span>
          <span>{getTriggerLabel()}</span>
        </div>

        {/* Actions */}
        <div className="text-sm">
          <span className="text-muted-foreground">Ações: </span>
          <span>{automation.actions.length} ação(ões)</span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Execuções: {automation.execution_count}
          </span>
          {automation.last_executed_at && (() => {
            const d = toDateSafe(automation.last_executed_at);
            return d ? (
              <span className="text-muted-foreground">
                Última: {formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}
              </span>
            ) : null;
          })()}
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-sm">Ativar automação</span>
          <Switch
            checked={automation.is_active}
            onCheckedChange={onToggleActive}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * RecipeLibrary - Biblioteca de templates de automação
 */
export function RecipeLibrary({
  recipes,
  selectedCategory,
  onCategoryChange,
  onSelectRecipe,
}: {
  recipes: unknown[];
  selectedCategory: string;
  onCategoryChange: (cat: unknown) => void;
  onSelectRecipe: (recipe: unknown) => void;
}) {
  const categories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'reminders', label: 'Lembretes' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'reactivation', label: 'Reativação' },
    { value: 'collections', label: 'Cobrança' },
    { value: 'productivity', label: 'Produtividade' },
  ];

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onCategoryChange(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Recipes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <Card
            key={recipe.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectRecipe(recipe)}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{recipe.icon}</span>
                <div className="flex-1">
                  <CardTitle className="text-base">{recipe.name}</CardTitle>
                  {recipe.is_popular && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Popular
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-sm">
                {recipe.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {recipe.tags?.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum template encontrado para esta categoria</p>
        </div>
      )}
    </div>
  );
}
