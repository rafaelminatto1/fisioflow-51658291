import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Search, ChevronRight, ChevronLeft, Loader2, Calendar, Scissors } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";

import { patientsApi } from "@/api/v2/patients";
import { templatesApi } from "@/api/v2/exercises";
import type { ExerciseTemplate, PatientRow, PatientSurgery } from "@/types/workers";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TemplateApplyFlowProps {
  template: ExerciseTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (planId: string) => void;
}

type Step = 1 | 2 | 3;

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const applySchema = z.object({
  patientId: z.string().min(1, "Selecione um paciente"),
  startDate: z.string().min(1, "Informe a data de início"),
  surgeryId: z.string().optional(),
  notes: z.string().optional(),
});

type ApplyFormValues = z.infer<typeof applySchema>;

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Step indicators ─────────────────────────────────────────────────────────

function StepIndicator({
  current,
  total,
}: {
  current: Step;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              step === current
                ? "bg-primary text-primary-foreground"
                : step < current
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step}
          </div>
          {step < total && (
            <div
              className={`h-px w-6 transition-colors ${
                step < current ? "bg-primary/40" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Patient Search ───────────────────────────────────────────────────

function PatientSearchStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (patientId: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", { q: debouncedSearch }],
    queryFn: () =>
      patientsApi.list({ search: debouncedSearch, limit: 10 }),
    enabled: debouncedSearch.length >= 2,
    staleTime: 1000 * 30,
  });

  const patients = data?.data ?? [];

  const handleSelect = useCallback(
    (patient: PatientRow) => {
      setSelectedPatient(patient);
      setSearchInput(patient.full_name);
      onChange(patient.id);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setSelectedPatient(null);
    setSearchInput("");
    onChange("");
  }, [onChange]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="patient-search" className="mb-2 block">
          Buscar paciente
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="patient-search"
            placeholder="Nome ou CPF do paciente..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (selectedPatient) handleClear();
            }}
            className="pl-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Results list */}
      {!selectedPatient && patients.length > 0 && (
        <ul className="border rounded-md divide-y max-h-52 overflow-y-auto">
          {patients.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                onClick={() => handleSelect(patient)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">{patient.full_name}</p>
                {patient.cpf && (
                  <p className="text-xs text-muted-foreground">
                    CPF: {patient.cpf}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selectedPatient &&
        debouncedSearch.length >= 2 &&
        !isLoading &&
        patients.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum paciente encontrado para "{debouncedSearch}"
          </p>
        )}

      {/* Selected patient badge */}
      {selectedPatient && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <div>
            <p className="text-sm font-medium">{selectedPatient.full_name}</p>
            {selectedPatient.cpf && (
              <p className="text-xs text-muted-foreground">
                CPF: {selectedPatient.cpf}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs"
          >
            Trocar
          </Button>
        </div>
      )}

      {!value && debouncedSearch.length < 2 && (
        <p className="text-xs text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar
        </p>
      )}
    </div>
  );
}

// ─── Step 2: Start Date ───────────────────────────────────────────────────────

function StartDateStep({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (date: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="start-date" className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Data de início do plano
        </Label>
        <Input
          id="start-date"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        O plano de exercícios será iniciado a partir desta data.
      </p>
    </div>
  );
}

// ─── Step 3: Surgery Link (pos_operatorio only) ───────────────────────────────

function SurgeryLinkStep({
  patientId,
  value,
  onChange,
}: {
  patientId: string;
  value: string;
  onChange: (surgeryId: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-surgeries", patientId],
    queryFn: () => patientsApi.surgeries(patientId),
    enabled: !!patientId,
  });

  const surgeries: PatientSurgery[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="surgery-select" className="mb-2 flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          Vincular a cirurgia (opcional)
        </Label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando cirurgias...
          </div>
        ) : surgeries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhuma cirurgia registrada para este paciente.
          </p>
        ) : (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id="surgery-select">
              <SelectValue placeholder="Selecionar cirurgia..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {surgeries.map((surgery) => (
                <SelectItem key={surgery.id} value={surgery.id}>
                  {surgery.surgery_name}
                  {surgery.surgery_date && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({new Date(surgery.surgery_date).toLocaleDateString("pt-BR")})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Vincular a uma cirurgia permite rastrear a evolução pós-operatória do paciente.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateApplyFlow({
  template,
  open,
  onOpenChange,
  onSuccess,
}: TemplateApplyFlowProps) {
  const queryClient = useQueryClient();
  const isPosOperatorio = template.patientProfile === "pos_operatorio";
  const totalSteps: number = isPosOperatorio ? 3 : 2;

  const [step, setStep] = useState<Step>(1);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      patientId: "",
      startDate: "",
      surgeryId: undefined,
      notes: undefined,
    },
  });

  const patientId = watch("patientId");
  const startDate = watch("startDate");
  const surgeryId = watch("surgeryId");

  // Reset to step 1 when sheet opens
  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (values: ApplyFormValues) =>
      templatesApi.apply(template.id, {
        patientId: values.patientId,
        startDate: values.startDate,
        surgeryId:
          values.surgeryId && values.surgeryId !== "none"
            ? values.surgeryId
            : undefined,
        notes: values.notes,
      }),
    onSuccess: (res) => {
      const { planId, patientId: pid } = res.data;
      queryClient.invalidateQueries({ queryKey: ["exercise-plans", pid] });
      toast.success("Plano criado com sucesso!", {
        description: (
          <span>
            O plano foi criado.{" "}
            <Link
              to={`/patients/${pid}?tab=exercises`}
              className="underline font-medium"
              onClick={() => onOpenChange(false)}
            >
              Ver plano
            </Link>
          </span>
        ),
        duration: 6000,
      });
      reset();
      onSuccess(planId);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar plano", {
        description: err.message ?? "Tente novamente.",
      });
      // Sheet stays open, form data preserved (no reset on error)
    },
  });

  const canAdvanceStep1 = !!patientId;
  const canAdvanceStep2 = !!startDate;

  function handleNext() {
    if (step < totalSteps) {
      setStep((s) => (s + 1) as Step);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  }

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  const stepTitles: Record<number, string> = {
    1: "Selecionar paciente",
    2: "Data de início",
    3: "Vincular cirurgia",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Aplicar template a paciente</SheetTitle>
          <SheetDescription className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{template.name}</span>
            {template.conditionName && (
              <Badge variant="secondary" className="text-xs">
                {template.conditionName}
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 mt-4">
          <StepIndicator current={step} total={totalSteps} />

          <p className="text-sm font-medium text-muted-foreground mb-4">
            Etapa {step}: {stepTitles[step]}
          </p>

          <div className="flex-1">
            {step === 1 && (
              <PatientSearchStep
                value={patientId}
                onChange={(id) => setValue("patientId", id, { shouldValidate: true })}
              />
            )}

            {step === 2 && (
              <StartDateStep
                value={startDate}
                onChange={(date) => setValue("startDate", date, { shouldValidate: true })}
                error={errors.startDate?.message}
              />
            )}

            {step === 3 && isPosOperatorio && (
              <SurgeryLinkStep
                patientId={patientId}
                value={surgeryId ?? ""}
                onChange={(id) => setValue("surgeryId", id)}
              />
            )}
          </div>

          <SheetFooter className="flex-row gap-2 mt-6 pt-4 border-t">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={mutation.isPending}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}

            {step < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  (step === 1 && !canAdvanceStep1) ||
                  (step === 2 && !canAdvanceStep2)
                }
                className="flex-1"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={mutation.isPending || !canAdvanceStep1 || !canAdvanceStep2}
                className="flex-1"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando plano...
                  </>
                ) : (
                  "Criar plano de exercícios"
                )}
              </Button>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
