import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, BookOpen, ShieldAlert } from "lucide-react";
import { Exercise } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ContraindicationAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise;
  conflicts: string[];
  onConfirm: () => void;
}

export function ContraindicationAlert({
  open,
  onOpenChange,
  exercise,
  conflicts,
  onConfirm,
}: ContraindicationAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-rose-200">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <div className="p-2 bg-rose-50 rounded-full">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              Alerta de Contraindicação
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            <p className="text-sm text-foreground">
              O exercício <span className="font-bold">"{exercise.name}"</span> possui
              contraindicações clínicas para as seguintes condições detectadas no prontuário:
            </p>

            <div className="flex flex-wrap gap-2 py-2">
              {conflicts.map((conflict, i) => (
                <Badge
                  key={i}
                  variant="destructive"
                  className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200"
                >
                  {conflict}
                </Badge>
              ))}
            </div>

            {exercise.precaution_notes && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs">
                <div className="flex items-center gap-1 font-semibold mb-1">
                  <AlertTriangle className="h-3 w-3" /> Notas de Precaução:
                </div>
                {exercise.precaution_notes}
              </div>
            )}

            {exercise.scientific_references && exercise.scientific_references.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Baseado em evidências:
                </p>
                {exercise.scientific_references.map((ref, i) => (
                  <div
                    key={i}
                    className="text-[11px] text-muted-foreground border-l-2 border-primary/20 pl-2"
                  >
                    <span className="font-medium">{ref.title}</span> ({ref.year})
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground italic border-t pt-4">
              Deseja prosseguir com a prescrição mesmo assim? O sistema registrará esta decisão
              baseada no seu julgamento clínico.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
          >
            Prescrever mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
