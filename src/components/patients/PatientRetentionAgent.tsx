import React, { useState, useEffect } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	Bot,
	CheckCircle2,
	Send,
	XCircle,
	RefreshCcw,
	Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RetentionState {
	missedSessions: number;
	lastPainLevel: number;
	riskScore: number;
	status: string;
	draftMessage: string | null;
	suggestedAction: string | null;
}

interface PatientRetentionAgentProps {
	patientId: string;
	patientName: string;
}

export const PatientRetentionAgent: React.FC<PatientRetentionAgentProps> = ({
	patientId,
	patientName,
}) => {
	const [state, setState] = useState<RetentionState | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isUpdating, setIsUpdating] = useState(false);

	// Simulação de conexão com o Agente (Durable Object) via API do Worker
	const fetchAgentStatus = async () => {
		try {
			// No mundo real, usaríamos useAgent do Agents SDK.
			// Aqui, vamos bater na rota do Worker que faz o proxy para o Durable Object.
			const res = await fetch(
				`https://fisioflow-api.rafalegollas.workers.dev/agents/patient-agent/${patientId}`,
			);
			if (res.ok) {
				const data = await res.json();
				setState(data.state);
			}
		} catch (e) {
			console.error("Failed to fetch agent status", e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchAgentStatus();
		// Polling a cada 30s para atualizar o estado do agente autônomo
		const interval = setInterval(fetchAgentStatus, 30000);
		return () => clearInterval(interval);
	}, [patientId]);

	const handleManualUpdate = async () => {
		setIsUpdating(true);
		try {
			// Trigger manual para o agente reavaliar o paciente
			const res = await fetch(
				`https://fisioflow-api.rafalegollas.workers.dev/agents/patient-agent/${patientId}/updateClinicalStatus`,
				{
					method: "POST",
					body: JSON.stringify({ name: patientName }),
				},
			);
			if (res.ok) {
				toast.success("Agente atualizado com sucesso!");
				fetchAgentStatus();
			}
		} catch  {
			toast.error("Erro ao comunicar com o agente.");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDismiss = async () => {
		try {
			await fetch(
				`https://fisioflow-api.rafalegollas.workers.dev/agents/patient-agent/${patientId}/dismissAction`,
				{ method: "POST" },
			);
			toast.info("Ação arquivada pelo Agente.");
			fetchAgentStatus();
		} catch  {}
	};

	if (isLoading)
		return <div className="h-20 animate-pulse bg-muted rounded-xl" />;

	const riskColor =
		(state?.riskScore || 0) > 70
			? "text-red-500"
			: (state?.riskScore || 0) > 40
				? "text-orange-500"
				: "text-emerald-500";

	return (
		<Card className="border-indigo-500/20 shadow-sm bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/10 overflow-hidden">
			<CardHeader className="pb-3 border-b border-indigo-500/10">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
							<Bot className="h-5 w-5" />
						</div>
						<div>
							<CardTitle className="text-base font-black">
								Agente de Retenção
							</CardTitle>
							<CardDescription className="text-[10px] uppercase font-bold tracking-widest text-indigo-600/60">
								Cloudflare Autonomous Agent
							</CardDescription>
						</div>
					</div>
					<Badge
						variant="outline"
						className={cn(
							"text-[10px] font-black uppercase tracking-tighter px-2 py-0",
							riskColor,
						)}
					>
						{state?.status || "MONITORANDO"}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="pt-4 space-y-4">
				{/* Risco de Churn */}
				<div className="space-y-1.5">
					<div className="flex justify-between items-end">
						<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
							Risco de Abandono
						</span>
						<span
							className={cn("text-lg font-black tracking-tighter", riskColor)}
						>
							{state?.riskScore || 0}%
						</span>
					</div>
					<Progress value={state?.riskScore || 0} className="h-1.5" />
				</div>

				{/* Sugestão da IA */}
				{state?.draftMessage ? (
					<div className="p-3 rounded-xl bg-white/80 dark:bg-black/40 border border-indigo-500/20 animate-in zoom-in-95 duration-300">
						<div className="flex items-center gap-2 mb-2">
							<Zap className="h-3.5 w-3.5 text-amber-500" />
							<span className="text-[11px] font-bold text-indigo-600 uppercase">
								Sugestão de Recuperação
							</span>
						</div>
						<p className="text-xs text-muted-foreground leading-relaxed italic mb-3">
							"{state.draftMessage}"
						</p>
						<div className="flex gap-2">
							<Button
								size="sm"
								className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
							>
								<Send className="h-3 w-3 mr-1.5" /> Enviar WhatsApp
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={handleDismiss}
								className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
							>
								<XCircle className="h-3 w-3 mr-1.5" /> Ignorar
							</Button>
						</div>
					</div>
				) : (
					<div className="p-3 rounded-xl border border-dashed border-border/60 text-center py-6">
						<CheckCircle2 className="h-6 w-6 text-emerald-500/40 mx-auto mb-2" />
						<p className="text-[11px] font-bold text-muted-foreground uppercase">
							Paciente Engajado
						</p>
						<p className="text-[10px] text-muted-foreground/60">
							O Agente não detectou riscos imediatos.
						</p>
					</div>
				)}

				<div className="flex items-center justify-between pt-2">
					<div className="flex gap-3">
						<div className="text-center">
							<p className="text-[10px] font-bold text-muted-foreground uppercase">
								Faltas
							</p>
							<p className="text-sm font-black">{state?.missedSessions || 0}</p>
						</div>
						<div className="text-center border-l border-border pl-3">
							<p className="text-[10px] font-bold text-muted-foreground uppercase">
								Última Dor
							</p>
							<p className="text-sm font-black">
								{state?.lastPainLevel || 0}/10
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="icon"
						onClick={handleManualUpdate}
						disabled={isUpdating}
						className="h-8 w-8 rounded-lg border-indigo-500/20 text-indigo-600 hover:bg-indigo-50"
					>
						<RefreshCcw
							className={cn("h-3.5 w-3.5", isUpdating && "animate-spin")}
						/>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
