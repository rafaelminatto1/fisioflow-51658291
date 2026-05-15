/**
 * EvolutionVersionToggle - Improved V2
 *
 * Enhanced version toggle with better UX,
 * smooth animations, and professional visual design.
 */
import React from "react";
import { FileText, ClipboardList, BookOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { EvolutionVersion } from "./types";
import { preloadEditorVersion } from "@/lib/evolution/preloadEditors";

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
    tooltip: "Formato texto livre (Editor de blocos)",
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
  {
    key: "v5-pro",
    label: "Pro",
    badge: "NEW",
    icon: Zap,
    tooltip: "Editor Unificado com AI Scribe e Slash Commands",
  },
];

export const EvolutionVersionToggle: React.FC<EvolutionVersionToggleProps> = ({
  version,
  onToggle,
  className,
}) => {
  return null; // The toggle is hidden as requested
};
