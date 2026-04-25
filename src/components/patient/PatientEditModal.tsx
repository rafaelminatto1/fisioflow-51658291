import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Loader2 } from "lucide-react";
import { PatientForm } from "./PatientForm";
import { usePatient } from "@/hooks/patients/usePatientCrud/index";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patientsApi } from "@/api/v2";

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
  const { data: patient, isLoading: isPatientLoading } = usePatient(patientId);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: Parameters<typeof patientsApi.update>[1]) => {
    setIsSubmitting(true);
    try {
      await patientsApi.update(patientId, data);
      toast.success("Paciente atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients-list"] });
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar paciente";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal if no organization
  if (!currentOrganization?.id && !isPatientLoading) {
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
          {isPatientLoading ? (
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
              isLoading={isSubmitting}
              submitLabel="Salvar Alterações"
              intent="update"
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
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
