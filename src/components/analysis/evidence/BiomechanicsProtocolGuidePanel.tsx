import { CheckCircle2, Crosshair, ListChecks, Radar } from "lucide-react";

import type { BiomechanicsEvidenceMode } from "@/data/biomechanicsEvidence";
import { biomechanicsProtocols } from "@/data/biomechanicsEvidence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BiomechanicsProtocolGuidePanel({
	mode,
}: {
	mode: BiomechanicsEvidenceMode;
}) {
	const protocol = biomechanicsProtocols[mode];

	return (
		<Card className="border-slate-200/80 shadow-sm">
			<CardHeader className="space-y-2">
				<CardTitle className="text-base">Protocolo guiado</CardTitle>
				<p className="text-sm text-muted-foreground">{protocol.description}</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<section className="space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<CheckCircle2 className="h-4 w-4 text-emerald-500" />
						Preparação
					</div>
					<ul className="space-y-1 text-sm text-muted-foreground">
						{protocol.preparationChecklist.map((item) => (
							<li key={item}>• {item}</li>
						))}
					</ul>
				</section>

				<section className="space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Crosshair className="h-4 w-4 text-sky-500" />
						Captura ideal
					</div>
					<ul className="space-y-1 text-sm text-muted-foreground">
						{protocol.captureAngles.map((item) => (
							<li key={item}>• {item}</li>
						))}
					</ul>
				</section>

				<section className="space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<ListChecks className="h-4 w-4 text-violet-500" />
						Passo a passo
					</div>
					<ol className="space-y-1 text-sm text-muted-foreground">
						{protocol.executionSteps.map((item, index) => (
							<li key={item}>
								{index + 1}. {item}
							</li>
						))}
					</ol>
				</section>

				<section className="space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Radar className="h-4 w-4 text-amber-500" />
						Saídas esperadas
					</div>
					<ul className="space-y-1 text-sm text-muted-foreground">
						{protocol.measuredOutputs.map((item) => (
							<li key={item}>• {item}</li>
						))}
					</ul>
				</section>
			</CardContent>
		</Card>
	);
}
