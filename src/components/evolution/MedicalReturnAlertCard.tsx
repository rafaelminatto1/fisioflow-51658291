/**
 * Alerta de Retorno Médico na coluna direita da evolução.
 * Vermelho enquanto o relatório não foi enviado ao médico; verde após o envio.
 * Clique abre o modal de edição do retorno (com anexo e envio via WhatsApp).
 */

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Stethoscope } from "lucide-react";
import { usePatientMedicalReturns } from "@/hooks/usePatientEvolution";
import { useSearchDoctors } from "@/hooks/useDoctors";
import { MedicalReturnFormModal } from "@/components/evolution/MedicalReturnFormModal";
import type { MedicalReturn } from "@/types/evolution";
import { honorificName, normalizeHonorificGender } from "@/lib/format/honorific";
import { cn } from "@/lib/utils";

interface MedicalReturnAlertCardProps {
  patientId: string;
  patientName?: string;
  patientGender?: string | null;
}

function formatDateBr(isoDate: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? "");
  if (!match) return "data a confirmar";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const PERIOD_LABEL: Record<string, string> = {
  manha: "manhã",
  tarde: "tarde",
  noite: "noite",
};

export function MedicalReturnAlertCard({
  patientId,
  patientName,
  patientGender,
}: MedicalReturnAlertCardProps) {
  const { data: medicalReturns = [] } = usePatientMedicalReturns(patientId);
  const [editing, setEditing] = useState<MedicalReturn | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Próximo retorno futuro; se não houver, o mais recente registrado.
  const displayReturn = useMemo(() => {
    if (!medicalReturns.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const sorted = [...medicalReturns].sort((a, b) =>
      String(a.return_date ?? "").localeCompare(String(b.return_date ?? "")),
    );
    return sorted.find((r) => String(r.return_date ?? "") >= today) ?? sorted[sorted.length - 1];
  }, [medicalReturns]);

  const { data: matchedDoctors = [] } = useSearchDoctors(
    displayReturn?.doctor_name ?? "",
    !!displayReturn,
  );
  const doctorGender = normalizeHonorificGender(
    matchedDoctors.find(
      (doctor) =>
        doctor.name?.trim().toLowerCase() === displayReturn?.doctor_name?.trim().toLowerCase(),
    )?.gender,
  );

  if (!patientId || !displayReturn) return null;

  const sent = !!displayReturn.report_sent;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEditing(displayReturn);
          setModalOpen(true);
        }}
        className={cn(
          "w-full rounded-2xl border border-t-[3px] px-3 py-2 text-left shadow-sm transition-colors",
          sent
            ? "border-border border-t-emerald-500 bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-900/10"
            : "border-red-200 border-t-red-500 bg-red-50 hover:bg-red-100/70 dark:border-red-900/50 dark:bg-red-900/15",
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
              sent ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600",
            )}
          >
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "text-sm font-extrabold",
                sent ? "text-emerald-900 dark:text-emerald-200" : "text-red-800 dark:text-red-200",
              )}
            >
              Retorno médico · {formatDateBr(displayReturn.return_date)}
              {displayReturn.return_period && PERIOD_LABEL[displayReturn.return_period]
                ? ` (${PERIOD_LABEL[displayReturn.return_period]})`
                : ""}
            </div>
            <div className="truncate text-[11px] font-semibold text-muted-foreground">
              {honorificName(displayReturn.doctor_name, doctorGender)}
            </div>
          </div>
          {sent ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Enviado
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
              <AlertTriangle className="h-3 w-3" /> Enviar relatório
            </span>
          )}
        </div>
      </button>

      <MedicalReturnFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        patientId={patientId}
        patientName={patientName}
        patientGender={patientGender}
        medicalReturn={editing}
      />
    </>
  );
}
