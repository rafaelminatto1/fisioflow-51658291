import React from "react";
import { BiomechanicsAssessment } from "@/api/v2/biomechanics";
import { AnalyticalVideoPlayer } from "./video/AnalyticalVideoPlayer";
import { BiomechanicsOverlay } from "./canvas/BiomechanicsOverlay";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BiomechanicsComparisonProps {
	baseAssessment: BiomechanicsAssessment;
	compareAssessment: BiomechanicsAssessment;
}

export const BiomechanicsComparison: React.FC<BiomechanicsComparisonProps> = ({
	baseAssessment,
	compareAssessment,
}) => {
	const isVideo = (item: BiomechanicsAssessment) => item.mediaUrl.endsWith('.mp4');

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
			<AssessmentView assessment={baseAssessment} label="Base" />
			<AssessmentView assessment={compareAssessment} label="Comparação" />
		</div>
	);
};

const AssessmentView: React.FC<{ assessment: BiomechanicsAssessment; label: string }> = ({ assessment, label }) => {
	const isVideo = assessment.mediaUrl.endsWith('.mp4');

	return (
		<Card className="overflow-hidden border-primary/20">
			<CardHeader className="p-4 bg-muted/50">
				<div className="flex justify-between items-center">
					<Badge variant="outline">{label}</Badge>
					<span className="text-xs text-muted-foreground">
						{format(new Date(assessment.createdAt), "dd/MM/yyyy", { locale: ptBR })}
					</span>
				</div>
				<CardTitle className="text-sm font-bold mt-2">{assessment.type.replace('_', ' ').toUpperCase()}</CardTitle>
			</CardHeader>
			<div className="aspect-[3/4] relative bg-black">
				{isVideo ? (
					<AnalyticalVideoPlayer src={assessment.mediaUrl} showAnalysis={true} />
				) : (
					<div className="relative w-full h-full">
						<img src={assessment.mediaUrl} className="w-full h-full object-contain" alt="Static analysis" />
						<BiomechanicsOverlay 
							landmarks={assessment.analysisData.landmarks || []}
							width={400} // This should be dynamic or fixed aspect
							height={533}
							showSkeleton={true}
							showAngles={true}
						/>
					</div>
				)}
			</div>
			<div className="p-4 space-y-2">
				<h4 className="text-xs font-bold uppercase text-muted-foreground">Métricas Chave</h4>
				<div className="grid grid-cols-2 gap-2">
					{Object.entries(assessment.analysisData.angles || {}).map(([name, val]) => (
						<div key={name} className="bg-primary/5 p-2 rounded border border-primary/10">
							<p className="text-[10px] text-muted-foreground uppercase">{name}</p>
							<p className="text-sm font-bold">{val.toFixed(1)}°</p>
						</div>
					))}
				</div>
			</div>
		</Card>
	);
};
