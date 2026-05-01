import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Clock, UserPlus, Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { profileApi, patientsApi } from "@/api/v2";
import { schedulingApi } from "@/api/v2/scheduling";

interface ClinicSetupWizardProps {
  open: boolean;
  onClose: () => void;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DEFAULT_HOURS = [
  { day_of_week: 0, is_open: false, open_time: "08:00", close_time: "18:00" },
  { day_of_week: 1, is_open: true,  open_time: "08:00", close_time: "18:00" },
  { day_of_week: 2, is_open: true,  open_time: "08:00", close_time: "18:00" },
  { day_of_week: 3, is_open: true,  open_time: "08:00", close_time: "18:00" },
  { day_of_week: 4, is_open: true,  open_time: "08:00", close_time: "18:00" },
  { day_of_week: 5, is_open: true,  open_time: "08:00", close_time: "18:00" },
  { day_of_week: 6, is_open: false, open_time: "08:00", close_time: "13:00" },
];

type Step = "clinic" | "hours" | "patient" | "done";

export function ClinicSetupWizard({ open, onClose }: ClinicSetupWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("clinic");
  const [saving, setSaving] = useState(false);

  const [clinicData, setClinicData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
  });

  const [hours, setHours] = useState(DEFAULT_HOURS);

  const [patientData, setPatientData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: "clinic",  label: "Clínica",   icon: <Building2 className="h-4 w-4" /> },
    { id: "hours",   label: "Horários",  icon: <Clock className="h-4 w-4" /> },
    { id: "patient", label: "Paciente",  icon: <UserPlus className="h-4 w-4" /> },
    { id: "done",    label: "Pronto",    icon: <Check className="h-4 w-4" /> },
  ];

  const stepIndex = steps.findIndex((s) => s.id === step);

  const saveClinic = async () => {
    if (!clinicData.name.trim()) {
      toast.error("Informe o nome da clínica.");
      return false;
    }
    try {
      await profileApi.update({
        clinic_name: clinicData.name,
        phone: clinicData.phone || undefined,
        address: clinicData.address || undefined,
        city: clinicData.city || undefined,
      } as any);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      return true;
    } catch {
      toast.error("Erro ao salvar dados da clínica.");
      return false;
    }
  };

  const saveHours = async () => {
    try {
      const openDays = hours.filter((h) => h.is_open);
      for (const h of openDays) {
        await schedulingApi.settings.businessHours.upsert([h as any]);
      }
      queryClient.invalidateQueries({ queryKey: ["business-hours"] });
      return true;
    } catch {
      toast.error("Erro ao salvar horários.");
      return false;
    }
  };

  const savePatient = async () => {
    if (!patientData.full_name.trim()) return true; // optional step
    try {
      await patientsApi.create({
        full_name: patientData.full_name,
        phone: patientData.phone || undefined,
        email: patientData.email || undefined,
      } as any);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      return true;
    } catch {
      toast.error("Erro ao cadastrar paciente.");
      return false;
    }
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      let ok = true;
      if (step === "clinic")  ok = await saveClinic();
      if (step === "hours")   ok = await saveHours();
      if (step === "patient") ok = await savePatient();
      if (!ok) return;

      const nextMap: Record<Step, Step> = {
        clinic: "hours",
        hours: "patient",
        patient: "done",
        done: "done",
      };
      setStep(nextMap[step]);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (idx: number) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === idx ? { ...h, is_open: !h.is_open } : h)),
    );
  };

  const updateHour = (idx: number, field: "open_time" | "close_time", val: string) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === idx ? { ...h, [field]: val } : h)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && step === "done" && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuração inicial da clínica</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < stepIndex
                    ? "bg-green-500 text-white"
                    : i === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : s.icon}
              </div>
              <span className={`hidden sm:inline text-xs ${i === stepIndex ? "font-semibold" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === "clinic" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Informe os dados básicos da sua clínica.</p>
            <div>
              <Label className="text-xs">Nome da clínica *</Label>
              <Input
                value={clinicData.name}
                onChange={(e) => setClinicData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Clínica FisioFlow"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={clinicData.phone}
                  onChange={(e) => setClinicData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 9 9999-9999"
                />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input
                  value={clinicData.city}
                  onChange={(e) => setClinicData((p) => ({ ...p, city: e.target.value }))}
                  placeholder="São Paulo"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Endereço</Label>
              <Input
                value={clinicData.address}
                onChange={(e) => setClinicData((p) => ({ ...p, address: e.target.value }))}
                placeholder="Rua, número"
              />
            </div>
          </div>
        )}

        {step === "hours" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Configure os dias e horários de atendimento.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {hours.map((h) => (
                <div key={h.day_of_week} className="flex items-center gap-3">
                  <Switch
                    checked={h.is_open}
                    onCheckedChange={() => toggleDay(h.day_of_week)}
                  />
                  <span className="w-8 text-xs font-medium">{DAYS[h.day_of_week]}</span>
                  {h.is_open ? (
                    <>
                      <Input
                        type="time"
                        value={h.open_time ?? ""}
                        onChange={(e) => updateHour(h.day_of_week, "open_time", e.target.value)}
                        className="h-7 w-28 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={h.close_time ?? ""}
                        onChange={(e) => updateHour(h.day_of_week, "close_time", e.target.value)}
                        className="h-7 w-28 text-xs"
                      />
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Fechado</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "patient" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cadastre seu primeiro paciente (opcional — pode pular).
            </p>
            <div>
              <Label className="text-xs">Nome completo</Label>
              <Input
                value={patientData.full_name}
                onChange={(e) => setPatientData((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="João da Silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={patientData.phone}
                  onChange={(e) => setPatientData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 9 9999-9999"
                />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  value={patientData.email}
                  onChange={(e) => setPatientData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="joao@email.com"
                />
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="font-bold text-lg">Tudo configurado!</h3>
            <p className="text-sm text-muted-foreground">
              Sua clínica está pronta para uso. Comece agendando uma consulta.
            </p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          {step !== "done" && step !== "clinic" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const prev: Record<Step, Step> = { clinic: "clinic", hours: "clinic", patient: "hours", done: "patient" };
                setStep(prev[step]);
              }}
            >
              Voltar
            </Button>
          ) : (
            <div />
          )}

          {step === "done" ? (
            <Button onClick={onClose}>Ir para o painel</Button>
          ) : (
            <div className="flex gap-2">
              {step === "patient" && (
                <Button variant="outline" onClick={handleNext} disabled={saving}>
                  Pular
                </Button>
              )}
              <Button onClick={handleNext} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {step === "patient" ? "Finalizar" : "Próximo"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
