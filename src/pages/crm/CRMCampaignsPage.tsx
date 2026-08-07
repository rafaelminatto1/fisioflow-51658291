import React, { useState } from "react";
import { CRMCampanhas } from "@/components/crm/CRMCampanhas";
import { Button } from "@/components/ui/button";
import { Upload, ChevronLeft } from "lucide-react";

// Lazy load lead import since it's heavy and not always needed
const LeadImport = React.lazy(() => import("@/components/crm/LeadImport").then(module => ({ default: module.LeadImport })));

export default function CRMCampaignsPage() {
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="h-full w-full animate-in fade-in duration-300 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {showImport ? "Importar Leads" : "Campanhas"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {showImport 
              ? "Importe listas de contatos para suas campanhas de marketing."
              : "Gerencie suas campanhas de marketing e disparos em massa."
            }
          </p>
        </div>
        
        <Button 
          onClick={() => setShowImport(!showImport)}
          variant={showImport ? "outline" : "default"}
          className="flex items-center gap-2"
        >
          {showImport ? (
            <>
              <ChevronLeft className="w-4 h-4" />
              Voltar para Campanhas
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Importar Leads
            </>
          )}
        </Button>
      </div>

      <div className="mt-4">
        {showImport ? (
          <React.Suspense fallback={
            <div className="flex items-center justify-center p-12 text-slate-500">
              Carregando módulo de importação...
            </div>
          }>
            <LeadImport />
          </React.Suspense>
        ) : (
          <CRMCampanhas />
        )}
      </div>
    </div>
  );
}
