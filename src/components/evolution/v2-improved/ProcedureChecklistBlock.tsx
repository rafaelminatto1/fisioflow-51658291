/**
 * ProcedureChecklistBlock - Improved V2
 *
 * Enhanced procedures checklist with better UX,
 * smooth animations, and professional visual design.
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus,
  CheckCircle2,
  Zap,
  Trophy,
  X,
  MessageSquare,
  Sparkles,
  MoreVertical,
  CheckSquare,
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ProcedureItem, type ProcedureCategory, PROCEDURE_CATEGORY_LABELS } from "./types";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProcedureChecklistBlockProps {
  procedures: ProcedureItem[];
  onChange: (procedures: ProcedureItem[]) => void;
  disabled?: boolean;
  className?: string;
}

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "proc_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// Category colors for visual distinction
const CATEGORY_COLORS: Record<ProcedureCategory, string> = {
  liberacao_miofascial: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  mobilizacao: "bg-blue-500/10 text-blue-700 border-blue-200",
  eletroterapia: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  laser: "bg-red-500/10 text-red-700 border-red-200",
  ultrassom: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  crioterapia: "bg-sky-500/10 text-sky-700 border-sky-200",
  termoterapia: "bg-orange-500/10 text-orange-700 border-orange-200",
  bandagem: "bg-pink-500/10 text-pink-700 border-pink-200",
  outro: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export const ProcedureChecklistBlock: React.FC<ProcedureChecklistBlockProps> = ({
  procedures,
  onChange,
  disabled = false,
  className,
}) => {
  const [_showAutocomplete, setShowAutocomplete] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProcName, setNewProcName] = useState("");
  const [newProcCategory, setNewProcCategory] = useState<ProcedureCategory>("outro");

  const completedCount = procedures.filter((p) => p.completed).length;
  const isAllCompleted = procedures.length > 0 && completedCount === procedures.length;

  // Trigger confetti on 100% completion
  useEffect(() => {
    if (isAllCompleted && !hasTriggeredConfetti && !disabled) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#2dd4bf", "#6366f1", "#10b981"],
      });
      setHasTriggeredConfetti(true);
    } else if (!isAllCompleted) {
      setHasTriggeredConfetti(false);
    }
  }, [isAllCompleted, hasTriggeredConfetti, disabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with "/" if not in an input
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        quickAddRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggle = useCallback(
    (id: string) => {
      onChange(procedures.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)));
    },
    [procedures, onChange],
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(procedures.filter((p) => p.id !== id));
    },
    [procedures, onChange],
  );

  const handleAddProcedure = useCallback(
    (name: string, category?: ProcedureCategory) => {
      const newProcedure: ProcedureItem = {
        id: generateId(),
        name: name.trim(),
        completed: false,
        category: category || "outro",
      };
      onChange([...procedures, newProcedure]);
      setShowAutocomplete(false);
    },
    [procedures, onChange],
  );

  const handleQuickAdd = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && quickAddValue.trim()) {
        handleAddProcedure(quickAddValue);
        setQuickAddValue("");
      }
    },
    [quickAddValue, handleAddProcedure],
  );

  const handleUpdateIntensity = useCallback(
    (id: string, intensity: string) => {
      onChange(procedures.map((p) => (p.id === id ? { ...p, intensity } : p)));
    },
    [procedures, onChange],
  );

  const handleUpdateNotes = useCallback(
    (id: string, notes: string) => {
      onChange(procedures.map((p) => (p.id === id ? { ...p, notes } : p)));
    },
    [procedures, onChange],
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
      setNewProcName("");
      setNewProcCategory("outro");
    }
  }, [newProcName, newProcCategory, handleAddProcedure]);

  return (
    <>
      <div className={cn("w-full transition-all duration-300", className)}>
        {/* Procedure list */}
        <div className="pb-2">
          {procedures.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 mx-auto mb-3 flex items-center justify-center">
                <Zap className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium">Nenhum procedimento adicionado</p>
              <p className="text-xs mt-1.5 opacity-90">Use o botão "Adicionar" ou digite abaixo</p>
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
                  onUpdateIntensity={handleUpdateIntensity}
                  disabled={disabled}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Quick add input */}
          <div className="mt-3">
            <div className="relative group">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input
                ref={quickAddRef}
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={handleQuickAdd}
                placeholder="Digite um procedimento e pressione Enter... (Atalho: /)"
                disabled={disabled}
                className="h-9 pl-10 pr-4 text-sm border-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-200 focus:shadow-sm rounded-md transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">/</span>
                </kbd>
              </div>
            </div>
            {quickAddValue.trim() && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-full justify-start text-xs text-muted-foreground hover:text-emerald-600 mt-1.5"
                onClick={() => {
                  handleOpenCreateModal(quickAddValue);
                  setQuickAddValue("");
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "p-1.5 rounded-lg transition-colors duration-300",
                  isAllCompleted
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {isAllCompleted ? (
                  <Trophy className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Procedimentos & Intervenções
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Acompanhamento clínico em tempo real
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={cn(
                    "text-xs font-bold transition-colors duration-300",
                    isAllCompleted ? "text-emerald-600" : "text-slate-700",
                  )}
                >
                  {completedCount}/{procedures.length}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">concluídos</span>
              </div>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-out rounded-full relative z-10",
                    isAllCompleted ? "bg-emerald-500" : "bg-blue-500",
                  )}
                  style={{ width: `${(completedCount / Math.max(1, procedures.length)) * 100}%` }}
                />
                {isAllCompleted && (
                  <div className="absolute inset-0 bg-emerald-400/30 animate-shimmer z-20" />
                )}
              </div>
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
              <Label htmlFor="proc-name" className="text-sm font-medium">
                Nome do Procedimento *
              </Label>
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
              <Label htmlFor="proc-category" className="text-sm font-medium">
                Categoria
              </Label>
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
                setNewProcName("");
                setNewProcCategory("outro");
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
  onUpdateIntensity: (id: string, intensity: string) => void;
  disabled: boolean;
  index: number;
}> = React.memo(
  ({
    procedure,
    onToggle,
    onRemove,
    onUpdateNotes,
    onUpdateIntensity,
    disabled,
    index: _index,
  }) => {
    const [showNotes, setShowNotes] = useState(() => {
      return !!procedure.notes?.trim();
    });
    const [isRemoving, setIsRemoving] = useState(false);

    const prevHasNotesRef = useRef(false);

    useEffect(() => {
      const hasNotes = !!procedure.notes?.trim();
      if (hasNotes && !prevHasNotesRef.current) {
        setShowNotes(true);
      }
      prevHasNotesRef.current = hasNotes;
    }, [procedure.notes]);

    const handleRemove = () => {
      setIsRemoving(true);
      setTimeout(() => onRemove(procedure.id), 200);
    };

    return (
      <div
        className={cn(
          "group relative flex flex-col rounded-lg transition-all duration-200",
          "border border-transparent hover:bg-slate-50",
          procedure.completed && "opacity-50",
          isRemoving && "opacity-0 scale-95",
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
              "flex-1 text-sm font-medium",
              procedure.completed && "line-through text-muted-foreground",
            )}
          >
            {procedure.name}
          </span>

          {/* Category badge */}
          {procedure.category && procedure.category !== "outro" && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-md font-medium border",
                CATEGORY_COLORS[procedure.category],
              )}
            >
              {PROCEDURE_CATEGORY_LABELS[procedure.category]}
            </Badge>
          )}

          {/* Status indicators */}
          <div className="flex items-center gap-1">
            {procedure.notes && (
              <Badge variant="secondary" className="text-[10px] h-6 px-2 gap-1 rounded-full">
                <MessageSquare className="h-2.5 w-2.5" />
                nota
              </Badge>
            )}

            {procedure.intensity && (
              <Badge
                variant="outline"
                className="text-[10px] h-6 px-2 gap-1 rounded-full bg-yellow-50 text-yellow-700 border-yellow-200"
              >
                <Zap className="h-2.5 w-2.5" />
                {procedure.intensity}
              </Badge>
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Mais opções"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem onClick={() => setShowNotes(!showNotes)} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                {showNotes ? "Ocultar notas" : "Adicionar notas"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRemove}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <X className="h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Intensity and Notes area */}
        {(procedure.category === "laser" || procedure.category === "ultrassom" || showNotes) && (
          <div className="px-3 pb-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
            {(procedure.category === "laser" || procedure.category === "ultrassom") && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100/50 border border-slate-200/50 w-full max-w-[200px]">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <input
                    value={procedure.intensity || ""}
                    onChange={(e) => onUpdateIntensity(procedure.id, e.target.value)}
                    placeholder="Intensidade (ex: 2.0 J/cm²)"
                    className="bg-transparent border-none text-[10px] outline-none w-full placeholder:text-muted-foreground/50"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            {showNotes && (
              <Input
                value={procedure.notes || ""}
                onChange={(e) => onUpdateNotes(procedure.id, e.target.value)}
                placeholder="Adicione detalhes: região, parâmetros, tempo, observações..."
                className="h-8 text-xs border-dashed rounded-lg"
                disabled={disabled}
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

ProcedureRow.displayName = "ProcedureRow";
