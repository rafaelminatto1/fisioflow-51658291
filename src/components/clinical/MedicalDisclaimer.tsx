import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface MedicalDisclaimerProps {
  className?: string;
  variant?: "info" | "warning" | "sticky";
}

export function MedicalDisclaimer({ className, variant = "info" }: MedicalDisclaimerProps) {
  if (variant === "sticky") {
    return (
      <div className={cn("bg-amber-50 dark:bg-amber-950/20 border-y border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2", className)}>
        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-300">
          <span className="font-bold">Aviso Médico:</span> Esta análise biomecânica é uma ferramenta de auxílio clínico. Os resultados não substituem o diagnóstico médico e devem ser interpretados por um profissional qualificado.
        </p>
      </div>
    );
  }

  return (
    <Alert variant="destructive" className={cn("bg-amber-50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-800 text-amber-900 dark:text-amber-200", className)}>
      <AlertCircle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
      <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
        Isenção de Responsabilidade Médica
      </AlertTitle>
      <AlertDescription className="text-xs leading-relaxed opacity-90">
        As medições e análises fornecidas pelo FisioFlow são baseadas em algoritmos de visão computacional e inteligência artificial para fins de suporte à decisão clínica. Este software não constitui um diagnóstico médico. Consulte sempre um médico para condições de saúde específicas.
      </AlertDescription>
    </Alert>
  );
}
