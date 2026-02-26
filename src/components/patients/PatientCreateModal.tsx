import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus } from 'lucide-react';
import { PatientForm } from './PatientForm';
import { useCreatePatient, type PatientCreateInput } from '@/hooks/usePatientCrud';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Loader2 } from 'lucide-react';

interface PatientCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PatientCreateModal: React.FC<PatientCreateModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { currentOrganization, isCurrentOrgLoading, currentOrgError } = useOrganizations();
  const createMutation = useCreatePatient();

  const handleSubmit = async (data: PatientCreateInput) => {
    if (!currentOrganization?.id) {
      console.error('[PatientCreateModal] Missing organization on submit');
      throw new Error('Organização não encontrada');
    }
    console.info('[PatientCreateModal] Creating patient', {
      organization_id: data.organization_id,
      full_name: data.full_name,
    });
    await createMutation.mutateAsync(data);
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 transform !-translate-x-1/2 !-translate-y-1/2 w-full max-w-4xl max-h-[85vh] p-0 shadow-2xl rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Novo Paciente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do paciente. Os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(85vh-120px)]" data-testid="patient-form">
          {isCurrentOrgLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Carregando organização...</p>
                </div>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Por favor, aguarde enquanto sua organização é carregada.
                </p>
              </div>
            </div>
          ) : currentOrgError || !currentOrganization?.id ? (
            <div className="bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 text-center">
              <p className="font-medium">Erro ao carregar organização</p>
              <p className="text-sm opacity-80 mt-1">
                Não foi possível identificar sua organização atual.
                {currentOrgError && ` Erro: ${currentOrgError.message}`}
              </p>
              <p className="text-sm opacity-80 mt-1">
                Verifique se você está logado e se sua conta está associada a uma organização.
              </p>
            </div>
          ) : (
            <PatientForm
              organizationId={currentOrganization.id}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              submitLabel="Cadastrar Paciente"
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PatientCreateModal;
