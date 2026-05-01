import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface SignatureStatusProps {
  signedAt?: string | null;
  expiresAt?: string | null;
  showLabel?: boolean;
}

export function SignatureStatus({ signedAt, expiresAt, showLabel = true }: SignatureStatusProps) {
  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  if (signedAt) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="border-green-300 bg-green-50 text-green-700 gap-1 cursor-default"
          >
            <CheckCircle2 className="h-3 w-3" />
            {showLabel && <span>Assinado</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Assinado em {formatDate(signedAt)}</TooltipContent>
      </Tooltip>
    );
  }

  const isExpired = expiresAt && new Date() > new Date(expiresAt);

  if (isExpired) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="border-red-300 bg-red-50 text-red-700 gap-1 cursor-default"
          >
            <XCircle className="h-3 w-3" />
            {showLabel && <span>Expirado</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Link expirado em {formatDate(expiresAt!)}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700 gap-1 cursor-default"
        >
          <Clock className="h-3 w-3" />
          {showLabel && <span>Aguardando assinatura</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {expiresAt ? `Válido até ${formatDate(expiresAt)}` : "Aguardando assinatura do paciente"}
      </TooltipContent>
    </Tooltip>
  );
}
