import React, { Suspense, lazy } from "react";
import { Loader2, Zap } from "lucide-react";

import { BiomechanicsAnalysisLayout } from "@/components/analysis/evidence/BiomechanicsAnalysisLayout";
const JumpAnalysisStudio = lazy(() =>
	import("@/components/analysis/studios/JumpAnalysisStudio").then((m) => ({
		default: m.JumpAnalysisStudio,
	})),
);

function StudioLoadingFallback() {
	return (
		<div className="flex h-full min-h-[480px] items-center justify-center rounded-3xl border border-dashed bg-card/40">
			<div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				Carregando estúdio de salto...
			</div>
		</div>
	);
}

export default function JumpAnalysisPage() {
	return (
		<BiomechanicsAnalysisLayout
			mode="jump"
			title="Performance de Salto"
			subtitle="CMJ / My Jump / Bosco / Sayers"
			icon={Zap}
			iconBgClassName="border-blue-500/20 bg-blue-500/10"
			iconClassName="text-blue-500"
		>
			<Suspense fallback={<StudioLoadingFallback />}>
				<JumpAnalysisStudio />
			</Suspense>
		</BiomechanicsAnalysisLayout>
	);
}
