import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, Loader2, FileText, Dumbbell, Receipt } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  generateSoapPDF,
  generateExerciseProtocolPDF,
  generateReceiptPDF,
  type SoapEvolution,
  type ExerciseProtocolData,
  type ReceiptData,
} from "@/lib/export/clinicalPdf";

// ─── Botão simples para Evolução SOAP ────────────────────────────────────────

interface ExportSoapButtonProps {
  evolution: SoapEvolution;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}

export function ExportSoapPDFButton({
  evolution,
  size = "sm",
  variant = "outline",
  label = "PDF",
}: ExportSoapButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      generateSoapPDF(evolution);
      toast({ title: "PDF gerado!", description: "Download iniciado." });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
      ) : (
        <FileText className="h-3.5 w-3.5 mr-1" />
      )}
      {label}
    </Button>
  );
}

// ─── Botão simples para Protocolo de Exercícios ──────────────────────────────

interface ExportProtocolButtonProps {
  protocol: ExerciseProtocolData;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}

export function ExportProtocolPDFButton({
  protocol,
  size = "sm",
  variant = "outline",
  label = "Exportar PDF",
}: ExportProtocolButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      generateExerciseProtocolPDF(protocol);
      toast({ title: "PDF do protocolo gerado!", description: "Download iniciado." });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
      ) : (
        <Dumbbell className="h-3.5 w-3.5 mr-1" />
      )}
      {label}
    </Button>
  );
}

// ─── Botão simples para Recibo ────────────────────────────────────────────────

interface ExportReceiptButtonProps {
  receipt: ReceiptData;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}

export function ExportReceiptPDFButton({
  receipt,
  size = "sm",
  variant = "outline",
  label = "Recibo PDF",
}: ExportReceiptButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      generateReceiptPDF(receipt);
      toast({ title: "Recibo gerado!", description: "Download iniciado." });
    } catch {
      toast({ title: "Erro ao gerar recibo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
      ) : (
        <Receipt className="h-3.5 w-3.5 mr-1" />
      )}
      {label}
    </Button>
  );
}

// ─── Dropdown com todos os tipos (para uso geral) ─────────────────────────────

interface ExportPDFDropdownProps {
  patientName: string;
  therapistName?: string;
  clinicName?: string;
  soap?: Omit<SoapEvolution, "patient_name" | "therapist_name" | "clinic_name">;
  protocol?: Omit<ExerciseProtocolData, "patient_name" | "therapist_name" | "clinic_name">;
  receipt?: Omit<ReceiptData, "patient_name" | "therapist_name" | "clinic_name">;
}

export function ExportPDFDropdown({
  patientName,
  therapistName,
  clinicName,
  soap,
  protocol,
  receipt,
}: ExportPDFDropdownProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (type: string, fn: () => void) => {
    setLoading(type);
    try {
      fn();
      toast({ title: "PDF gerado!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const hasAny = soap || protocol || receipt;
  if (!hasAny) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <FileDown className="h-3.5 w-3.5 mr-1" />
          )}
          Exportar PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {soap && (
          <DropdownMenuItem
            onClick={() =>
              run("soap", () =>
                generateSoapPDF({
                  ...soap,
                  patient_name: patientName,
                  therapist_name: therapistName,
                  clinic_name: clinicName,
                }),
              )
            }
          >
            <FileText className="h-4 w-4 mr-2" /> Evolução SOAP
          </DropdownMenuItem>
        )}
        {protocol && (
          <DropdownMenuItem
            onClick={() =>
              run("protocol", () =>
                generateExerciseProtocolPDF({
                  ...protocol,
                  patient_name: patientName,
                  therapist_name: therapistName,
                  clinic_name: clinicName,
                }),
              )
            }
          >
            <Dumbbell className="h-4 w-4 mr-2" /> Protocolo de Exercícios
          </DropdownMenuItem>
        )}
        {receipt && (
          <DropdownMenuItem
            onClick={() =>
              run("receipt", () =>
                generateReceiptPDF({
                  ...receipt,
                  patient_name: patientName,
                  therapist_name: therapistName,
                  clinic_name: clinicName,
                }),
              )
            }
          >
            <Receipt className="h-4 w-4 mr-2" /> Recibo de Atendimento
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
