/**
 * ProcedureChecklistBlock - Improved V2
 *
 * Enhanced procedures checklist with better UX,
 * smooth animations, and professional visual design.
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  CheckSquare,
  Plus,
  X,
  Zap,
  MessageSquare,
  Sparkles,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

// Category colors for visual distinction
const CATEGORY_COLORS: Record<ProcedureCategory, string> = {
  liberacao_miofascial: 'bg-purple-500/10 text-purple-700 border-purple-200',
  mobilizacao: 'bg-blue-500/10 text-blue-700 border-blue-200',
  eletroterapia: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  laser: 'bg-red-500/10 text-red-700 border-red-200',
  ultrassom: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  crioterapia: 'bg-sky-500/10 text-sky-700 border-sky-200',
  termoterapia: 'bg-orange-500/10 text-orange-700 border-orange-200',
  bandagem: 'bg-pink-500/10 text-pink-700 border-pink-200',
  outro: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

export const ProcedureChecklistBlock: React.FC<ProcedureChecklistBlockProps> = ({
  procedures,
  onChange,
  disabled = false,
  className,
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProcName, setNewProcName] = useState('');
  const [newProcCategory, setNewProcCategory] = useState<ProcedureCategory>('outro');

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

  const handleOpenCreateModal = useCallback((searchTerm: string) => {
    setNewProcName(searchTerm);
    setCreateModalOpen(true);
    setShowAutocomplete(false);
  }, []);

  const handleCreateNewProcedure = useCallback(() => {
    if (newProcName.trim()) {
      handleAddProcedure(newProcName.trim(), newProcCategory);
      setCreateModalOpen(false);
      setNewProcName('');
      setNewProcCategory('outro');
    }
  }, [newProcName, newProcCategory, handleAddProcedure]);

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

  return (
    <>
      <div className={cn(
        'w-full transition-all duration-300',
        className
      )}>
        {/* Procedure list */}
        <div className="pb-2">
          {procedures.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 mx-auto mb-3 flex items-center justify-center">
                <Zap className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium">Nenhum procedimento adicionado</p>
              <p className="text-xs mt-1.5 opacity-70">Use o botão "Adicionar" ou digite abaixo</p>
            </div>
          ) : (
            <div className="space-y-1">
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
                className="h-9 pl-10 pr-4 text-sm border-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-200 focus:shadow-sm rounded-md transition-all duration-200"
              />
            </div>
            {quickAddValue.trim() && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-full justify-start text-xs text-muted-foreground hover:text-emerald-600 mt-1.5"
                onClick={() => {
                  handleOpenCreateModal(quickAddValue);
                  setQuickAddValue('');
                }}
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                Criar "{quickAddValue}" como novo procedimento
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar - Enhanced */}
        {procedures.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Progresso</span>
              <span>{Math.round((completedCount / procedures.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${procedures.length > 0 ? (completedCount / procedures.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal para criar novo procedimento */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Criar Novo Procedimento
            </DialogTitle>
            <DialogDescription className="text-sm">
              Cadastre um novo procedimento que não está na lista padrão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="proc-name" className="text-sm font-medium">Nome do Procedimento *</Label>
              <Input
                id="proc-name"
                value={newProcName}
                onChange={(e) => setNewProcName(e.target.value)}
                placeholder="Ex: Liberação manual de trapézio"
                className="rounded-lg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-category" className="text-sm font-medium">Categoria</Label>
              <Select
                value={newProcCategory}
                onValueChange={(value) => setNewProcCategory(value as ProcedureCategory)}
              >
                <SelectTrigger id="proc-category" className="rounded-lg">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROCEDURE_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setNewProcName('');
                setNewProcCategory('outro');
              }}
              className="rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateNewProcedure}
              disabled={!newProcName.trim()}
              className="rounded-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Procedimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Individual procedure row - Enhanced
const ProcedureRow: React.FC<{
  procedure: ProcedureItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  disabled: boolean;
  index: number;
}> = React.memo(({ procedure, onToggle, onRemove, onUpdateNotes, disabled, index }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(procedure.id), 200);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-lg transition-all duration-200',
        'border border-transparent hover:bg-slate-50',
        procedure.completed && 'opacity-50',
        isRemoving && 'opacity-0 scale-95'
      )}
    >
      <div className="flex items-center gap-3 py-2.5 px-3">
        {/* Animated checkbox */}
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

        {/* Name */}
        <span
          className={cn(
            'flex-1 text-sm font-medium',
            procedure.completed && 'line-through text-muted-foreground'
          )}
        >
          {procedure.name}
        </span>

        {/* Category badge */}
        {procedure.category && procedure.category !== 'outro' && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-md font-medium border',
              CATEGORY_COLORS[procedure.category]
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

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => setShowNotes(!showNotes)} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {showNotes ? 'Ocultar notas' : 'Adicionar notas'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
              <X className="h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notes area with animation */}
      {showNotes && (
        <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
          <Input
            value={procedure.notes || ''}
            onChange={(e) => onUpdateNotes(procedure.id, e.target.value)}
            placeholder="Adicione detalhes: região, parâmetros, tempo, observações..."
            className="h-8 text-xs border-dashed rounded-lg"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
});

ProcedureRow.displayName = 'ProcedureRow';
