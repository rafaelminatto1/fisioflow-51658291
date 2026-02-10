import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  X,
  Zap,
  Search,
  ChevronDown,
  GripVertical,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type ProcedureItem,
  type ProcedureCategory,
  COMMON_PROCEDURES,
  PROCEDURE_CATEGORY_LABELS,
} from './types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface ProcedureChecklistBlockProps {
  procedures: ProcedureItem[];
  onChange: (procedures: ProcedureItem[]) => void;
  disabled?: boolean;
  className?: string;
}

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'proc_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const ProcedureChecklistBlock: React.FC<ProcedureChecklistBlockProps> = ({
  procedures,
  onChange,
  disabled = false,
  className,
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);

  const completedCount = procedures.filter((p) => p.completed).length;

  const handleToggle = useCallback(
    (id: string) => {
      onChange(
        procedures.map((p) =>
          p.id === id ? { ...p, completed: !p.completed } : p
        )
      );
    },
    [procedures, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(procedures.filter((p) => p.id !== id));
    },
    [procedures, onChange]
  );

  const handleAddProcedure = useCallback(
    (name: string, category?: ProcedureCategory) => {
      const newProcedure: ProcedureItem = {
        id: generateId(),
        name: name.trim(),
        completed: false,
        category: category || 'outro',
      };
      onChange([...procedures, newProcedure]);
      setShowAutocomplete(false);
    },
    [procedures, onChange]
  );

  const handleQuickAdd = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && quickAddValue.trim()) {
        handleAddProcedure(quickAddValue);
        setQuickAddValue('');
      }
    },
    [quickAddValue, handleAddProcedure]
  );

  const handleUpdateNotes = useCallback(
    (id: string, notes: string) => {
      onChange(
        procedures.map((p) => (p.id === id ? { ...p, notes } : p))
      );
    },
    [procedures, onChange]
  );

  // Group procedures by category
  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ name: string; category: ProcedureCategory }>> = {};
    COMMON_PROCEDURES.forEach((proc) => {
      const label = PROCEDURE_CATEGORY_LABELS[proc.category];
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(proc);
    });
    return grouped;
  }, []);

  // Filter out already added procedures in autocomplete
  const existingNames = useMemo(
    () => new Set(procedures.map((p) => p.name.toLowerCase())),
    [procedures]
  );

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-500/10">
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold">Procedimentos & Técnicas</h3>
          {procedures.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{procedures.length}
            </Badge>
          )}
        </div>

        <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="gap-1.5 text-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="end">
            <Command shouldFilter={true}>
              <CommandInput placeholder="Buscar procedimento..." />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>
                  Nenhum procedimento encontrado. Pressione Enter para adicionar.
                </CommandEmpty>
                {Object.keys(groupedByCategory).map((categoryLabel) => (
                  <CommandGroup key={categoryLabel} heading={categoryLabel}>
                    {groupedByCategory[categoryLabel]
                      .filter((p) => !existingNames.has(p.name.toLowerCase()))
                      .map((proc) => (
                        <CommandItem
                          key={proc.name}
                          value={proc.name}
                          onSelect={() => handleAddProcedure(proc.name, proc.category)}
                          className="cursor-pointer"
                        >
                          <span>{proc.name}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Procedure list */}
      <div className="p-2">
        {procedures.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Nenhum procedimento adicionado</p>
            <p className="text-xs mt-1">Use o botão "Adicionar" ou digite abaixo</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {procedures.map((proc, index) => (
              <ProcedureRow
                key={proc.id}
                procedure={proc}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onUpdateNotes={handleUpdateNotes}
                disabled={disabled}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Quick add input */}
        <div className="mt-2 px-1">
          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
            <Plus className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
            <Input
              ref={quickAddRef}
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={handleQuickAdd}
              placeholder="Digitar procedimento e pressionar Enter..."
              disabled={disabled}
              className="h-7 border-0 shadow-none px-0 text-sm placeholder:text-muted-foreground/40 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {procedures.length > 0 && (
        <div className="px-3 pb-2">
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${procedures.length > 0 ? (completedCount / procedures.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Individual procedure row
const ProcedureRow: React.FC<{
  procedure: ProcedureItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  disabled: boolean;
  index: number;
}> = React.memo(({ procedure, onToggle, onRemove, onUpdateNotes, disabled, index }) => {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div
      className={cn(
        'group flex flex-col rounded-md transition-all',
        procedure.completed && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(procedure.id)}
          disabled={disabled}
          className="flex-shrink-0 transition-colors"
        >
          {procedure.completed ? (
            <CheckSquare className="h-4 w-4 text-emerald-500" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
          )}
        </button>

        {/* Name */}
        <span
          className={cn(
            'flex-1 text-sm',
            procedure.completed && 'line-through text-muted-foreground'
          )}
        >
          {procedure.name}
        </span>

        {/* Category badge */}
        {procedure.category && procedure.category !== 'outro' && (
          <Badge variant="outline" className="text-[10px] h-5 hidden sm:flex">
            {PROCEDURE_CATEGORY_LABELS[procedure.category]}
          </Badge>
        )}

        {/* Notes indicator */}
        {procedure.notes && (
          <Badge variant="secondary" className="text-[10px] h-5">
            <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
            nota
          </Badge>
        )}

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="p-1 rounded hover:bg-muted"
            title="Adicionar nota"
          >
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => onRemove(procedure.id)}
            disabled={disabled}
            className="p-1 rounded hover:bg-destructive/10"
            title="Remover"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Notes area */}
      {showNotes && (
        <div className="ml-8 mr-2 mb-1">
          <Input
            value={procedure.notes || ''}
            onChange={(e) => onUpdateNotes(procedure.id, e.target.value)}
            placeholder="Detalhes: região, parâmetros, tempo..."
            className="h-7 text-xs border-dashed"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
});

ProcedureRow.displayName = 'ProcedureRow';
