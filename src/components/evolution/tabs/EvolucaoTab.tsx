/**
 * EvolucaoTab - Tab component for SOAP evolution
 *
 * Extracted from PatientEvolution for better code splitting and performance
 * Requirements: 4.1, 4.4 - Component-level code splitting
 *
 * @version 1.0.0
 */

import { EvolutionResponsiveLayout } from '@/components/evolution/EvolutionResponsiveLayout';

interface EvolucaoTabProps {
  alertsSection: React.ReactNode;
  topSection: React.ReactNode;
  mainGrid: React.ReactNode;
}

export function EvolucaoTab({ alertsSection, topSection, mainGrid }: EvolucaoTabProps) {
  return (
    <div className="mt-4">
      <EvolutionResponsiveLayout
        alertsSection={alertsSection}
        topSection={topSection}
        mainGrid={mainGrid}
      />
    </div>
  );
}
