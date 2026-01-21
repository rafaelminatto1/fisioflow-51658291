import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Edit, Loader2 } from 'lucide-react';
import { PatientForm } from './PatientForm';
import { useUpdatePatient, usePatient, type PatientUpdateInput } from '@/hooks/usePatientCrud';
import { useOrganizations } from '@/hooks/useOrganizations';

interface PatientEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

export const PatientEditModal: React.FC<PatientEditModalProps> = ({
  open,
  onOpenChange,
  patientId,
}) => {
  const { currentOrganization } = useOrganizations();
  const { data: patient, isLoading } = usePatient(patientId);
  const updateMutation = useUpdatePatient();

  const handleSubmit = async (data: PatientUpdateInput) => {
    if (!currentOrganization?.id) {
      throw new Error('Organização não encontrada');
    }
    await updateMutation.mutateAsync({
      id: patientId,
      data,
    });
    onOpenChange(false);
  };

  // Close modal if no organization
  if (!currentOrganization?.id && !isLoading) {
    onOpenChange(false);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Paciente
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do paciente. As alterações serão salvas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(85vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Carregando dados do paciente...</p>
              </div>
            </div>
          ) : patient && currentOrganization?.id ? (
            <PatientForm
              patient={patient}
              organizationId={currentOrganization.id}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              submitLabel="Salvar Alterações"
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Paciente não encontrado</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PatientEditModal;
