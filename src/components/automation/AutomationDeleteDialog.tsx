/**
 * AutomationDeleteDialog - Confirmação de exclusão de automação.
 */

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { buttonVariants } from "@/lib/ui-variants";
import { cn } from "@/lib/utils";

import type { AutomationRecord } from "@/api/v2";
import { useDeleteAutomation } from "@/hooks/useAutomations";

interface AutomationDeleteDialogProps {
  automation: AutomationRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutomationDeleteDialog({
  automation,
  open,
  onOpenChange,
}: AutomationDeleteDialogProps) {
  const deleteMut = useDeleteAutomation();

  const handleConfirm = async () => {
    if (!automation) return;
    try {
      await deleteMut.mutateAsync(automation.id);
      toast.success("Automação excluída.");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao excluir automação.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{automation?.name}</strong>? Esta ação não pode
            ser desfeita. O histórico de execuções (logs) será mantido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={deleteMut.isPending}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AutomationDeleteDialog;
