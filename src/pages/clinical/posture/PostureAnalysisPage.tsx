import React, { Suspense, lazy } from "react";
import { User } from "lucide-react";

import { BiomechanicsAnalysisLayout } from "@/components/analysis/evidence/BiomechanicsAnalysisLayout";
const PostureAnalysisStudio = lazy(() =>
	import("@/components/analysis/studios/PostureAnalysisStudio").then((m) => ({
		default: m.PostureAnalysisStudio,
	})),
);

function StudioLoadingFallback() {
	return (
		<div className="flex h-full min-h-[480px] items-center justify-center rounded-3xl border border-dashed bg-card/40">
			<div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
				Carregando estúdio postural...
			</div>
		</div>
	);
}

export default function PostureAnalysisPage() {
	return (
		<BiomechanicsAnalysisLayout
			mode="posture"
			title="Postura & Escoliose"
			subtitle="SAPO / Adams / Fotogrametria"
			icon={User}
			iconBgClassName="border-purple-500/20 bg-purple-500/10"
			iconClassName="text-purple-500"
		>
			<Suspense fallback={<StudioLoadingFallback />}>
				<PostureAnalysisStudio />
			</Suspense>
		</BiomechanicsAnalysisLayout>
	);
}
