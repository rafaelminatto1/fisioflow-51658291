/**
 * EvolutionVersionToggle - Supports V1 (SOAP), V2 (Texto Livre), V3 (Notion)
 */
import React from "react";
import { FileText, ClipboardList, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { EvolutionVersion } from "./types";

interface EvolutionVersionToggleProps {
  version: EvolutionVersion;
  onToggle: (version: EvolutionVersion) => void;
  className?: string;
}

const versions: Array<{
  key: EvolutionVersion;
  label: string;
  badge?: string;
  icon: React.ElementType;
  tooltip: string;
}> = [
  {
    key: "v1-soap",
    label: "SOAP",
    icon: ClipboardList,
    tooltip: "Formato SOAP tradicional (4 campos)",
  },
  {
    key: "v2-texto",
    label: "Texto Livre",
    badge: "V2",
    icon: FileText,
    tooltip: "Formato texto livre estilo blocos",
  },
  {
    key: "v3-notion",
    label: "Notion",
    badge: "V3",
    icon: BookOpen,
    tooltip: "Página contínua estilo Notion",
  },
  {
    key: "v4-tiptap",
    label: "Tiptap",
    badge: "V4",
    icon: BookOpen,
    tooltip: "Editor de Blocos com Offline-Sync",
  },
];

export const EvolutionVersionToggle: React.FC<EvolutionVersionToggleProps> = ({
  version,
  onToggle,
  className,
}) => {
  return null; // The toggle is hidden as requested
};
