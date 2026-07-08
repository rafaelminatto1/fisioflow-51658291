import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Dumbbell,
  ListOrdered,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExerciseItem, ProcedureItem } from "@/types/evolution";

type SequenceType = "procedure" | "exercise";

type SequencedProcedure = ProcedureItem & {
  order?: number;
};

type SequencedExercise = ExerciseItem & {
  order?: number;
  observations?: string;
};

type SequenceEntry =
  | {
      key: string;
      type: "procedure";
      item: SequencedProcedure;
    }
  | {
      key: string;
      type: "exercise";
      item: SequencedExercise;
    };

interface SessionSequenceBlockProps {
  procedures: ProcedureItem[];
  exercises: ExerciseItem[];
  onChange: (next: { procedures: ProcedureItem[]; exercises: ExerciseItem[] }) => void;
  disabled?: boolean;
}

const TYPE_LABELS: Record<SequenceType, string> = {
  procedure: "Procedimento",
  exercise: "Exercício",
};

const PROCEDURE_CATEGORY_LABELS: Record<string, string> = {
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

const readOrder = (item: { sequenceOrder?: number; order?: number }) => {
  if (typeof item.sequenceOrder === "number") return item.sequenceOrder;
  if (typeof item.order === "number") return item.order;
  return undefined;
};

const buildSequence = (procedures: ProcedureItem[], exercises: ExerciseItem[]): SequenceEntry[] => {
  const entries: SequenceEntry[] = [
    ...procedures.map((item) => ({
      key: `procedure:${item.id}`,
      type: "procedure" as const,
      item: item as SequencedProcedure,
    })),
    ...exercises.map((item) => ({
      key: `exercise:${item.id}`,
      type: "exercise" as const,
      item: item as SequencedExercise,
    })),
  ];

  return entries
    .map((entry, fallbackIndex) => ({
      entry,
      sortOrder: readOrder(entry.item) ?? Number.MAX_SAFE_INTEGER + fallbackIndex,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ entry }) => entry);
};

const withSequenceOrder = <T extends { sequenceOrder?: number; order?: number }>(
  item: T,
  sequenceOrder: number,
): T => ({
  ...item,
  sequenceOrder,
  order: sequenceOrder,
});

export function normalizeInterventionSequence(
  procedures: ProcedureItem[],
  exercises: ExerciseItem[],
) {
  const sequence = buildSequence(procedures, exercises);
  return splitSequence(sequence);
}

function splitSequence(sequence: SequenceEntry[]) {
  const procedures: ProcedureItem[] = [];
  const exercises: ExerciseItem[] = [];

  sequence.forEach((entry, index) => {
    const nextItem = withSequenceOrder(entry.item, index + 1);
    if (entry.type === "procedure") procedures.push(nextItem);
    else exercises.push(nextItem);
  });

  return { procedures, exercises };
}

function getExerciseDetail(exercise: SequencedExercise) {
  if (exercise.prescription) return exercise.prescription;
  if (exercise.sets && exercise.reps) return `${exercise.sets}x${exercise.reps}`;
  if (exercise.duration) return exercise.duration;
  return null;
}

function getProcedureCategory(procedure: SequencedProcedure) {
  if (!procedure.category || procedure.category === "outro") return null;
  return PROCEDURE_CATEGORY_LABELS[procedure.category] ?? procedure.category;
}

interface SequenceRowProps {
  entry: SequenceEntry;
  index: number;
  total: number;
  disabled: boolean;
  onToggle: (key: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (key: string) => void;
}

function SequenceRow({
  entry,
  index,
  total,
  disabled,
  onToggle,
  onMove,
  onRemove,
}: SequenceRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.key,
    disabled,
  });
  const isProcedure = entry.type === "procedure";
  const detail = isProcedure ? null : getExerciseDetail(entry.item);
  const category = isProcedure ? getProcedureCategory(entry.item) : null;
  const notes =
    entry.type === "procedure" ? entry.item.notes : entry.item.notes || entry.item.observations;
  const stopDragFromControl = (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };
  const stopKeyboardDragFromControl = (event: React.KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("touch-none", isDragging && "relative z-10")}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "group flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-2.5 transition-[border-color,background-color,box-shadow,opacity]",
          disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
          "hover:border-border/60 hover:bg-muted/30",
          entry.item.completed && "opacity-60",
          isDragging &&
            "border-primary/30 bg-background opacity-90 shadow-lg ring-1 ring-primary/20",
        )}
        aria-label={`Arrastar ${TYPE_LABELS[entry.type].toLowerCase()} ${entry.item.name}`}
      >
        <span className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
          {index + 1}
        </span>

        <button
          type="button"
          onClick={() => onToggle(entry.key)}
          onPointerDown={stopDragFromControl}
          onKeyDown={stopKeyboardDragFromControl}
          disabled={disabled}
          className="shrink-0 rounded-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={entry.item.completed ? "Marcar como pendente" : "Marcar como concluído"}
        >
          {entry.item.completed ? (
            <CheckCircle2
              className={cn("h-5 w-5", isProcedure ? "text-emerald-600" : "text-blue-600")}
            />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/45" />
          )}
        </button>

        <div className="min-w-0 flex-1 select-none">
          <div className="flex min-w-0 items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "h-5 shrink-0 rounded-md px-1.5 text-[9px] font-semibold",
                isProcedure
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700",
              )}
            >
              {isProcedure ? (
                <Activity className="mr-1 h-3 w-3" />
              ) : (
                <Dumbbell className="mr-1 h-3 w-3" />
              )}
              {TYPE_LABELS[entry.type]}
            </Badge>
            <span
              className={cn(
                "truncate text-sm font-medium"
              )}
            >
              {entry.item.name}
            </span>
          </div>

          {(detail || category || notes) && (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {detail && <span className="font-mono">{detail}</span>}
              {category && <span>{category}</span>}
              {notes && <span className="max-w-full truncate">{notes}</span>}
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5"
          onPointerDown={stopDragFromControl}
          onKeyDown={stopKeyboardDragFromControl}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => onMove(index, -1)}
            disabled={disabled || index === 0}
            aria-label="Mover etapa para cima"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => onMove(index, 1)}
            disabled={disabled || index === total - 1}
            aria-label="Mover etapa para baixo"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(entry.key)}
            disabled={disabled}
            aria-label="Remover etapa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SessionSequenceBlock({
  procedures,
  exercises,
  onChange,
  disabled = false,
}: SessionSequenceBlockProps) {
  const sequence = buildSequence(procedures, exercises);
  const completedCount = sequence.filter((entry) => entry.item.completed).length;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commitSequence = (nextSequence: SequenceEntry[]) => {
    onChange(splitSequence(nextSequence));
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sequence.length) return;

    const nextSequence = [...sequence];
    const [moved] = nextSequence.splice(index, 1);
    nextSequence.splice(targetIndex, 0, moved);
    commitSequence(nextSequence);
  };

  const toggleEntry = (key: string) => {
    commitSequence(
      sequence.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              item: {
                ...entry.item,
                completed: !entry.item.completed,
              },
            }
          : entry,
      ),
    );
  };

  const removeEntry = (key: string) => {
    commitSequence(sequence.filter((entry) => entry.key !== key));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = sequence.findIndex((entry) => entry.key === active.id);
    const overIndex = sequence.findIndex((entry) => entry.key === over.id);
    if (activeIndex < 0 || overIndex < 0) return;

    const nextSequence = [...sequence];
    const [moved] = nextSequence.splice(activeIndex, 1);
    nextSequence.splice(overIndex, 0, moved);
    commitSequence(nextSequence);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-3 p-3.5 border-b border-border/40 bg-gradient-to-r from-emerald-500/5 to-blue-500/5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-background border border-border/60">
            <ListOrdered className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Sequência da sessão</h3>
            {sequence.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {completedCount} de {sequence.length} concluídos
              </span>
            )}
          </div>
        </div>
        {sequence.length > 0 && (
          <Badge variant="outline" className="h-6 shrink-0 rounded-md text-[10px]">
            {sequence.length} etapas
          </Badge>
        )}
      </div>

      <div className="p-3">
        {sequence.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
              <ListOrdered className="h-7 w-7 opacity-35" />
            </div>
            <p className="text-sm font-medium">Nenhum item na sequência</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sequence.map((entry) => entry.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {sequence.map((entry, index) => (
                  <SequenceRow
                    key={entry.key}
                    entry={entry}
                    index={index}
                    total={sequence.length}
                    disabled={disabled}
                    onToggle={toggleEntry}
                    onMove={moveEntry}
                    onRemove={removeEntry}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
