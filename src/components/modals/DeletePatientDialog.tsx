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
import { Archive, Loader2 } from "lucide-react";

interface DeletePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName?: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeletePatientDialog: React.FC<DeletePatientDialogProps> = ({
  open,
  onOpenChange,
  patientName,
  onConfirm,
  isDeleting = false,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar paciente</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja arquivar o paciente{" "}
            <span className="font-semibold text-foreground">{patientName}</span>
            ?
            <br />
            <br />
            O paciente ficará inativo e não aparecerá nas listagens. Todos os dados e histórico
            clínico serão <strong>preservados</strong> conforme a legislação (CFisio / LGPD).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Arquivando...
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar Paciente
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePatientDialog;
