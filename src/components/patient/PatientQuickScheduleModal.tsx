import { useState } from "react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, User, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateAppointment } from "@/hooks/appointments/useAppointmentsMutations";
import { toast } from "sonner";
import type { Patient } from "@/types";

interface PatientQuickScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  therapists?: Array<{ id: string; name: string }>;
  defaultDate?: Date;
}

const appointmentTypes = [
  { value: "avaliacao", label: "Avaliação" },
  { value: "sessao", label: "Sessão de Fisioterapia" },
  { value: "retorno", label: "Retorno" },
  { value: "reavaliacao", label: "Reavaliação" },
  { value: "orientacao", label: "Orientação" },
];

const defaultTimes = [
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];

export function PatientQuickScheduleModal({
  open,
  onOpenChange,
  patient,
  therapists = [],
  defaultDate,
}: PatientQuickScheduleModalProps) {
  const createAppointment = useCreateAppointment();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    therapistId: therapists[0]?.id || "",
    type: "sessao",
    duration: "60",
    observations: "",
  });

  const handleSubmit = async () => {
    if (!formData.date || !formData.time || !formData.therapistId) {
      toast.error("Preencha a data, horário e profissional");
      return;
    }

    setIsSubmitting(true);
    try {
      const [hours, minutes] = formData.time.split(":").map(Number);
      const appointmentDateTime = setMinutes(setHours(new Date(formData.date), hours), minutes);

      await createAppointment.mutateAsync({
        patient_id: patient.id,
        patient_name: patient.full_name || patient.name,
        appointment_date: format(appointmentDateTime, "yyyy-MM-dd"),
        appointment_time: formData.time,
        start_time: formData.time,
        duration: parseInt(formData.duration),
        appointment_type: formData.type,
        therapist_id: formData.therapistId,
        observations: formData.observations || undefined,
        status: "scheduled",
      });

      toast.success("Agendamento criado com sucesso!");
      onOpenChange(false);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00",
        therapistId: therapists[0]?.id || "",
        type: "sessao",
        duration: "60",
        observations: "",
      });
    } catch (error) {
      toast.error("Erro ao criar agendamento");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPatientName = () => {
    return patient.full_name || patient.name || "Paciente";
  };

  // Generate next 14 days for date picker
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE, dd/MM", { locale: ptBR }),
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Novo Agendamento
          </DialogTitle>
          <DialogDescription>Agendando para {getPatientName()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Data
            </Label>
            <Select
              value={formData.date}
              onValueChange={(value) => setFormData({ ...formData, date: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Horário
              </Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData({ ...formData, time: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultTimes.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Duração
              </Label>
              <Select
                value={formData.duration}
                onValueChange={(value) => setFormData({ ...formData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Profissional
            </Label>
            <Select
              value={formData.therapistId}
              onValueChange={(value) => setFormData({ ...formData, therapistId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {therapists.length > 0 ? (
                  therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="default">Profissional Padrão</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Tipo de Sessão
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações (opcional)</Label>
            <Input
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Observações para o agendamento..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Agendar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
