import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDeletePatient, usePatient } from '@/hooks/usePatientCrud';
import { PatientHelpers } from '@/types';

interface PatientDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

export const PatientDeleteDialog: React.FC<PatientDeleteDialogProps> = ({
  open,
  onOpenChange,
  patientId,
}) => {
  const { data: patient } = usePatient(patientId);
  const deleteMutation = useDeletePatient();

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(patientId);
    onOpenChange(false);
  };

  const patientName = patient ? PatientHelpers.getName(patient) : 'este paciente';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Excluir Paciente</AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="py-4">
          Tem certeza que deseja excluir permanentemente o paciente{' '}
          <span className="font-semibold text-foreground">"{patientName}"</span>?
          <br />
          <br />
          <strong className="text-destructive">Atenção:</strong> Esta ação não pode ser desfeita.
          Todos os dados do paciente serão removidos permanentemente, incluindo:
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Perfil e informações pessoais</li>
            <li>Histórico de atendimentos e evoluções</li>
            <li>Registros SOAP (anotações clínicas)</li>
            <li>Agendamentos futuros</li>
            <li>Documentos e anexos</li>
            <li>Registros financeiros</li>
          </ul>
        </AlertDialogDescription>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid={`patient-delete-confirm-${patientId}`}
            data-patient-id={patientId}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Sim, Excluir Permanentemente
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PatientDeleteDialog;
