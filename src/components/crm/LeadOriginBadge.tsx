import React from "react";
import {
  Globe,
  Search,
  MessageSquare,
  UserCheck,
  Calendar,
  Phone,
  Tag,
  Share2,
} from "lucide-react";
import { Instagram } from "@/components/icons/InstagramIcon";
import { Badge } from "@/components/ui/badge";

interface LeadOriginBadgeProps {
  origem?: string | null;
  compact?: boolean;
}

export function LeadOriginBadge({ origem, compact = false }: LeadOriginBadgeProps) {
  if (!origem) {
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground/60 border-dashed">
        <Tag className="w-2.5 h-2.5 mr-1" />
        Direto
      </Badge>
    );
  }

  const normalized = origem.toLowerCase().trim();

  let icon = <Tag className="w-3.5 h-3.5" />;
  let styles = "bg-muted/50 text-muted-foreground border-border/50";
  let label = origem;

  if (normalized.includes("instagram") || normalized.includes("ig")) {
    icon = <Instagram className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />;
    styles = "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/15";
    label = "Instagram";
  } else if (normalized.includes("whatsapp") || normalized.includes("wa")) {
    icon = <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    styles = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15";
    label = "WhatsApp";
  } else if (normalized.includes("google") || normalized.includes("ads") || normalized.includes("busca")) {
    icon = <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    styles = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/15";
    label = "Google";
  } else if (normalized.includes("facebook") || normalized.includes("fb")) {
    icon = <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
    styles = "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/15";
    label = "Facebook";
  } else if (normalized.includes("indica") || normalized.includes("médico") || normalized.includes("paciente")) {
    icon = <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    styles = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/15";
    label = "Indicação";
  } else if (normalized.includes("site") || normalized.includes("web")) {
    icon = <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
    styles = "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/15";
    label = "Website";
  } else if (normalized.includes("evento") || normalized.includes("feira")) {
    icon = <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />;
    styles = "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/15";
    label = "Evento";
  } else if (normalized.includes("telef") || normalized.includes("ligação")) {
    icon = <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
    styles = "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 hover:bg-teal-500/15";
    label = "Telefone";
  }

  if (compact) {
    return (
      <span title={`Origem: ${label}`} className={`p-1 rounded-md border flex items-center justify-center ${styles}`}>
        {icon}
      </span>
    );
  }

  return (
    <Badge variant="outline" className={`gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${styles}`}>
      {icon}
      <span>{label}</span>
    </Badge>
  );
}
