import React from 'react';
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
  const { currentOrganization } = useOrganizations();
  const createMutation = useCreatePatient();

  const handleSubmit = async (data: PatientCreateInput) => {
    if (!currentOrganization?.id) {
      throw new Error('Organização não encontrada');
    }
    await createMutation.mutateAsync(data);
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Novo Paciente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do paciente. Os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-120px)]">
          {currentOrganization?.id ? (
            <PatientForm
              organizationId={currentOrganization.id}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              submitLabel="Cadastrar Paciente"
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Carregando organização...</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PatientCreateModal;
