import React, { Suspense, lazy } from "react";
import { Activity, Loader2 } from "lucide-react";

import { BiomechanicsAnalysisLayout } from "@/components/analysis/evidence/BiomechanicsAnalysisLayout";
const GaitAnalysisStudio = lazy(() =>
  import("@/components/analysis/studios/GaitAnalysisStudio").then((m) => ({
    default: m.GaitAnalysisStudio,
  })),
);

function StudioLoadingFallback() {
  return (
    <div className="flex h-full min-h-[480px] items-center justify-center rounded-3xl border border-dashed bg-card/40">
      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando estúdio de marcha...
      </div>
    </div>
  );
}

export default function GaitAnalysisPage() {
  return (
    <BiomechanicsAnalysisLayout
      mode="gait"
      title="Marcha & Corrida em Esteira"
      subtitle="Análise 2D / Morin / Running Gait"
      icon={Activity}
      iconBgClassName="border-green-500/20 bg-green-500/10"
      iconClassName="text-green-500"
    >
      <Suspense fallback={<StudioLoadingFallback />}>
        <GaitAnalysisStudio />
      </Suspense>
    </BiomechanicsAnalysisLayout>
  );
}
