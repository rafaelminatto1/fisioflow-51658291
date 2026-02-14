/**
 * ProceduresChecklistImproved - Enhanced Procedures Checklist Component
 *
 * A completely redesigned procedures checklist with:
 * - Modern visual hierarchy with color-coded categories
 * - Quick add functionality with autocomplete
 * - Inline editing for notes
 * - Progress tracking
 * - Smooth animations
 * - Category-based organization
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  X,
  Zap,
  Search,
  MessageSquare,
  Sparkles,
  MoreVertical,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ==================== TYPES ====================

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

export interface ProcedureItem {
  id: string;
  name: string;
  completed: boolean;
  notes?: string;
  category?: ProcedureCategory;
  duration?: string;
  parameters?: string;
}

interface ProceduresChecklistImprovedProps {
  procedures: ProcedureItem[];
  onChange: (procedures: ProcedureItem[]) => void;
  disabled?: boolean;
  className?: string;
  showProgress?: boolean;
  showCategories?: boolean;
  allowCustomCategories?: boolean;
  maxHeight?: string;
}

// ==================== CONSTANTS ====================

const PROCEDURE_CATEGORY_LABELS: Record<ProcedureCategory, string> = {
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

const CATEGORY_COLORS: Record<ProcedureCategory, { bg: string; text: string; border: string; icon: string }> = {
  liberacao_miofascial: { bg: 'bg-purple-500/10', text: 'text-purple-700', border: 'border-purple-200', icon: '💆' },
  mobilizacao: { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-200', icon: '🦴' },
  eletroterapia: { bg: 'bg-yellow-500/10', text: 'text-yellow-700', border: 'border-yellow-200', icon: '⚡' },
  laser: { bg: 'bg-red-500/10', text: 'text-red-700', border: 'border-red-200', icon: '🔴' },
  ultrassom: { bg: 'bg-cyan-500/10', text: 'text-cyan-700', border: 'border-cyan-200', icon: '🔊' },
  crioterapia: { bg: 'bg-sky-500/10', text: 'text-sky-700', border: 'border-sky-200', icon: '❄️' },
  termoterapia: { bg: 'bg-orange-500/10', text: 'text-orange-700', border: 'border-orange-200', icon: '🔥' },
  bandagem: { bg: 'bg-pink-500/10', text: 'text-pink-700', border: 'border-pink-200', icon: '🩹' },
  outro: { bg: 'bg-gray-500/10', text: 'text-gray-700', border: 'border-gray-200', icon: '📋' },
};

const COMMON_PROCEDURES: Array<{ name: string; category: ProcedureCategory }> = [
  // Liberação Miofascial
  { name: 'Liberação miofascial manual', category: 'liberacao_miofascial' },
  { name: 'Liberação miofascial instrumental (IASTM)', category: 'liberacao_miofascial' },
  { name: 'Dry needling', category: 'liberacao_miofascial' },
  { name: 'Ventosaterapia', category: 'liberacao_miofascial' },
  // Mobilização
  { name: 'Mobilização articular', category: 'mobilizacao' },
  { name: 'Mobilização neural', category: 'mobilizacao' },
  { name: 'Tração articular', category: 'mobilizacao' },
  { name: 'Manipulação articular', category: 'mobilizacao' },
  // Eletroterapia
  { name: 'TENS', category: 'eletroterapia' },
  { name: 'EENM (FES)', category: 'eletroterapia' },
  { name: 'Corrente Russa', category: 'eletroterapia' },
  { name: 'Corrente Interferencial', category: 'eletroterapia' },
  // Laser
  { name: 'Laser terapêutico', category: 'laser' },
  // Ultrassom
  { name: 'Ultrassom terapêutico', category: 'ultrassom' },
  { name: 'Ultrassom pulsado', category: 'ultrassom' },
  // Crioterapia
  { name: 'Crioterapia', category: 'crioterapia' },
  { name: 'Gelo local', category: 'crioterapia' },
  // Termoterapia
  { name: 'Infravermelho', category: 'termoterapia' },
  { name: 'Compressas quentes', category: 'termoterapia' },
  // Bandagem
  { name: 'Kinesio taping', category: 'bandagem' },
  { name: 'Bandagem funcional', category: 'bandagem' },
  { name: 'Bota ortopédica', category: 'bandagem' },
];

// ==================== UTILITY FUNCTIONS ====================

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'proc_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// ==================== MAIN COMPONENT ====================

export const ProceduresChecklistImproved: React.FC<ProceduresChecklistImprovedProps> = ({
  procedures,
  onChange,
  disabled = false,
  className,
  showProgress = true,
  showCategories = true,
  allowCustomCategories = false,
  maxHeight = '400px',
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<ProcedureCategory | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const quickAddRef = useRef<HTMLInputElement>(null);

  const completedCount = procedures.filter((p) => p.completed).length;

  // Filter procedures by category
  const filteredProcedures = useMemo(() => {
    if (selectedCategoryFilter === 'all') return procedures;
    return procedures.filter((p) => p.category === selectedCategoryFilter);
  }, [procedures, selectedCategoryFilter]);

  // Group common procedures by category
  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ name: string; category: ProcedureCategory }>> = {};
    COMMON_PROCEDURES.forEach((proc) => {
      const label = PROCEDURE_CATEGORY_LABELS[proc.category];
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(proc);
    });
    return grouped;
  }, []);

  const existingNames = useMemo(
    () => new Set(procedures.map((p) => p.name.toLowerCase())),
    [procedures]
  );

  const handleToggle = useCallback(
    (id: string) => {
      onChange(
        procedures.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p))
      );
    },
    [procedures, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(procedures.filter((p) => p.id !== id));
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
      setQuickAddValue('');
      setShowAutocomplete(false);
    },
    [procedures, onChange]
  );

  const handleQuickAdd = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && quickAddValue.trim()) {
        handleAddProcedure(quickAddValue);
      }
    },
    [quickAddValue, handleAddProcedure]
  );

  const handleUpdateNotes = useCallback(
    (id: string, notes: string) => {
      onChange(procedures.map((p) => (p.id === id ? { ...p, notes } : p)));
    },
    [procedures, onChange]
  );

  const handleUpdateField = useCallback(
    (id: string, field: keyof ProcedureItem, value: string) => {
      onChange(procedures.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    },
    [procedures, onChange]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300',
          'shadow-sm hover:shadow-md',
          disabled && 'opacity-50',
          className
        )}
      >
        {/* Header */}
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-500 to-emerald-500/60" />
          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <Zap className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-foreground">Procedimentos</h3>
                {procedures.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {completedCount} de {procedures.length} concluídos
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Category filter */}
              {showCategories && procedures.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="gap-1.5 h-8"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span className="text-xs">
                        {selectedCategoryFilter === 'all'
                          ? 'Todos'
                          : PROCEDURE_CATEGORY_LABELS[selectedCategoryFilter]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedCategoryFilter('all')}>
                      Todas categorias
                    </DropdownMenuItem>
                    {Object.entries(PROCEDURE_CATEGORY_LABELS).map(([key, label]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => setSelectedCategoryFilter(key as ProcedureCategory)}
                      >
                        <span className="mr-2">{CATEGORY_COLORS[key as ProcedureCategory].icon}</span>
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Add button with autocomplete */}
              <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg h-8"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs font-medium">Adicionar</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar procedimento..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList className="max-h-[320px]">
                      <CommandEmpty>
                        <div className="py-6 px-3 flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground text-center">
                            {searchValue ? `"${searchValue}" não encontrado` : 'Nenhum procedimento encontrado'}
                          </p>
                          {searchValue && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                handleAddProcedure(searchValue);
                                setSearchValue('');
                              }}
                              className="w-full mt-1 gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Criar "{searchValue}"
                            </Button>
                          )}
                        </div>
                      </CommandEmpty>
                      {Object.keys(groupedByCategory).map((categoryLabel) => (
                        <CommandGroup key={categoryLabel} heading={categoryLabel}>
                          {groupedByCategory[categoryLabel]
                            .filter((p) => {
                              const matchesSearch = p.name.toLowerCase().includes(searchValue.toLowerCase());
                              const notAdded = !existingNames.has(p.name.toLowerCase());
                              return matchesSearch && notAdded;
                            })
                            .map((proc) => (
                              <CommandItem
                                key={proc.name}
                                value={proc.name}
                                onSelect={() => {
                                  handleAddProcedure(proc.name, proc.category);
                                  setSearchValue('');
                                }}
                                className="cursor-pointer"
                              >
                                <span className="mr-2">
                                  {CATEGORY_COLORS[proc.category].icon}
                                </span>
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
          </div>
        </div>

        {/* Procedure list */}
        <div className="p-3">
          {procedures.length === 0 ? (
            <EmptyState onQuickAdd={handleAddProcedure} disabled={disabled} />
          ) : (
            <div
              className="space-y-2 overflow-y-auto pr-1"
              style={{ maxHeight }}
            >
              {filteredProcedures.map((procedure) => (
                <ProcedureRowImproved
                  key={procedure.id}
                  procedure={procedure}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                  onUpdateNotes={handleUpdateNotes}
                  onUpdateField={handleUpdateField}
                  onToggleExpand={() => toggleExpanded(procedure.id)}
                  isExpanded={expandedIds.has(procedure.id)}
                  disabled={disabled}
                  showCategory={showCategories}
                />
              ))}

              {filteredProcedures.length === 0 && selectedCategoryFilter !== 'all' && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhum procedimento nesta categoria</p>
                </div>
              )}
            </div>
          )}

          {/* Quick add input */}
          <div className="mt-3">
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input
                ref={quickAddRef}
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={handleQuickAdd}
                placeholder="Digite um procedimento e pressione Enter..."
                disabled={disabled}
                className="h-9 pl-10 pr-4 text-sm border-dashed rounded-lg"
              />
            </div>
            {quickAddValue.trim() && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-full justify-start text-xs text-muted-foreground hover:text-emerald-600 mt-1.5"
                onClick={() => handleAddProcedure(quickAddValue)}
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                Adicionar "{quickAddValue}"
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && procedures.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Progresso da sessão</span>
              <span>{Math.round((completedCount / procedures.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${procedures.length > 0 ? (completedCount / procedures.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ==================== SUB-COMPONENTS ====================

// Empty State Component
const EmptyState: React.FC<{
  onQuickAdd: (name: string) => void;
  disabled: boolean;
}> = ({ onQuickAdd, disabled }) => {
  const quickSuggestions = [
    'Liberação miofascial',
    'Mobilização articular',
    'TENS',
    'Crioterapia',
  ];

  return (
    <div className="text-center py-10 text-muted-foreground">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mx-auto mb-3 flex items-center justify-center">
        <Zap className="h-7 w-7 opacity-30" />
      </div>
      <p className="text-sm font-medium">Nenhum procedimento adicionado</p>
      <p className="text-xs mt-1.5 opacity-70">Use o botão "Adicionar" ou digite abaixo</p>

      {/* Quick suggestions */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {quickSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onQuickAdd(suggestion)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 text-xs transition-colors"
          >
            + {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

// Individual Procedure Row Component
interface ProcedureRowImprovedProps {
  procedure: ProcedureItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateField: (id: string, field: keyof ProcedureItem, value: string) => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  disabled: boolean;
  showCategory: boolean;
}

const ProcedureRowImproved: React.FC<ProcedureRowImprovedProps> = React.memo(({
  procedure,
  onToggle,
  onRemove,
  onUpdateNotes,
  onUpdateField,
  onToggleExpand,
  isExpanded,
  disabled,
  showCategory,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(procedure.id), 200);
  };

  const categoryColors = procedure.category
    ? CATEGORY_COLORS[procedure.category]
    : CATEGORY_COLORS.outro;

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl transition-all duration-200',
        'border border-transparent hover:border-border/50 hover:bg-muted/30',
        procedure.completed && 'opacity-50',
        isRemoving && 'opacity-0 scale-95'
      )}
    >
      <div className="flex items-center gap-3 py-2.5 px-3">
        {/* Drag handle */}
        <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />

        {/* Checkbox */}
        <button
          onClick={() => onToggle(procedure.id)}
          disabled={disabled}
          className="flex-shrink-0 transition-all duration-200 hover:scale-110"
        >
          {procedure.completed ? (
            <div className="w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
              <CheckSquare className="h-3.5 w-3.5 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-lg border-2 border-muted-foreground/30 hover:border-emerald-500 transition-colors" />
          )}
        </button>

        {/* Category icon */}
        {showCategory && procedure.category && (
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0',
            categoryColors.bg
          )}>
            <span>{categoryColors.icon}</span>
          </div>
        )}

        {/* Name */}
        <span
          className={cn(
            'flex-1 text-sm font-medium',
            procedure.completed && 'line-through text-muted-foreground'
          )}
        >
          {procedure.name}
        </span>

        {/* Category badge (small) */}
        {showCategory && procedure.category && procedure.category !== 'outro' && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-md font-medium border',
              categoryColors.bg.replace('/10', '/20'),
              categoryColors.text
            )}
          >
            {PROCEDURE_CATEGORY_LABELS[procedure.category]}
          </Badge>
        )}

        {/* Notes indicator */}
        {procedure.notes && (
          <Badge variant="secondary" className="text-[10px] h-6 px-2 gap-1 rounded-full">
            <MessageSquare className="h-2.5 w-2.5" />
            nota
          </Badge>
        )}

        {/* Duration badge */}
        {procedure.duration && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full">
            {procedure.duration}
          </Badge>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpand}
          className="p-1 rounded-lg hover:bg-muted transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={onToggleExpand} className="gap-2">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expandir
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
              <X className="h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3">
            {/* Duration and parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">
                  Duração
                </Label>
                <Input
                  value={procedure.duration || ''}
                  onChange={(e) => onUpdateField(procedure.id, 'duration', e.target.value)}
                  placeholder="Ex: 15 min"
                  className="h-8 text-xs"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">
                  Parâmetros
                </Label>
                <Input
                  value={procedure.parameters || ''}
                  onChange={(e) => onUpdateField(procedure.id, 'parameters', e.target.value)}
                  placeholder="Ex: 3x10 min"
                  className="h-8 text-xs"
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Notes area */}
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground">
                Observações
              </Label>
              <Textarea
                value={procedure.notes || ''}
                onChange={(e) => onUpdateNotes(procedure.id, e.target.value)}
                placeholder="Adicione detalhes: região, parâmetros, tempo, observações..."
                className="h-16 text-xs border-dashed rounded-lg resize-none"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ProcedureRowImproved.displayName = 'ProcedureRowImproved';

export default ProceduresChecklistImproved;
