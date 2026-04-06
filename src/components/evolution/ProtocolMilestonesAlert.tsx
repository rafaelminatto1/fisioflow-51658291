import React from "react";
import { useWorkersProtocols } from "@/hooks/useExerciseProtocols";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Trophy,
	Calendar,
	ChevronRight,
	CheckCircle2,
	Timer,
	Info,
	Copy,
	ExternalLink,
} from "lucide-react";
import { differenceInWeeks, parseISO } from "date-fns";
import { toast } from "sonner";

interface ProtocolMilestonesAlertProps {
	patientId: string;
	surgeries: any[];
	pathologies: any[];
	onApplyMilestone?: (milestone: string) => void;
	onViewProtocol?: (protocolId: string) => void;
}

export const ProtocolMilestonesAlert: React.FC<
	ProtocolMilestonesAlertProps
> = ({
	patientId: _patientId,
	surgeries,
	pathologies,
	onApplyMilestone,
	onViewProtocol,
}) => {
	// Tenta encontrar um protocolo baseado na primeira cirurgia ou patologia
	const activeCondition =
		surgeries[0]?.surgery_name || pathologies[0]?.pathology_name;
	const startDate =
		surgeries[0]?.surgery_date || pathologies[0]?.diagnosis_date;

	const { protocols, loading } = useWorkersProtocols({
		q: activeCondition,
		limit: 1,
	});

	if (loading || !protocols.length || !startDate) return null;

	const protocol = protocols[0];
	const currentWeek = Math.max(
		1,
		differenceInWeeks(new Date(), parseISO(startDate)) + 1,
	);

	// Filtra marcos relevantes para a semana atual ou próximas
	const allMilestones = Array.isArray(protocol.milestones)
		? protocol.milestones
		: [];
	const currentMilestones = allMilestones.filter(
		(m: any) => m.week === currentWeek,
	);
	const nextMilestones = allMilestones
		.filter((m: any) => m.week > currentWeek)
		.sort((a: any, b: any) => a.week - b.week)
		.slice(0, 1);

	const handleCopy = (text: string) => {
		if (onApplyMilestone) {
			onApplyMilestone(text);
			toast.success("Marco copiado para o campo de Avaliação!");
		} else {
			navigator.clipboard.writeText(text);
			toast.success("Copiado para a área de transferência");
		}
	};

	if (currentMilestones.length === 0 && nextMilestones.length === 0)
		return null;

	return (
		<Card className="border-emerald-500/20 bg-emerald-500/5 overflow-hidden shadow-premium-sm">
			<CardHeader className="py-3 bg-emerald-500/10 border-b border-emerald-500/10">
				<CardTitle className="text-sm font-bold flex items-center justify-between text-emerald-700">
					<div className="flex items-center gap-2">
						<Trophy className="h-4 w-4" />
						Metas do Protocolo: {protocol.name}
					</div>
					<Badge
						variant="outline"
						className="bg-emerald-100 text-emerald-700 border-emerald-200"
					>
						Semana {currentWeek}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4 space-y-4">
				{currentMilestones.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
							<CheckCircle2 className="h-3 w-3" />
							Esperado para esta semana
						</div>
						{currentMilestones.map((m: any, idx: number) => (
							<Alert key={idx} className="bg-white border-emerald-200/50 group">
								<div className="flex items-start justify-between gap-2 w-full">
									<div className="flex gap-2">
										<Timer className="h-4 w-4 text-emerald-500 mt-1" />
										<AlertDescription className="text-sm font-medium">
											{m.description}
										</AlertDescription>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
										onClick={() => handleCopy(m.description)}
									>
										<Copy className="h-3.5 w-3.5 text-emerald-600" />
									</Button>
								</div>
							</Alert>
						))}
					</div>
				)}

				{nextMilestones.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
							<Calendar className="h-3 w-3" />
							Próximo Marco (Semana {nextMilestones[0].week})
						</div>
						<div className="flex items-center justify-between p-3 bg-white/50 border border-slate-200 rounded-lg group">
							<span className="text-sm text-slate-700">
								{nextMilestones[0].description}
							</span>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => handleCopy(nextMilestones[0].description)}
								>
									<Copy className="h-3.5 w-3.5 text-slate-400" />
								</Button>
								<ChevronRight className="h-4 w-4 text-slate-300" />
							</div>
						</div>
					</div>
				)}

				<div className="pt-2 flex justify-between items-center border-t border-emerald-500/10 mt-2">
					{protocol.wiki_page_id && (
						<Button
							variant="link"
							size="sm"
							className="text-xs text-blue-600 h-auto p-0 flex items-center gap-1"
							onClick={() =>
								window.open(`/wiki/article/${protocol.wiki_page_id}`, "_blank")
							}
						>
							<ExternalLink className="h-3 w-3" /> Wiki
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50 h-auto py-1"
						onClick={() => onViewProtocol?.(protocol.id)}
					>
						<Info className="h-3 w-3 mr-1" /> Ver detalhes
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
