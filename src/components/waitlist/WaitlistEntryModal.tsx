import { useState, useEffect } from "react";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAddToWaitlist, useUpdatePriority, type WaitlistEntry } from "@/hooks/useWaitlist";
import { usePatients } from "@/hooks/patients/usePatients";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { Loader2, UserPlus, ClipboardList } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface WaitlistEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: WaitlistEntry;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
];

const TIME_SLOTS = [
  { value: "morning", label: "Manhã (07h-12h)" },
  { value: "afternoon", label: "Tarde (12h-18h)" },
  { value: "evening", label: "Noite (18h-21h)" },
];

export function WaitlistEntryModal({ open, onOpenChange, entry }: WaitlistEntryModalProps) {
  const isMobile = useIsMobile();
  const [patientId, setPatientId] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [priorityReason, setPriorityReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(["morning", "afternoon"]);

  const { data: patients = [] } = usePatients();
  const { mutate: addToWaitlist, isPending: isAdding } = useAddToWaitlist();
  const { mutate: updatePriority, isPending: isUpdating } = useUpdatePriority();
  const isEditing = !!entry;

  const isPending = isAdding || isUpdating;

  useEffect(() => {
    if (entry) {
      setPatientId(entry.patient_id);
      setPriority(entry.priority);
      setPriorityReason("");
      setNotes(entry.notes || "");
      setSelectedDays(
        entry.preferred_days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
      );
      setSelectedTimeSlots(entry.preferred_periods || ["morning", "afternoon"]);
    } else {
      setPatientId("");
      setPriority("normal");
      setPriorityReason("");
      setNotes("");
      setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
      setSelectedTimeSlots(["morning", "afternoon"]);
    }
  }, [entry, open]);

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleTimeSlotToggle = (slot: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const handleSubmit = () => {
    if (!patientId) return;

    const data = {
      patient_id: patientId,
      priority,
      notes,
      preferred_days: selectedDays,
      preferred_periods: selectedTimeSlots,
    };

    if (isEditing && entry) {
      updatePriority({ waitlistId: entry.id, priority }, { onSuccess: () => onOpenChange(false) });
    } else {
      addToWaitlist(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      contentClassName="max-w-2xl"
    >
      <CustomModalHeader onClose={() => onOpenChange(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          {isEditing ? (
            <ClipboardList className="h-5 w-5 text-primary" />
          ) : (
            <UserPlus className="h-5 w-5 text-primary" />
          )}
          {isEditing ? "Editar Entrada na Fila" : "Adicionar à Lista de Espera"}
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="px-6 py-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Atualize os dados do paciente na lista de espera"
              : "Adicione um paciente à lista de espera para agendamentos futuros"}
          </p>

          <div>
            <Label className="mb-2 block">Paciente *</Label>
            <PatientCombobox
              patients={patients}
              value={patientId}
              onValueChange={setPatientId}
              disabled={isEditing}
            />
          </div>

          <div>
            <Label className="mb-3 block font-semibold">Dias preferidos</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.value}
                  className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100"
                >
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block font-semibold">Horários preferidos</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot.value}
                  className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100"
                >
                  <Checkbox
                    id={`slot-${slot.value}`}
                    checked={selectedTimeSlots.includes(slot.value)}
                    onCheckedChange={() => handleTimeSlotToggle(slot.value)}
                  />
                  <label
                    htmlFor={`slot-${slot.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {slot.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block font-semibold">Prioridade</Label>
            <RadioGroup
              value={priority}
              onValueChange={(v: "normal" | "high" | "urgent") => setPriority(v)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="cursor-pointer">
                  Normal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="cursor-pointer text-orange-600">
                  Alta
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="cursor-pointer text-red-600">
                  Urgente
                </Label>
              </div>
            </RadioGroup>
          </div>

          {priority !== "normal" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="priority-reason">Motivo da Prioridade</Label>
              <Input
                id="priority-reason"
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
                placeholder="Ex: Dor aguda, pós-operatório imediato"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Observações Internas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais relevantes..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
          className="rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!patientId || isPending}
          className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ClipboardList className="h-4 w-4" />
          )}
          {isEditing ? "Salvar Alterações" : "Adicionar à Fila"}
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
}
