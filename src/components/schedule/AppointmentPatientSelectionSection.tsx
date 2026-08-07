import { User, DollarSign, Handshake, ShieldAlert } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import type { Patient } from "@/types";
import type { AppointmentFormData } from "@/types/appointment";
import { formatCurrency } from "@/lib/utils";

interface AppointmentPatientSelectionSectionProps {
  patients: Patient[];
  isLoading: boolean;
  disabled: boolean;
  onCreateNew: (name: string) => void;
  fallbackPatientName?: string;
  fallbackDescription?: string;
  inline?: boolean;
}

export function AppointmentPatientSelectionSection({
  patients,
  isLoading,
  disabled,
  onCreateNew,
  fallbackPatientName,
  fallbackDescription,
  inline = false,
}: AppointmentPatientSelectionSectionProps) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<AppointmentFormData>();

  const selectedPatientId = watch("patient_id");
  const selectedPatient = patients?.find((p) => p.id === selectedPatientId);

  const sessionValue =
    selectedPatient?.session_value ?? (selectedPatient as any)?.sessionValue ?? 160.0;

  const partnershipName =
    selectedPatient?.partner_company_name || selectedPatient?.partnerCompanyName;

  const partnershipRole =
    selectedPatient?.partnership_role || selectedPatient?.partnershipRole;

  const isProfessor = partnershipRole === "professor";

  return (
    <div className="space-y-2">
      {!inline && (
        <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-primary" />
          Paciente *
        </Label>
      )}
      <PatientCombobox
        patients={patients}
        value={selectedPatientId}
        onValueChange={(value) =>
          setValue("patient_id", value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        onCreateNew={onCreateNew}
        fallbackDisplayName={fallbackPatientName}
        fallbackDescription={fallbackDescription}
        disabled={disabled || isLoading}
        inline={inline}
        aria-invalid={!!errors.patient_id}
        aria-describedby={errors.patient_id ? "patient-id-error" : undefined}
      />

      {errors.patient_id && (
        <p id="patient-id-error" className="text-xs text-destructive">
          {(errors.patient_id as { message?: string })?.message}
        </p>
      )}

      {selectedPatient && (
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between gap-3 text-xs mt-2 transition-all animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Sessão Avulsa:
                </span>
                <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                  {formatCurrency(sessionValue)}
                </span>
                {isProfessor && (
                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none text-[9px] font-black uppercase">
                    Isento (Professor)
                  </Badge>
                )}
              </div>
              {partnershipName ? (
                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                  <Handshake className="h-3 w-3 text-primary shrink-0" />
                  <span>
                    Parceria: <strong className="text-slate-800 dark:text-slate-200">{partnershipName}</strong> (
                    {isProfessor ? "Professor / Colaborador" : "Aluno / Cliente"})
                  </span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium">
                  Paciente Particular / Padrão da Clínica
                </p>
              )}
            </div>
          </div>

          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] font-black uppercase tracking-wider shrink-0">
            {formatCurrency(sessionValue)}
          </Badge>
        </div>
      )}
    </div>
  );
}
