import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { useAddToAppointmentWaitlist } from "@/hooks/useAppointmentWaitlist";
import { usePatients } from "@/hooks/patients/usePatients";
import { toast } from "sonner";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { QuickPatientModal } from "@/components/modals/QuickPatientModal";
import { useQueryClient } from "@tanstack/react-query";

interface WaitlistQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  time: string;
  defaultPatientId?: string;
}

export function WaitlistQuickAdd({
  open,
  onOpenChange,
  date,
  time = "00:00",
  defaultPatientId = "",
}: WaitlistQuickAddProps) {
  const [patientId, setPatientId] = useState(defaultPatientId);

  // Quick Patient Creation State
  const [quickPatientModalOpen, setQuickPatientModalOpen] = useState(false);
  const [suggestedPatientName, setSuggestedPatientName] = useState("");
  const [lastCreatedPatient, setLastCreatedPatient] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { mutate: addToWaitlist, isPending: isAdding } = useAddToAppointmentWaitlist();
  const { data: patients = [] } = usePatients();

  // Update local state when prop changes
  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
    }
  }, [defaultPatientId]);

  // Safely handle potentially invalid dates
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const targetDateStr = format(safeDate, "yyyy-MM-dd");
  const targetTimeStr = time.trim() ? time.substring(0, 5) : "00:00";

  const handleSubmit = () => {
    if (!patientId) {
      toast.error("Selecione um paciente");
      return;
    }

    const patient = patients.find((p) => p.id === patientId);
    const patientPhone = patient?.phone || "";

    if (!patientPhone) {
      toast.error("Paciente não possui telefone cadastrado");
      return;
    }

    addToWaitlist({
      patient_id: patientId,
      patient_phone: patientPhone,
      patient_name: patient?.fullName || patient?.name || "",
      target_date: targetDateStr,
      target_time: targetTimeStr,
      type: "session",
    });

    onOpenChange(false);
    setPatientId("");
    setLastCreatedPatient(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-week-appointment="true">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Adicionar à Lista de Espera
            </DialogTitle>
            <DialogDescription>Registrar interesse de paciente neste horário</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Slot info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">
                  {format(safeDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
                <span className="text-muted-foreground"> às </span>
                <span className="font-medium">{time}</span>
              </div>
            </div>

            {/* Patient Select */}
            <div className="space-y-2">
              <Label>Paciente</Label>
              <PatientCombobox
                patients={patients}
                value={patientId}
                onValueChange={setPatientId}
                disabled={isAdding}
                onCreateNew={(searchTerm) => {
                  setSuggestedPatientName(searchTerm);
                  setQuickPatientModalOpen(true);
                }}
                fallbackDisplayName={
                  lastCreatedPatient?.id === patientId ? lastCreatedPatient.name : undefined
                }
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Quando este horário ficar disponível, você receberá uma notificação para entrar em
                contato com o paciente.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isAdding || !patientId}>
              {isAdding ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuickPatientModal
        open={quickPatientModalOpen}
        onOpenChange={(open) => {
          setQuickPatientModalOpen(open);
          if (!open) {
            setSuggestedPatientName("");
          }
        }}
        onPatientCreated={(newPatientId, newPatientName) => {
          setPatientId(newPatientId);
          setLastCreatedPatient({ id: newPatientId, name: newPatientName });
          setQuickPatientModalOpen(false);
          setSuggestedPatientName("");
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }}
        suggestedName={suggestedPatientName}
      />
    </>
  );
}

export default WaitlistQuickAdd;
