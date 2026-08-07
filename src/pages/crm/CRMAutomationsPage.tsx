import React from "react";
import { CRMAutomacoes } from "@/components/crm/CRMAutomacoes";
import { CRMAutomationDashboard } from "@/components/crm/CRMAutomationDashboard";
import { ChurnRiskPanel } from "@/components/crm/ChurnRiskPanel";

export default function CRMAutomationsPage() {
  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-300 p-6 space-y-6 overflow-auto">
      <div className="w-full">
        <ChurnRiskPanel />
      </div>

      <div className="w-full">
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-100">
          Dashboard de Automações
        </h2>
        <CRMAutomationDashboard />
      </div>
      
      <div className="w-full">
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-100">
          Regras e Fluxos
        </h2>
        <CRMAutomacoes />
      </div>
    </div>
  );
}

