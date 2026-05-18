/**
 * EvolutionVersionToggle — atualmente oculto (componente retorna null).
 * Mantido como placeholder para compatibilidade com imports existentes.
 */
import React from "react";
import type { EvolutionVersion } from "./types";

interface EvolutionVersionToggleProps {
  version: EvolutionVersion;
  onToggle: (version: EvolutionVersion) => void;
  className?: string;
}

export const EvolutionVersionToggle: React.FC<EvolutionVersionToggleProps> = () => {
  return null;
};
