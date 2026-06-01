/**
 * Utilitários compartilhados da EvolutionTimeline — extraídos do componente
 * monolítico para reuso entre a timeline e o SessionDetailsModal.
 */
import { format, formatDistanceToNow, isValid, type Locale } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, AlertCircle, Bone, FileText, Image as ImageIcon, Target } from "lucide-react";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimelineEventType } from "@/types/evolution";

// Helper seguro para formatação de data
export const safeFormat = (
  date: Date | string | number | undefined | null,
  formatStr: string,
  options?: { locale?: Locale },
) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (!isValid(d)) return "Data inválida";
  return format(d, formatStr, options || { locale: ptBR });
};

export const safeFormatDistance = (
  date: Date | string | number | undefined | null,
  options?: { locale?: Locale; addSuffix?: boolean },
) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (!isValid(d)) return "Data inválida";
  return formatDistanceToNow(d, options || { locale: ptBR, addSuffix: true });
};

export const EVENT_TYPE_CONFIG: Record<
  TimelineEventType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  session: {
    label: "Sessões",
    icon: <FileText className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/20",
  },
  surgery: {
    label: "Cirurgias",
    icon: <Bone className="h-4 w-4" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/5",
    borderColor: "border-purple-500/20",
  },
  goal: {
    label: "Metas",
    icon: <Target className="h-4 w-4" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/5",
    borderColor: "border-green-500/20",
  },
  pathology: {
    label: "Patologias",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/5",
    borderColor: "border-orange-500/20",
  },
  measurement: {
    label: "Medições",
    icon: <Activity className="h-4 w-4" />,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/5",
    borderColor: "border-cyan-500/20",
  },
  attachment: {
    label: "Anexos",
    icon: <ImageIcon className="h-4 w-4" />,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/5",
    borderColor: "border-pink-500/20",
  },
};

// Componente de Skeleton para loading
export const SessionDetailsSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);
