import React, { Suspense, lazy } from "react";
import { Loader2, Move } from "lucide-react";

import { BiomechanicsAnalysisLayout } from "@/components/analysis/evidence/BiomechanicsAnalysisLayout";
const FunctionalAnalysisStudio = lazy(() =>
	import("@/components/analysis/studios/FunctionalAnalysisStudio").then((m) => ({
		default: m.FunctionalAnalysisStudio,
	})),
);

function StudioLoadingFallback() {
	return (
		<div className="flex h-full min-h-[480px] items-center justify-center rounded-3xl border border-dashed bg-card/40">
			<div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				Carregando estúdio funcional...
			</div>
		</div>
	);
}

export default function FunctionalAnalysisPage() {
	return (
		<BiomechanicsAnalysisLayout
			mode="functional"
			title="Gesto Funcional"
			subtitle="Vídeo 2D / Kinovea-like / Testes funcionais"
			icon={Move}
			iconBgClassName="border-orange-500/20 bg-orange-500/10"
			iconClassName="text-orange-500"
		>
			<Suspense fallback={<StudioLoadingFallback />}>
				<FunctionalAnalysisStudio />
			</Suspense>
		</BiomechanicsAnalysisLayout>
	);
}
