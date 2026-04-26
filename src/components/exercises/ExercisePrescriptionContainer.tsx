import React from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { ExerciseShelf } from "./ExerciseShelf";
import { PrescriptionDropZone } from "./PrescriptionDropZone";
import { usePrescriptionStore } from "@/store/usePrescriptionStore";
import { Exercise } from "@/types";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical } from "lucide-react";

export function ExercisePrescriptionContainer() {
  const { addExercise } = usePrescriptionStore();
  const [activeItem, setActiveItem] = useState<Exercise | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current as Exercise);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;

    if (over && over.id === "prescription-drop-zone") {
      const exercise = event.active.data.current as Exercise;
      addExercise(exercise);
    }

    setActiveItem(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Prateleira Lateral */}
        <div className="md:col-span-4 h-full">
          <ExerciseShelf />
        </div>

        {/* Zona de Drop Central */}
        <div className="md:col-span-8 h-full">
          <PrescriptionDropZone />
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <Card className="w-[300px] border-primary shadow-lg ring-2 ring-primary/20">
            <CardContent className="p-3 flex items-center gap-3">
              <GripVertical className="text-primary w-4 h-4" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{activeItem.name}</h4>
                <p className="text-xs text-muted-foreground">{activeItem.category}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
