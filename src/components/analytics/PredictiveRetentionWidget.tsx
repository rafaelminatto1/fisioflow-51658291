import React from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2/insights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MessageSquare, Calendar, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function PredictiveRetentionWidget() {
	const navigate = useNavigate();
	const { data: atRisk = [], isLoading } = useQuery({
		queryKey: ["analytics", "retention", "risk"],
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		queryFn: async () => {
			const res = await (analyticsApi as any).retentionRisk();
			return res.data || [];
		},
	});

	if (isLoading) {
		return <Skeleton className="h-[350px] w-full rounded-3xl" />;
	}

	return (
		<Card className="rounded-3xl border-border/40 shadow-premium-lg flex flex-col h-full bg-white/50 backdrop-blur-sm">
			<CardHeader className="pb-3 border-b border-border/10">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
							<AlertTriangle className="h-4 w-4" />
						</div>
						<CardTitle className="text-sm font-black uppercase tracking-widest">Risco de Evasão</CardTitle>
					</div>
					<Badge variant="destructive" className="rounded-full text-[10px] font-black px-2">{atRisk.length}</Badge>
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-0 overflow-hidden">
				{atRisk.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-2">
						<div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
							<ArrowRight className="h-6 w-6" />
						</div>
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tudo em ordem</p>
						<p className="text-[10px] text-muted-foreground">Nenhum paciente com risco detectado hoje.</p>
					</div>
				) : (
					<div className="divide-y divide-border/10">
						{atRisk.map((patient: any) => (
							<div key={patient.id} className="p-4 hover:bg-slate-50 transition-colors group">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<Avatar className="h-9 w-9 border-2 border-white shadow-sm">
											<AvatarFallback className="text-[10px] font-bold bg-amber-100 text-amber-700">
												{patient.full_name.charAt(0)}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0">
											<p className="text-xs font-black uppercase tracking-tight truncate w-32">{patient.full_name}</p>
											<p className="text-[9px] text-muted-foreground font-medium">
												Última: {patient.last_appointment 
													? formatDistanceToNow(new Date(patient.last_appointment), { addSuffix: true, locale: ptBR })
													: "Sem registro"}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
										<Button 
											size="icon" 
											variant="outline" 
											className="h-7 w-7 rounded-lg border-border/40 hover:bg-green-50 hover:text-green-600"
											onClick={() => navigate(`/communications?patientId=${patient.id}&channel=whatsapp`)}
										>
											<MessageSquare className="h-3.5 w-3.5" />
										</Button>
										<Button 
											size="icon" 
											variant="outline" 
											className="h-7 w-7 rounded-lg border-border/40 hover:bg-blue-50 hover:text-blue-600"
											onClick={() => navigate(`/agenda?patientId=${patient.id}`)}
										>
											<Calendar className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
								{patient.missed_count > 0 && (
									<div className="mt-2 flex items-center gap-1.5">
										<div className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-tighter border border-red-100">
											{patient.missed_count} Faltas Recentes
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</CardContent>
			<div className="p-3 border-t border-border/10 bg-muted/5">
				<Button 
					variant="ghost" 
					className="w-full h-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
					onClick={() => navigate("/communications")}
				>
					Ver Todas as Pendências
				</Button>
			</div>
		</Card>
	);
}
