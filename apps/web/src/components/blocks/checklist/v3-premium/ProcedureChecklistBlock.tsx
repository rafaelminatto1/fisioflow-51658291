import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  GripVertical,
  Plus,
  X,
  ChevronRight,
  LayoutList,
  Sparkles,
  Command,
  Trash2,
  MoreVertical,
  Check,
} from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import confetti from "canvas-confetti";
import { toast } from "sonner";

// --- Types ---

interface Step {
  id: string;
  text: string;
  completed: boolean;
  isNew?: boolean;
}

interface ProcedureChecklistBlockProps {
  initialSteps?: Step[];
  title?: string;
  onUpdate?: (steps: Step[]) => void;
}

// --- Sortable Item Component ---

interface SortableItemProps {
  step: Step;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  isDragging?: boolean;
}

const SortableItem = ({ step, onToggle, onRemove, onEdit }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.6 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(step.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== step.text) {
      onEdit(step.id, editValue.trim());
    } else {
      setEditValue(step.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBlur();
    if (e.key === "Escape") {
      setEditValue(step.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
        isDragging
          ? "bg-blue-50/50 border-2 border-blue-200 shadow-lg scale-[1.02]"
          : "bg-white/40 hover:bg-white/80 border border-transparent hover:border-slate-200/50 hover:shadow-sm"
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors rounded-md hover:bg-slate-100"
      >
        <GripVertical size={18} />
      </button>

      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle(step.id)}
        className={`flex-shrink-0 transition-colors ${
          step.completed ? "text-blue-500" : "text-slate-300 hover:text-slate-400"
        }`}
      >
        {step.completed ? (
          <CheckCircle2 size={22} fill="currentColor" className="text-white fill-blue-500" />
        ) : (
          <Circle size={22} />
        )}
      </motion.button>

      {/* Content */}
      <div className="flex-grow min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-b border-blue-500 focus:outline-none py-0.5 text-slate-700"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`block truncate text-sm font-medium transition-all duration-300 cursor-text ${
              step.completed ? "text-slate-400 line-through" : "text-slate-700"
            }`}
          >
            {step.text}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onRemove(step.id)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Excluir passo"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// --- Main Block Component ---

export const ProcedureChecklistBlock = ({
  initialSteps = [],
  title = "Checklist do Procedimento",
  onUpdate,
}: ProcedureChecklistBlockProps) => {
  const [steps, setSteps] = useState<Step[]>(
    initialSteps.length > 0
      ? initialSteps
      : [
          { id: "1", text: "Preparação do ambiente e materiais", completed: false },
          { id: "2", text: "Higienização das mãos e EPIs", completed: false },
          { id: "3", text: "Explicação do procedimento ao paciente", completed: false },
        ],
  );
  const [newStepText, setNewStepText] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const completedCount = useMemo(() => steps.filter((s) => s.completed).length, [steps]);
  const progress = useMemo(
    () => (steps.length > 0 ? (completedCount / steps.length) * 100 : 0),
    [completedCount, steps.length],
  );

  useEffect(() => {
    if (progress === 100 && steps.length > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#60a5fa", "#93c5fd"],
      });
      toast.success("Procedimento concluído com sucesso!");
    }
    onUpdate?.(steps);
  }, [progress, steps, onUpdate]);

  const handleAddStep = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newStepText.trim()) return;

    const newStep: Step = {
      id: Math.random().toString(36).substr(2, 9),
      text: newStepText.trim(),
      completed: false,
      isNew: true,
    };

    setSteps([...steps, newStep]);
    setNewStepText("");
    toast.info("Passo adicionado");
  };

  const handleToggleStep = (id: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleEditStep = (id: string, text: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8">
      {/* Main Glass Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-[2rem] p-6 md:p-8"
      >
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-100/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                <LayoutList size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Protocolo Clínico
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-100/50 rounded-full border border-slate-200/50">
              <Command size={12} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                CMD + K
              </span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-slate-600">
                {completedCount} de {steps.length} concluídos
              </span>
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg text-xs">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="relative mb-8 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <AnimatePresence initial={false}>
                {steps.map((step) => (
                  <motion.div
                    key={step.id}
                    layout
                    initial={step.isNew ? { opacity: 0, x: -20 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <SortableItem
                      step={step}
                      onToggle={handleToggleStep}
                      onRemove={handleRemoveStep}
                      onEdit={handleEditStep}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>

          {steps.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl"
            >
              <div className="inline-flex p-3 bg-slate-50 rounded-full text-slate-300 mb-3">
                <Sparkles size={24} />
              </div>
              <p className="text-sm text-slate-400 font-medium">Nenhum passo definido ainda.</p>
              <button
                onClick={() => handleAddStep()}
                className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider"
              >
                Adicionar primeiro passo
              </button>
            </motion.div>
          )}
        </div>

        {/* Add Step Input */}
        <form onSubmit={handleAddStep} className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Plus size={20} />
          </div>
          <input
            type="text"
            placeholder="Adicionar novo passo..."
            value={newStepText}
            onChange={(e) => setNewStepText(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-2xl text-sm font-medium transition-all placeholder:text-slate-400"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!newStepText.trim()}
            className="absolute right-3 top-2 bottom-2 px-4 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors disabled:opacity-0 disabled:scale-90"
          >
            <Check size={18} strokeWidth={3} />
          </motion.button>
        </form>

        {/* Footer shortcuts */}
        <div className="mt-8 pt-6 border-t border-slate-100/50 flex flex-wrap gap-4 items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded shadow-sm">
              ESPAÇO
            </kbd>
            <span>Marcar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded shadow-sm">
              ENTER
            </kbd>
            <span>Editar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded shadow-sm">
              ESC
            </kbd>
            <span>Cancelar</span>
          </div>
        </div>
      </motion.div>

      {/* Floating Action Hint */}
      <AnimatePresence>
        {progress > 0 && progress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-slate-900 text-white rounded-full shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">
              Procedimento em andamento
            </span>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <span className="text-xs font-medium text-slate-400">
              Faltam {steps.length - completedCount} passos
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProcedureChecklistBlock;
