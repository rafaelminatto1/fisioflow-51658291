import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
// Deployment trigger comment
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
  MessageSquare,
  GripVertical,
  Search,
  X,
  BookOpen,
  Eye,
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
import type { EvolutionBlockV3Props, EvolutionItemType, EvolutionItemV3 } from "./types";
import { COMMON_PROCEDURES } from "../v2-improved/types";
import { useExercises, type Exercise } from "@/hooks/useExercises";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { getBestImageUrl, getImageUrlCandidates } from "@/lib/imageUtils";
import { ExerciseViewModal } from "../../exercises/ExerciseViewModal";

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  liberacao_miofascial: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  mobilizacao: "bg-teal-500/10 text-teal-700 border-teal-200",
  eletroterapia: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  laser: "bg-red-500/10 text-red-700 border-red-200",
  ultrassom: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  crioterapia: "bg-slate-500/10 text-slate-700 border-slate-200",
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

type ProcedureSuggestion = { selectType: "procedure" } & (typeof COMMON_PROCEDURES)[0];
type ExerciseSuggestion = { selectType: "exercise" } & Exercise;
type CombinedSuggestion = ProcedureSuggestion | ExerciseSuggestion;

function formatItemDetail(item: EvolutionItemV3) {
  if (item.type === "exercise") {
    return [
      item.prescription
        ? {
            key: "prescription",
            label: item.prescription,
            className: "border-emerald-200 bg-emerald-50 text-emerald-700",
          }
        : null,
      item.patientFeedback
        ? {
            key: "feedback",
            label: item.patientFeedback,
            className: "border-teal-200 bg-teal-50 text-teal-700",
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
  handleToggleItem: (id: string) => void;
  handleRemoveItem: (id: string) => void;
  handleUpdateItem: (id: string, updates: Partial<EvolutionItemV3>) => void;
  onOpenExercise?: (exercise: Exercise) => void;
  type: EvolutionItemType | "unified";
}

const EvolutionItemRow: React.FC<EvolutionItemRowProps> = ({
  item,
  index,
  disabled,
  handleToggleItem,
  handleRemoveItem,
  handleUpdateItem,
  onOpenExercise,
  type,
}) => {
  const { exercises: libraryExercises } = useExercises();
  const [isExpanded, setIsExpanded] = useState(() => {
    const hasNotes = !!(item.notes?.trim() || item.intensity?.trim());
    const hasFeedback = !!item.patientFeedback?.trim();
    return hasNotes || hasFeedback;
  });

  const prevHasContentRef = useRef(false);

  const exerciseFromLibrary = useMemo(() => {
    if (item.type !== "exercise" || !item.exerciseId) return null;
    return libraryExercises?.find(ex => ex.id === item.exerciseId);
  }, [item.exerciseId, item.type, libraryExercises]);

  const thumbSrc =
    item.thumbnail_url ||
    item.image_url ||
    (exerciseFromLibrary ? getBestImageUrl(exerciseFromLibrary) : null);
  const previewFallbackSrcs = exerciseFromLibrary ? getImageUrlCandidates(exerciseFromLibrary) : [];
  const canOpenExerciseModal = item.type === "exercise" && !!exerciseFromLibrary && !!onOpenExercise;

  useEffect(() => {
    const hasNotes = !!(item.notes?.trim() || item.intensity?.trim());
    const hasFeedback = !!item.patientFeedback?.trim();
    const hasContent = hasNotes || hasFeedback;

    if (hasContent && !prevHasContentRef.current) {
      setIsExpanded(true);
    }
    prevHasContentRef.current = hasContent;
  }, [item.notes, item.intensity, item.patientFeedback]);

  const itemDetails = formatItemDetail(item);

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => {
        const row = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "group/item relative flex flex-col rounded-xl border border-l-[4px] overflow-hidden mb-1.5 transition-[border-color,box-shadow,background-color,opacity] duration-200",
              item.completed
                ? "bg-muted/5 border-border/40"
                : "bg-background border-border/60 shadow-sm hover:shadow-md hover:border-slate-300/80",
              isExpanded && "ring-1 ring-primary/20 border-primary/30 shadow-md",
              snapshot.isDragging &&
                "z-[100] bg-background shadow-[0_14px_36px_rgba(15,23,42,0.16)] ring-1 ring-primary/35",
              snapshot.isDragging && "pointer-events-none", // Evita interferência durante o drag
            )}
            style={{
              ...provided.draggableProps.style,
              // Borda esquerda colorida: procedimento = coral/laranja, exercício = verde.
              borderLeftColor: item.type === "exercise" ? "#10b981" : "#f97316",
              // Garante que o width seja mantido quando estiver no portal
              width: snapshot.isDragging
                ? "var(--drag-width)"
                : provided.draggableProps.style?.width,
            }}
          >
            {/* Row Header */}
            <div
              className="flex items-center gap-2 px-2.5 py-1.5"
              ref={(el) => {
                if (el && snapshot.isDragging) {
                  // Captura o width original para usar no portal
                  const parent = el.closest(".droppable-container");
                  if (parent) {
                    const width = parent.getBoundingClientRect().width;
                    document.documentElement.style.setProperty("--drag-width", `${width}px`);
                  }
                }
              }}
            >
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
                  "flex h-7 w-5 shrink-0 items-center justify-center text-muted-foreground/35 transition-colors duration-150",
                  !disabled ? "cursor-grab active:cursor-grabbing hover:text-muted-foreground/60" : "opacity-40",
                )}
                aria-hidden="true"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>

              <Checkbox
                checked={item.completed}
                onCheckedChange={() => handleToggleItem(item.id)}
                disabled={disabled}
                className="h-4 w-4 rounded data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />

              <div
                role="button"
                tabIndex={0}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                onClick={() => setIsExpanded(!isExpanded)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                  }
                }}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                    item.completed &&
                      "text-muted-foreground/70 line-through decoration-muted-foreground/30 font-medium",
                  )}
                >
                  {type === "unified" &&
                    (item.type === "exercise" ? (
                      thumbSrc ? (
                        <div className="h-7 w-7 rounded-md overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/50">
                          <OptimizedImage 
                            src={thumbSrc} 
                            alt={item.name} 
                            className="h-full w-full object-cover"
                            aspectRatio="1:1"
                          />
                        </div>
                      ) : (
                        <Dumbbell className="h-3.5 w-3.5 text-emerald-500/80 shrink-0" />
                      )
                    ) : (
                      <Stethoscope className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    ))}
                  <span className="truncate">{item.name}</span>
                </span>

                {itemDetails.length > 0 && (
                  <div className="flex max-w-[42%] shrink-0 items-center gap-1.5 overflow-hidden">
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
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveItem(item.id)}
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/item:opacity-100 transition-opacity focus-visible:opacity-100"
                  aria-label="Remover"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        {(thumbSrc || canOpenExerciseModal) && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 px-1">
                              <Eye className="h-3 w-3 text-emerald-500" />
                              <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Visual do Exercício
                              </label>
                            </div>

                            {canOpenExerciseModal ? (
                              <button
                                type="button"
                                onClick={() => onOpenExercise?.(exerciseFromLibrary)}
                                className="group relative flex h-[160px] w-full overflow-hidden rounded-2xl border border-emerald-200/60 bg-emerald-50/40 text-left transition-all hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                              >
                                {thumbSrc ? (
                                  <>
                                    <OptimizedImage
                                      src={thumbSrc}
                                      alt={item.name}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                      aspectRatio="1:1"
                                      fallbackSrcs={previewFallbackSrcs}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent p-3">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
                                        <Eye className="h-3 w-3" />
                                        Abrir detalhes
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 to-teal-50 px-4 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                                      <Dumbbell className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold text-slate-800">Abrir exercício</p>
                                      <p className="text-xs text-muted-foreground">
                                        Ver vídeo, descrição e instruções
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </button>
                            ) : thumbSrc ? (
                              <div className="relative flex h-[160px] w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50">
                                <OptimizedImage
                                  src={thumbSrc}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                  aspectRatio="1:1"
                                />
                              </div>
                            ) : null}
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 px-1">
                              <Dumbbell className="h-3 w-3 text-emerald-500" />
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
                              className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-emerald-500/20 text-sm"
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 px-1">
                              <MessageSquare className="h-3 w-3 text-teal-500" />
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
                              className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-teal-500/20 text-sm"
                              disabled={disabled}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-1">
                            Intensidade / Parâmetros
                          </label>
                          <Input
                            value={item.intensity || ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { intensity: e.target.value })
                            }
                            placeholder="Ex: 2.0 J/cm² ou 10mA"
                            className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-orange-500/20 text-sm"
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
                            className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-orange-500/20 text-sm"
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
  variant = "card",
}) => {
  const [newItemName, setNewItemName] = useState("");
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [pendingItemName, setPendingItemName] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [forceHideSuggestions, setForceHideSuggestions] = useState(false);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const [newItemType, setNewItemType] = useState<EvolutionItemType>("procedure");
  const { exercises: libraryExercises } = useExercises();

  const [procedureLibraryOpen, setProcedureLibraryOpen] = useState(false);
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [tempSelectedProcedures, setTempSelectedProcedures] = useState<string[]>([]);
  const [tempSelectedExercises, setTempSelectedExercises] = useState<string[]>([]);
  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (procedureLibraryOpen) {
      setTempSelectedProcedures(
        items.filter((item) => item.type === "procedure").map((item) => item.name)
      );
      setLibrarySearchQuery("");
    }
  }, [procedureLibraryOpen, items]);

  useEffect(() => {
    if (exerciseLibraryOpen) {
      setTempSelectedExercises(
        items.filter((item) => item.type === "exercise" && item.exerciseId).map((item) => item.exerciseId!)
      );
      setLibrarySearchQuery("");
    }
  }, [exerciseLibraryOpen, items]);

  const handleSaveProcedures = () => {
    const existingProcs = items.filter(item => item.type === "procedure");
    const nonProcs = items.filter(item => item.type !== "procedure");
    
    // Build new procedures list
    const newProcs = tempSelectedProcedures.map((name, index) => {
      const existing = existingProcs.find(item => item.name === name);
      if (existing) return existing;
      
      const template = COMMON_PROCEDURES.find(p => p.name === name);
      return {
        id: crypto.randomUUID(),
        name,
        completed: false,
        type: "procedure" as const,
        category: template?.category || "outro",
        order: index,
      };
    });
    
    onChange([...nonProcs, ...newProcs]);
    setProcedureLibraryOpen(false);
  };

  const handleSaveExercises = () => {
    const existingExs = items.filter(item => item.type === "exercise");
    const nonExs = items.filter(item => item.type !== "exercise");
    
    const newExs = tempSelectedExercises.map((id, index) => {
      const existing = existingExs.find(item => item.exerciseId === id);
      if (existing) return existing;
      
      const template = libraryExercises.find(e => e.id === id);
      return {
        id: crypto.randomUUID(),
        name: template?.name || "Exercício",
        completed: false,
        type: "exercise" as const,
        exerciseId: id,
        prescription: `${template?.sets || 3}x${template?.repetitions || 10}`,
        image_url: template?.image_url,
        thumbnail_url: template?.thumbnail_url,
        order: index,
      };
    });
    
    onChange([...nonExs, ...newExs]);
    setExerciseLibraryOpen(false);
  };

  const groupedProcedures = useMemo(() => {
    const filtered = COMMON_PROCEDURES.filter((p) =>
      accentIncludes(p.name, librarySearchQuery)
    );
    
    // Group by category
    const groups: Record<string, typeof COMMON_PROCEDURES> = {};
    filtered.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [librarySearchQuery]);

  const filteredExercises = useMemo(() => {
    return libraryExercises.filter((e) =>
      accentIncludes(e.name, librarySearchQuery)
    );
  }, [libraryExercises, librarySearchQuery]);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset keyboard selection index when user types or changes the active tab type
  useEffect(() => {
    setActiveIndex(-1);
  }, [newItemName, newItemType]);

  // Keep focus option visible on scroll
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isEmbedded = variant === "embedded";

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
    setForceHideSuggestions(true);
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

  const trimmedQuery = newItemName.trim();
  const showProcedureSlot =
    type === "procedure" || (type === "unified" && newItemType === "procedure");
  const showExerciseSlot =
    type === "exercise" || (type === "unified" && newItemType === "exercise");

  const procedureSuggestions = useMemo(() => {
    if (!showProcedureSlot) return [];
    return (
      trimmedQuery
        ? COMMON_PROCEDURES.filter((procedure) => accentIncludes(procedure.name, newItemName))
        : COMMON_PROCEDURES
    ).slice(0, 8);
  }, [newItemName, trimmedQuery, showProcedureSlot]);

  const exerciseSuggestions = useMemo(() => {
    if (!showExerciseSlot) return [];
    return (
      trimmedQuery
        ? libraryExercises.filter((exercise) => accentIncludes(exercise.name, newItemName))
        : libraryExercises
    ).slice(0, 8);
  }, [libraryExercises, newItemName, trimmedQuery, showExerciseSlot]);

  const combinedSuggestions = useMemo(() => {
    const list: CombinedSuggestion[] = [];

    procedureSuggestions.forEach((p) => {
      list.push({ ...p, selectType: "procedure" as const });
    });

    exerciseSuggestions.forEach((e) => {
      list.push({ ...e, selectType: "exercise" as const });
    });

    return list;
  }, [procedureSuggestions, exerciseSuggestions]);

  const hasSuggestions = combinedSuggestions.length > 0;
  const shouldShowSuggestions = hasSuggestions && !forceHideSuggestions && (isInputFocused || trimmedQuery.length > 0);

  const isProcedureSuggestion = (suggestion: CombinedSuggestion): suggestion is ProcedureSuggestion =>
    suggestion.selectType === "procedure";

  // Posiciona o dropdown via portal (escapa de containers com overflow).
  const updateDropdownRect = React.useCallback(() => {
    const el = inputWrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDropdownRect({ top: r.bottom + 6, left: r.left, width: r.width });
  }, []);

  useLayoutEffect(() => {
    if (shouldShowSuggestions) updateDropdownRect();
  }, [shouldShowSuggestions, newItemName, updateDropdownRect]);

  useEffect(() => {
    if (!shouldShowSuggestions) return;
    const handler = () => updateDropdownRect();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [shouldShowSuggestions, updateDropdownRect]);

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

  // Foca o campo de busca (autocomplete) — usado ao alternar Procedimento/Exercício.
  const focusSearchInput = React.useCallback(() => {
    requestAnimationFrame(() => {
      inputWrapRef.current?.querySelector("input")?.focus();
    });
  }, []);

  const selectItemType = React.useCallback(
    (t: EvolutionItemType) => {
      setNewItemType(t);
      focusSearchInput();
    },
    [focusSearchInput],
  );

   // Keyboard shortcuts and navigation inside suggestions
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (shouldShowSuggestions && combinedSuggestions.length > 0) {
       if (e.key === "ArrowDown") {
         e.preventDefault();
         setActiveIndex((prev) => (prev + 1) % combinedSuggestions.length);
         return;
       }
       if (e.key === "ArrowUp") {
         e.preventDefault();
         setActiveIndex((prev) => (prev - 1 + combinedSuggestions.length) % combinedSuggestions.length);
         return;
       }
       if (e.key === "Enter") {
         e.preventDefault();
         // If there's exactly one suggestion, select it automatically
         // Otherwise, use the active index if it's valid, or select the first one if activeIndex is invalid
         if (combinedSuggestions.length === 1) {
           const selected = combinedSuggestions[0];
           if (isProcedureSuggestion(selected)) {
             handleSelectProcedureSuggestion(selected);
           } else {
             handleSelectExerciseSuggestion(selected);
           }
         } else if (activeIndex >= 0 && activeIndex < combinedSuggestions.length) {
           const selected = combinedSuggestions[activeIndex];
           if (isProcedureSuggestion(selected)) {
             handleSelectProcedureSuggestion(selected);
           } else {
             handleSelectExerciseSuggestion(selected);
           }
         } else {
           // Fallback: select first suggestion if no active index
           const selected = combinedSuggestions[0];
           if (isProcedureSuggestion(selected)) {
             handleSelectProcedureSuggestion(selected);
           } else {
             handleSelectExerciseSuggestion(selected);
           }
         }
         setActiveIndex(-1);
         return;
       }
       if (e.key === "Escape") {
         e.preventDefault();
         (e.target as HTMLInputElement).blur();
         setIsInputFocused(false);
         setActiveIndex(-1);
         return;
       }
     }

     if (e.key === "Enter" && !e.shiftKey) {
       e.preventDefault();
       handleAddItem();
     }

     if (e.altKey && e.key.toLowerCase() === "p") {
       e.preventDefault();
       selectItemType("procedure");
     }

     if (e.altKey && e.key.toLowerCase() === "e") {
       e.preventDefault();
       selectItemType("exercise");
     }
   };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 transition-all duration-300",
        isEmbedded
          ? "h-full bg-transparent"
          : "p-5 rounded-3xl border border-border/50 bg-card/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        className,
      )}
    >
      {/* Header */}
      {!isEmbedded && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-2xl transition-colors duration-300",
                iconBg ||
                  (type === "unified"
                    ? "bg-primary/10 text-primary"
                    : type === "exercise"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-teal-500/10 text-teal-700"),
              )}
            >
              {getIcon()}
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-foreground/90">
                {getTitle()}
              </h3>
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
                          ? "from-emerald-500 to-teal-500"
                          : "from-teal-500 to-emerald-500",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </Progress>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Section */}
      {!disabled && (
        <div className="flex flex-col gap-2 mt-2">
          {type === "unified" && (
            <div className="relative flex p-1 bg-slate-100/80 dark:bg-slate-800/40 rounded-full w-fit mb-3 border border-slate-200/50 dark:border-slate-800/50">
              <button
                type="button"
                onClick={() => selectItemType("procedure")}
                className={cn(
                  "relative z-10 flex items-center h-8 pl-4 pr-2.5 rounded-full text-[11px] uppercase font-extrabold tracking-wider transition-colors duration-200",
                  newItemType === "procedure"
                    ? "text-orange-700 dark:text-orange-300"
                    : "text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                Procedimento
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setProcedureLibraryOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setProcedureLibraryOpen(true);
                    }
                  }}
                  className={cn(
                    "ml-2 p-1 rounded-md hover:bg-orange-500/10 transition-colors cursor-pointer",
                    newItemType === "procedure"
                      ? "text-orange-600 dark:text-orange-400 hover:text-orange-700"
                      : "text-muted-foreground hover:text-slate-800"
                  )}
                  title="Abrir biblioteca de procedimentos"
                >
                  <BookOpen className="h-3 w-3" />
                </span>
                {newItemType === "procedure" && (
                  <motion.div
                    layoutId="activeTabBackground"
                    className="absolute inset-0 bg-white dark:bg-slate-950 shadow-sm rounded-full -z-10 border border-orange-200/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => selectItemType("exercise")}
                className={cn(
                  "relative z-10 flex items-center h-8 pl-4 pr-2.5 rounded-full text-[11px] uppercase font-extrabold tracking-wider transition-colors duration-200",
                  newItemType === "exercise"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
                Exercício
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExerciseLibraryOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setExerciseLibraryOpen(true);
                    }
                  }}
                  className={cn(
                    "ml-2 p-1 rounded-md hover:bg-emerald-500/10 transition-colors cursor-pointer",
                    newItemType === "exercise"
                      ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                      : "text-muted-foreground hover:text-slate-800"
                  )}
                  title="Abrir biblioteca de exercícios"
                >
                  <BookOpen className="h-3 w-3" />
                </span>
                {newItemType === "exercise" && (
                  <motion.div
                    layoutId="activeTabBackground"
                    className="absolute inset-0 bg-white dark:bg-slate-950 shadow-sm rounded-full -z-10 border border-emerald-200/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>
          )}
          <div ref={inputWrapRef} className="relative flex items-center group/input">
            <Input
              data-evolution-input={type}
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value);
                setForceHideSuggestions(false);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsInputFocused(true);
                setForceHideSuggestions(false);
              }}
              onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
              placeholder={
                placeholder ||
                (type === "unified"
                  ? newItemType === "exercise"
                    ? "Adicionar exercício..."
                    : "Adicionar procedimento..."
                  : defaultPlaceholder)
              }
              className={cn(
                "pl-10 pr-12 h-12 rounded-2xl bg-muted/30 border-border/50 transition-all",
                (type === "unified" ? newItemType : type) === "exercise"
                  ? "focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30"
                  : "focus-visible:ring-orange-500/20 focus-visible:border-orange-500/30"
              )}
            />
            <Plus
              className={cn(
                "absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors",
                (type === "unified" ? newItemType : type) === "exercise"
                  ? "group-focus-within/input:text-emerald-500"
                  : "group-focus-within/input:text-orange-500"
              )}
            />

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
                className={cn(
                  "h-9 w-9 rounded-xl transition-colors",
                  (type === "unified" ? newItemType : type) === "exercise"
                    ? "hover:bg-emerald-500/10 hover:text-emerald-600 text-emerald-600 disabled:opacity-50"
                    : "hover:bg-orange-500/10 hover:text-orange-600 text-orange-600 disabled:opacity-50"
                )}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Smart Suggestions Dropdown (portal — escapa de overflow) */}
            {shouldShowSuggestions &&
              dropdownRect &&
              createPortal(
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  style={{
                    position: "fixed",
                    top: dropdownRect.top,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                  }}
                  // mousedown antes do blur do input para não fechar antes do clique
                  onMouseDown={(e) => e.preventDefault()}
                  className="z-[100] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-background max-h-[320px] overflow-y-auto scroll-smooth"
                >
                  <div className="px-2 py-1.5 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      {trimmedQuery ? "Resultados" : "Sugestões da biblioteca"}
                    </span>
                  </div>
                  {procedureSuggestions.map((s, idx) => {
                    const isSuggestionActive = activeIndex === idx;
                    return (
                      <button
                        key={s.name}
                        data-index={idx}
                        onClick={() => handleSelectProcedureSuggestion(s)}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl text-sm transition-all group/sug text-left",
                          isSuggestionActive
                            ? "bg-slate-100 dark:bg-slate-800 text-primary"
                            : "hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-1.5 rounded-lg", CATEGORY_COLORS[s.category])}>
                            <Stethoscope className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{s.name}</span>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover/sug:text-primary opacity-0 group-hover/sug:opacity-100 transition-all" />
                      </button>
                    );
                  })}
                  {exerciseSuggestions.map((exercise, idx) => {
                    const globalIdx = procedureSuggestions.length + idx;
                    const isSuggestionActive = activeIndex === globalIdx;
                    const hasThumbnail = !!(exercise.thumbnail_url || exercise.image_url);
                    return (
                      <button
                        key={exercise.id}
                        data-index={globalIdx}
                        onClick={() => handleSelectExerciseSuggestion(exercise)}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl text-sm transition-all group/sug text-left",
                          isSuggestionActive
                            ? "bg-slate-100 dark:bg-slate-800 text-primary"
                            : "hover:bg-primary/5"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {hasThumbnail ? (
                            <img
                              src={exercise.thumbnail_url || exercise.image_url}
                              alt={exercise.name}
                              className="h-8 w-8 rounded-lg object-cover cursor-zoom-in border border-slate-200/50 hover:scale-105 active:scale-95 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation(); // Evita adicionar o exercício ao clicar na imagem
                                setPreviewImage({
                                  url: exercise.image_url || exercise.thumbnail_url || "",
                                  title: exercise.name,
                                });
                              }}
                            />
                          ) : (
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 shrink-0">
                              <Dumbbell className="h-3.5 w-3.5" />
                            </div>
                          )}
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
                    );
                  })}
                </motion.div>,
                document.body,
              )}
          </div>
        </div>
      )}

      {/* Items List with DND and Animations */}
      <div className={cn("mt-2", isEmbedded && "flex min-h-0 flex-1 flex-col")}>
        {isEmbedded && totalCount > 0 && (
          <div className="flex items-center justify-between px-1.5 py-2 mb-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-wider">
              Conclusão da sessão: {completedCount} de {totalCount} itens
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{Math.round(progress)}%</span>
              <div className="h-1.5 w-24 bg-slate-200 dark:bg-slate-800 overflow-hidden rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="evolution-items">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={cn("space-y-1.5 droppable-container", isEmbedded && "flex min-h-0 flex-1 flex-col")}
              >
                {items.length === 0 ? (
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center px-4 py-10 transition-all duration-300",
                      isEmbedded
                        ? "min-h-[300px] flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 dark:border-slate-800"
                        : "rounded-2xl border border-dashed border-border/60 bg-muted/10",
                    )}
                  >
                    <div className="p-3 rounded-full bg-muted/20 mb-3 animate-pulse">
                      <Activity className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground font-semibold text-center">
                      Nenhum item adicionado à sessão
                    </p>
                    <p className="text-xs text-muted-foreground/60 text-center mt-1 max-w-[240px]">
                      Use o campo acima para incluir procedimentos ou exercícios terapêuticos.
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
                        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary/70 hover:text-primary transition-colors underline-offset-2 hover:underline"
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
                      handleToggleItem={handleToggleItem}
                      handleRemoveItem={handleRemoveItem}
                      handleUpdateItem={handleUpdateItem}
                      onOpenExercise={setViewExercise}
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
          {(() => {
            const itemKind =
              (type === "unified" ? newItemType : type) === "exercise" ? "exercício" : "procedimento";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    {itemKind === "exercício" ? "Exercício" : "Procedimento"} não encontrado
                  </DialogTitle>
                  <DialogDescription>
                    “{pendingItemName}” não está na biblioteca. Você pode adicioná-lo{" "}
                    <strong>somente a esta conduta</strong>, sem cadastrar na biblioteca de{" "}
                    {itemKind === "exercício" ? "exercícios" : "procedimentos"} — ou ajustar o texto.
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
                    Adicionar à conduta
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Procedure Library Modal */}
      <Dialog open={procedureLibraryOpen} onOpenChange={setProcedureLibraryOpen}>
        <DialogContent className="max-w-3xl rounded-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <BookOpen className="h-5 w-5" />
              Biblioteca de Procedimentos
            </DialogTitle>
            <DialogDescription>
              Selecione os procedimentos realizados nesta sessão para adicioná-los à conduta do paciente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar procedimentos..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {Object.keys(groupedProcedures).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum procedimento encontrado
              </div>
            ) : (
              Object.entries(groupedProcedures).map(([category, procs]) => (
                <div key={category} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                      CATEGORY_COLORS[category] || CATEGORY_COLORS.outro
                    )}>
                      {CATEGORY_LABELS[category] || category}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {procs.map((proc) => {
                      const isSelected = tempSelectedProcedures.includes(proc.name);
                      return (
                        <div
                          key={proc.name}
                          onClick={() => {
                            if (isSelected) {
                              setTempSelectedProcedures(tempSelectedProcedures.filter(name => name !== proc.name));
                            } else {
                              setTempSelectedProcedures([...tempSelectedProcedures, proc.name]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all duration-200 select-none",
                            isSelected
                              ? "bg-orange-500/5 border-orange-500/30 text-orange-950 dark:text-orange-200"
                              : "bg-background border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/30"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}} // handled by onClick on wrapper
                            className="rounded border-slate-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <span className="text-xs font-semibold leading-none">{proc.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
            <Button variant="outline" onClick={() => setProcedureLibraryOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSaveProcedures} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl">
              Adicionar à Conduta ({tempSelectedProcedures.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Library Modal */}
      <Dialog open={exerciseLibraryOpen} onOpenChange={setExerciseLibraryOpen}>
        <DialogContent className="max-w-3xl rounded-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="h-5 w-5" />
              Biblioteca de Exercícios
            </DialogTitle>
            <DialogDescription>
              Selecione os exercícios prescritos para esta sessão para adicioná-los à conduta do paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercícios..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {filteredExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum exercício encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredExercises.map((ex) => {
                  const isSelected = tempSelectedExercises.includes(ex.id);
                  const thumbSrc = getBestImageUrl(ex);
                  return (
                    <div
                      key={ex.id}
                      onClick={() => {
                        if (isSelected) {
                          setTempSelectedExercises(tempSelectedExercises.filter(id => id !== ex.id));
                        } else {
                          setTempSelectedExercises([...tempSelectedExercises, ex.id]);
                        }
                      }}
                      className={cn(
                        "group flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all duration-200 select-none",
                        isSelected
                          ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                          : "bg-background border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/30"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}} // handled by onClick on wrapper
                        className="rounded border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      
                      {/* Thumbnail */}
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200/50">
                        {thumbSrc ? (
                          <OptimizedImage
                            src={thumbSrc}
                            alt={ex.name}
                            className="h-full w-full object-cover"
                            aspectRatio="1:1"
                            fallbackSrcs={getImageUrlCandidates(ex)}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Dumbbell className="h-4 w-4 text-slate-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold leading-none truncate">{ex.name}</span>
                        {ex.category && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {ex.category}
                          </span>
                        )}
                      </div>

                      {/* View Details Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewExercise(ex);
                        }}
                      >
                        <Eye className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
            <Button variant="outline" onClick={() => setExerciseLibraryOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSaveExercises} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              Adicionar à Conduta ({tempSelectedExercises.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 rounded-2xl overflow-hidden bg-slate-950 border-none flex flex-col items-center justify-center">
          {previewImage && (
            <div className="relative w-full flex flex-col">
              <div className="flex justify-between items-center px-4 py-3 text-white bg-slate-900 border-b border-slate-800/80 rounded-t-2xl">
                <span className="text-sm font-semibold truncate mr-4">{previewImage.title}</span>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center bg-slate-950 max-h-[70vh]">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-xl shadow-2xl"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exercise View Modal */}
      {viewExercise && (
        <ExerciseViewModal
          exercise={viewExercise}
          open={!!viewExercise}
          onOpenChange={(open) => !open && setViewExercise(null)}
        />
      )}
    </div>
  );
};
