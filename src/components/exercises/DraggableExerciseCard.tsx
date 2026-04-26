import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Exercise } from "@/types";
import { GripVertical } from "lucide-react";

interface DraggableExerciseCardProps {
  exercise: Exercise;
}

export function DraggableExerciseCard({ exercise }: DraggableExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: exercise.id,
    data: exercise,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="mb-2">
      <Card className="hover:border-primary transition-colors border-dashed">
        <CardContent className="p-3 flex items-center gap-3">
          <GripVertical className="text-muted-foreground w-4 h-4" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{exercise.name}</h4>
            <p className="text-xs text-muted-foreground">{exercise.category}</p>
          </div>
          {exercise.thumbnail_url && (
            <img
              src={exercise.thumbnail_url}
              alt={exercise.name}
              className="w-10 h-10 rounded object-cover bg-muted"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
