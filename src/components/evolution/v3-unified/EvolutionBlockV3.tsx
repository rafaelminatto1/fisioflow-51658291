import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  Dumbbell,
  Stethoscope,
  Info,
  MoreVertical,
  MessageSquare,
  GripVertical,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EvolutionBlockV3Props, EvolutionItemType, EvolutionItemV3 } from "./types";
import { COMMON_PROCEDURES } from "../v2-improved/types";
import { useExercises } from "@/hooks/useExercises";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  liberacao_miofascial: "bg-purple-500/10 text-purple-700 border-purple-200",
  mobilizacao: "bg-blue-500/10 text-blue-700 border-blue-200",
  eletroterapia: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  laser: "bg-red-500/10 text-red-700 border-red-200",
  ultrassom: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  crioterapia: "bg-sky-500/10 text-sky-700 border-sky-200",
  termoterapia: "bg-orange-500/10 text-orange-700 border-orange-200",
  bandagem: "bg-pink-500/10 text-pink-700 border-pink-200",
  outro: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  liberacao_miofascial: "Liberação Miofascial",
  mobilizacao: "Mobilização",
  eletroterapia: "Eletroterapia",
  laser: "Laser",
  ultrassom: "Ultrassom",
  crioterapia: "Crioterapia",
  termoterapia: "Termoterapia",
  bandagem: "Bandagem",
  outro: "Outro",
};

const INTENSITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

function formatItemDetail(item: EvolutionItemV3) {
  if (item.type === "exercise") {
    return [
      item.prescription
        ? {
            key: "prescription",
            label: item.prescription,
            className: "border-blue-200 bg-blue-50 text-blue-700",
          }
        : null,
      item.patientFeedback
        ? {
            key: "feedback",
            label: item.patientFeedback,
            className: "border-indigo-200 bg-indigo-50 text-indigo-700",
          }
        : null,
    ].filter(Boolean) as Array<{ key: string; label: string; className: string }>;
  }

  return [
    item.category && item.category !== "outro"
      ? {
          key: "category",
          label: CATEGORY_LABELS[item.category] || item.category,
          className: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.outro,
        }
      : null,
    item.intensity
      ? {
          key: "intensity",
          label: INTENSITY_LABELS[item.intensity] || item.intensity,
          className: "border-amber-200 bg-amber-50 text-amber-700",
        }
      : null,
    item.notes
      ? {
          key: "notes",
          label: item.notes,
          className: "border-slate-200 bg-slate-50 text-slate-700",
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; className: string }>;
}

interface EvolutionItemRowProps {
  item: EvolutionItemV3;
  index: number;
  disabled: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  handleToggleItem: (id: string) => void;
  handleRemoveItem: (id: string) => void;
  handleUpdateItem: (id: string, updates: Partial<EvolutionItemV3>) => void;
  type: EvolutionItemType | "unified";
}

const EvolutionItemRow: React.FC<EvolutionItemRowProps> = ({
  item,
  index,
  disabled,
  expandedId,
  setExpandedId,
  handleToggleItem,
  handleRemoveItem,
  handleUpdateItem,
  type,
}) => {
  const isExpanded = expandedId === item.id;
  const itemDetails = formatItemDetail(item);

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => {
        const row = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "group/item relative flex flex-col rounded-xl border overflow-hidden mb-1.5 transition-[border-color,box-shadow,background-color,opacity] duration-200",
              item.completed
                ? "bg-muted/5 border-border/40"
                : "bg-background border-border/60 shadow-sm",
              isExpanded && "ring-1 ring-primary/20 border-primary/30 shadow-md",
              snapshot.isDragging &&
                "z-[100] bg-background shadow-[0_14px_36px_rgba(15,23,42,0.16)] ring-1 ring-primary/35",
              snapshot.isDragging && "pointer-events-none", // Evita interferência durante o drag
            )}
            style={{
              ...provided.draggableProps.style,
              // Garante que o width seja mantido quando estiver no portal
              width: snapshot.isDragging ? "var(--drag-width)" : provided.draggableProps.style?.width,
            }}
          >
            {/* Row Header */}
            <div className="flex items-center gap-2 px-2.5 py-1.5" ref={(el) => {
              if (el && snapshot.isDragging) {
                // Captura o width original para usar no portal
                const parent = el.closest('.droppable-container');
                if (parent) {
                  const width = parent.getBoundingClientRect().width;
                  document.documentElement.style.setProperty('--drag-width', `${width}px`);
                }
              }
            }}>

            {/* Order number */}
            <span
              className="shrink-0 w-5 text-center text-[10px] font-bold text-muted-foreground/40 select-none"
              aria-label={`Item ${index + 1}`}
            >
              {index + 1}
            </span>
            <div
              {...provided.dragHandleProps}
              className={cn(
                "flex h-7 w-6 shrink-0 items-center justify-center rounded-md cursor-grab active:cursor-grabbing",
                "text-muted-foreground/35 hover:bg-muted/50 hover:text-muted-foreground/80 transition-colors",
                disabled && "cursor-not-allowed opacity-40",
              )}
              aria-label="Arrastar item na sequência"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            <Checkbox
              checked={item.completed}
              onCheckedChange={() => handleToggleItem(item.id)}
              disabled={disabled}
              className="h-4 w-4 rounded data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />

            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <span
                className={cn(
                  "min-w-0 shrink text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                  item.completed &&
                    "text-muted-foreground/70 line-through decoration-muted-foreground/30 font-medium",
                )}
              >
                {type === "unified" &&
                  (item.type === "exercise" ? (
                    <Dumbbell className="h-3.5 w-3.5 text-blue-500/70 shrink-0" />
                  ) : (
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                  ))}
                <span className="truncate">{item.name}</span>
              </span>

              {itemDetails.length > 0 && (
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  {itemDetails.slice(0, 2).map((detail) => (
                    <Badge
                      key={detail.key}
                      variant="outline"
                      title={detail.label}
                      className={cn(
                        "h-5 min-w-0 max-w-[9rem] shrink-0 truncate border px-1.5 text-[10px] font-semibold",
                        item.type === "exercise" && detail.key === "prescription" && "font-mono",
                        detail.className,
                      )}
                    >
                      <span className="truncate">{detail.label}</span>
                    </Badge>
                  ))}
                  {itemDetails.length > 2 && (
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 border-slate-200 bg-slate-50 px-1.5 text-[10px] font-semibold text-slate-600"
                    >
                      +{itemDetails.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Indicators */}
              <div className="ml-2 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                {(item.prescription || item.notes) && (
                  <div
                    className="p-1 rounded-md bg-muted/30 text-muted-foreground/70"
                    title="Possui detalhes"
                  >
                    <Info className="h-3 w-3" />
                  </div>
                )}
                {item.patientFeedback && (
                  <div
                    className="p-1 rounded-md bg-sky-500/10 text-sky-600"
                    title="Possui feedback"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </div>
                )}
              </div>
            </button>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-md text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity focus-visible:opacity-100"
                    aria-label="Mais opções"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                  <DropdownMenuItem
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-10 pb-4 pt-1 space-y-4">
                  {item.type === "exercise" ? (
                    <>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 px-1">
                          <Dumbbell className="h-3 w-3 text-blue-500" />
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                            Prescrição (Séries, Repetições, Carga)
                          </label>
                        </div>
                        <Input
                          value={item.prescription || ""}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { prescription: e.target.value })
                          }
                          placeholder="Ex: 3x12 - 5kg - 30s descanso"
                          className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-blue-500/20 text-sm"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 px-1">
                          <MessageSquare className="h-3 w-3 text-indigo-500" />
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                            Feedback do Paciente
                          </label>
                        </div>
                        <Input
                          value={item.patientFeedback || ""}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { patientFeedback: e.target.value })
                          }
                          placeholder="Como o paciente se sentiu? Dor? Facilidade?"
                          className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-indigo-500/20 text-sm"
                          disabled={disabled}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-1">
                          Intensidade / Parâmetros
                        </label>
                        <Input
                          value={item.intensity || ""}
                          onChange={(e) => handleUpdateItem(item.id, { intensity: e.target.value })}
                          placeholder="Ex: 2.0 J/cm² ou 10mA"
                          className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-emerald-500/20 text-sm"
                          disabled={disabled}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-1">
                          Notas do Procedimento
                        </label>
                        <Input
                          value={item.notes || ""}
                          onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                          placeholder="Detalhes sobre a técnica, tempo ou resposta..."
                          className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-emerald-500/20 text-sm"
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        );

        if (snapshot.isDragging) {
          return createPortal(row, document.body);
        }

        return row;
      }}
    </Draggable>

  );
};

export const EvolutionBlockV3: React.FC<EvolutionBlockV3Props> = ({
  items,
  onChange,
  type,
  title,
  icon,
  iconBg,
  accentColor: _accentColor = "primary",
  placeholder,
  disabled = false,
  className,
}) => {
  const [newItemName, setNewItemName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [pendingItemName, setPendingItemName] = useState("");

  const [newItemType, setNewItemType] = useState<EvolutionItemType>("procedure");
  const { exercises: libraryExercises } = useExercises();

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getTitle = () => {
    if (title) return title;
    if (type === "unified") return "Sessão de Atendimento";
    return type === "exercise" ? "Exercícios Terapêuticos" : "Procedimentos e Condutas";
  };

  const getIcon = () => {
    if (icon) return icon;
    if (type === "unified") return <Activity className="h-4 w-4" />;
    return type === "exercise" ? (
      <Dumbbell className="h-4 w-4" />
    ) : (
      <Stethoscope className="h-4 w-4" />
    );
  };

  const defaultPlaceholder =
    type === "exercise" ? "Adicionar novo exercício..." : "Adicionar novo procedimento...";

  const appendItem = (item: Omit<EvolutionItemV3, "id" | "completed" | "order">) => {
    const newItem: EvolutionItemV3 = {
      id: crypto.randomUUID(),
      completed: false,
      order: items.length,
      ...item,
    };

    onChange([...items, newItem]);
    setNewItemName("");
    setPendingItemName("");
    // Item starts collapsed; user expands manually to fill details
  };

  const addNewTypedItem = (name: string) => {
    if (!name.trim()) return;

    const itemType = type === "unified" ? newItemType : type;
    appendItem({
      name: name.trim(),
      type: itemType,
      ...(itemType === "exercise" ? { prescription: "3x10" } : { category: "outro" }),
    });
  };

  const handleToggleItem = (id: string) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<EvolutionItemV3>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    // Update order metadata
    const finalItems = reorderedItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    onChange(finalItems);
  };

  const procedureSuggestions = useMemo(() => {
    if (!newItemName.trim() || (type === "unified" && newItemType !== "procedure")) return [];
    if (type === "exercise") return [];
    return COMMON_PROCEDURES.filter((procedure) =>
      accentIncludes(procedure.name, newItemName),
    ).slice(0, 8);
  }, [newItemName, newItemType, type]);

  const exerciseSuggestions = useMemo(() => {
    if (!newItemName.trim() || (type === "unified" && newItemType !== "exercise")) return [];
    if (type === "procedure") return [];
    return libraryExercises
      .filter((exercise) => accentIncludes(exercise.name, newItemName))
      .slice(0, 8);
  }, [libraryExercises, newItemName, newItemType, type]);

  const hasSuggestions = procedureSuggestions.length > 0 || exerciseSuggestions.length > 0;

  const handleSelectProcedureSuggestion = (suggestion: (typeof COMMON_PROCEDURES)[0]) => {
    appendItem({
      name: suggestion.name,
      type: "procedure",
      category: suggestion.category,
    });
  };

  const handleSelectExerciseSuggestion = (exercise: (typeof libraryExercises)[number]) => {
    appendItem({
      name: exercise.name,
      type: "exercise",
      exerciseId: exercise.id,
      prescription: `${exercise.sets || 3}x${exercise.repetitions || 10}`,
    });
  };

  const handleAddItem = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    const exactProcedure = procedureSuggestions.find(
      (procedure) => procedure.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (exactProcedure) {
      handleSelectProcedureSuggestion(exactProcedure);
      return;
    }

    const exactExercise = exerciseSuggestions.find(
      (exercise) => exercise.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (exactExercise) {
      handleSelectExerciseSuggestion(exactExercise);
      return;
    }

    setPendingItemName(trimmedName);
    setNewItemDialogOpen(true);
  };

  const handleConfirmNewItem = () => {
    addNewTypedItem(pendingItemName);
    setNewItemDialogOpen(false);
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }

    if (e.altKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      setNewItemType("procedure");
    }

    if (e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault();
      setNewItemType("exercise");
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 p-5 rounded-3xl border border-border/50 bg-card/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2.5 rounded-2xl transition-colors duration-300",
              iconBg ||
                (type === "unified"
                  ? "bg-primary/10 text-primary"
                  : type === "exercise"
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-emerald-500/10 text-emerald-600"),
            )}
          >
            {getIcon()}
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight text-foreground/90">{getTitle()}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {completedCount} de {totalCount} concluídos
              </span>
            </div>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={cn(
                  "text-sm font-bold",
                  progress === 100 ? "text-primary" : "text-muted-foreground",
                )}
              >
                {Math.round(progress)}%
              </span>
              <Progress
                value={progress}
                className="h-1.5 w-24 sm:w-32 bg-muted/50 overflow-hidden rounded-full"
              >
                <div
                  className={cn(
                    "h-full transition-all duration-700 ease-in-out bg-gradient-to-r",
                    type === "unified"
                      ? "from-primary/80 to-primary"
                      : type === "exercise"
                        ? "from-blue-500 to-indigo-500"
                        : "from-emerald-500 to-teal-500",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </Progress>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      {!disabled && (
        <div className="flex flex-col gap-2 mt-2">
          {type === "unified" && (
            <div className="flex items-center gap-2 mb-1 px-1">
              <Button
                size="sm"
                variant={newItemType === "procedure" ? "default" : "ghost"}
                onClick={() => setNewItemType("procedure")}
                className={cn(
                  "h-7 rounded-full text-[10px] uppercase font-bold tracking-wider",
                  newItemType === "procedure" && "bg-emerald-600 hover:bg-emerald-700",
                )}
              >
                <Stethoscope className="h-3 w-3 mr-1.5" />
                Procedimento
              </Button>
              <Button
                size="sm"
                variant={newItemType === "exercise" ? "default" : "ghost"}
                onClick={() => setNewItemType("exercise")}
                className={cn(
                  "h-7 rounded-full text-[10px] uppercase font-bold tracking-wider",
                  newItemType === "exercise" && "bg-blue-600 hover:bg-blue-700",
                )}
              >
                <Dumbbell className="h-3 w-3 mr-1.5" />
                Exercício
              </Button>
            </div>
          )}
          <div className="relative flex items-center group/input">
            <Input
              data-evolution-input={type}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                placeholder ||
                (type === "unified"
                  ? newItemType === "exercise"
                    ? "Adicionar exercício..."
                    : "Adicionar procedimento..."
                  : defaultPlaceholder)
              }
              className="pl-10 pr-12 h-12 rounded-2xl bg-muted/30 border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all"
            />
            <Plus className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within/input:text-primary" />

            <div className="absolute right-1.5 flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1.5 mr-2">
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[9px] font-bold text-muted-foreground/50 border-muted-foreground/20"
                >
                  ALT+P
                </Badge>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[9px] font-bold text-muted-foreground/50 border-muted-foreground/20"
                >
                  ALT+E
                </Badge>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Smart Suggestions Dropdown */}
            <AnimatePresence>
              {hasSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 p-1.5 rounded-2xl border border-border shadow-2xl bg-background/95 backdrop-blur-xl"
                >
                  <div className="px-2 py-1.5 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Selecione da biblioteca
                    </span>
                  </div>
                  {procedureSuggestions.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleSelectProcedureSuggestion(s)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/5 text-sm transition-all group/sug"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-1.5 rounded-lg", CATEGORY_COLORS[s.category])}>
                          <Stethoscope className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium">{s.name}</span>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover/sug:text-primary opacity-0 group-hover/sug:opacity-100 transition-all" />
                    </button>
                  ))}
                  {exerciseSuggestions.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleSelectExerciseSuggestion(exercise)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/5 text-sm transition-all group/sug"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-700">
                          <Dumbbell className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <span className="block truncate font-medium">{exercise.name}</span>
                          {exercise.category && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {exercise.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover/sug:text-primary opacity-0 group-hover/sug:opacity-100 transition-all" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Items List with DND and Animations */}
      <div className="mt-2">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="evolution-items">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-0.5 droppable-container"
              >

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-dashed border-border/60 bg-muted/10">
                    <div className="p-3 rounded-full bg-muted/20 mb-3">
                      <Activity className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium text-center">
                      Nenhum item adicionado
                    </p>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.querySelector<HTMLInputElement>(
                            `[data-evolution-input="${type}"]`,
                          );
                          input?.focus();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary/70 hover:text-primary transition-colors underline-offset-2 hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar primeiro item
                      </button>
                    )}
                  </div>
                ) : (
                  items.map((item, index) => (
                    <EvolutionItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      type={type}
                      disabled={disabled}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      handleToggleItem={handleToggleItem}
                      handleRemoveItem={handleRemoveItem}
                      handleUpdateItem={handleUpdateItem}
                    />
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <Dialog open={newItemDialogOpen} onOpenChange={setNewItemDialogOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Item não encontrado
            </DialogTitle>
            <DialogDescription>
              Não encontramos esse nome na biblioteca. Ajuste o texto ou confirme que é um novo{" "}
              {(type === "unified" ? newItemType : type) === "exercise"
                ? "exercício"
                : "procedimento"}
              .
            </DialogDescription>
          </DialogHeader>
          <Input
            value={pendingItemName}
            onChange={(event) => setPendingItemName(event.target.value)}
            className="h-10 rounded-xl"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmNewItem} disabled={!pendingItemName.trim()}>
              Adicionar como novo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
