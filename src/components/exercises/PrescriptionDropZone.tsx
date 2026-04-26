import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { usePrescriptionStore } from "@/store/usePrescriptionStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, PlusCircle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PrescriptionDropZone() {
  const { activeExercises, removeExercise, clearPrescription } = usePrescriptionStore();
  const { setNodeRef, isOver } = useDroppable({
    id: "prescription-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full rounded-lg border-2 border-dashed transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      <div className="p-4 border-b flex justify-between items-center bg-background/50">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Nova Prescrição
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            {activeExercises.length}
          </span>
        </h3>
        {activeExercises.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearPrescription}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Limpar
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {activeExercises.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
            <PlusCircle
              className={`w-12 h-12 ${isOver ? "text-primary" : "text-muted-foreground"} transition-colors`}
            />
            <div>
              <p className="font-medium">Arraste exercícios para cá</p>
              <p className="text-sm text-muted-foreground">
                Sua prescrição será montada automaticamente
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeExercises.map((exercise) => (
              <Card
                key={exercise.id}
                className="relative group overflow-hidden border-solid shadow-sm"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{exercise.name}</h4>
                      <p className="text-xs text-muted-foreground">{exercise.category}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(exercise.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {activeExercises.length > 0 && (
        <div className="p-4 border-t bg-background/50">
          <Button className="w-full gap-2">Finalizar Prescrição</Button>
        </div>
      )}
    </div>
  );
}
