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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Phone, Calendar, AlertCircle, Loader2, Check } from "lucide-react";
import { useAddToAppointmentWaitlist } from "@/hooks/useAppointmentWaitlist";
import { usePatients } from "@/hooks/patients/usePatients";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { QuickPatientModal } from "@/components/modals/QuickPatientModal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WaitlistSlotAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  time: string;
  defaultPatientId?: string;
}

const getTimeSlot = (time: string): string => {
  if (!time || !time.trim()) return "00:00";
  const [hour] = time.split(":").map(Number);
  return `${String(hour).padStart(2, "0")}:00`;
};

export function WaitlistSlotAdd({
  open,
  onOpenChange,
  date,
  time = "00:00",
  defaultPatientId = "",
}: WaitlistSlotAddProps) {
  const [patientId, setPatientId] = useState(defaultPatientId);
  const [patientPhone, setPatientPhone] = useState("");
  const [patientName, setPatientName] = useState("");
  const [type, setType] = useState<"session" | "evaluation" | "group">("session");
  const [autoFetchPhone] = useState(true);

  const queryClient = useQueryClient();
  const { mutate: addToWaitlist, isPending: isAdding } = useAddToAppointmentWaitlist();
  const { data: patients = [] } = usePatients();

  const [quickPatientModalOpen, setQuickPatientModalOpen] = useState(false);
  const [suggestedPatientName, setSuggestedPatientName] = useState("");
  const [lastCreatedPatient, setLastCreatedPatient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
      setLastCreatedPatient(null);
    }
  }, [defaultPatientId]);

  useEffect(() => {
    if (patientId && autoFetchPhone) {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        setPatientPhone(patient.phone || "");
        setPatientName(patient.fullName || "");
      }
    } else if (!patientId) {
      setPatientPhone("");
      setPatientName("");
    }
  }, [patientId, patients, autoFetchPhone]);

  const targetDateStr = format(date, "yyyy-MM-dd");
  const targetTimeStr = getTimeSlot(time);

  const handleSubmit = () => {
    if (!patientId && !patientName.trim()) {
      toast.error("Selecione um paciente ou digite o nome");
      return;
    }
    if (!patientPhone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    addToWaitlist({
      patient_id: patientId || undefined,
      patient_phone: patientPhone,
      patient_name: patientName || undefined,
      target_date: targetDateStr,
      target_time: targetTimeStr,
      type,
    });

    onOpenChange(false);
    setPatientId("");
    setPatientPhone("");
    setPatientName("");
    setType("session");
    setLastCreatedPatient(null);
  };

  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const formattedDate = format(safeDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-week-appointment="true">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Adicionar à Lista de Espera
            </DialogTitle>
            <DialogDescription>Registrar interesse de paciente neste horário</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">{formattedDate}</span>
                <span className="text-muted-foreground"> às </span>
                <span className="font-medium">{time}</span>
              </div>
            </div>

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
              {!patientId && (
                <div className="space-y-2 pt-2">
                  <Label>Nome do Paciente</Label>
                  <Input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nome do paciente"
                    disabled={isAdding}
                  />
                  <Label>Telefone</Label>
                  <Input
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    disabled={isAdding}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Atendimento</Label>
              <RadioGroup value={type} onValueChange={(v) => setType(v as typeof type)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="session" id="type-session" />
                  <Label htmlFor="type-session" className="cursor-pointer text-sm">Sessão</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="evaluation" id="type-evaluation" />
                  <Label htmlFor="type-evaluation" className="cursor-pointer text-sm">Avaliação</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="type-group" />
                  <Label htmlFor="type-group" className="cursor-pointer text-sm">Grupo</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Quando este horário ficar disponível, você receberá uma notificação na tela para entrar em
                contato com o paciente.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isAdding || (!patientId && !patientName.trim()) || !patientPhone.trim()}>
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isAdding ? "Adicionando..." : "Adicionar à Fila"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuickPatientModal
        open={quickPatientModalOpen}
        onOpenChange={(open) => {
          setQuickPatientModalOpen(open);
          if (!open) setSuggestedPatientName("");
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

export default WaitlistSlotAdd;
