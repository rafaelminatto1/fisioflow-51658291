import React from "react";
import { useQuery } from "@tanstack/react-query";
import { iaStudioApi, AtRiskPatient } from "@/api/v2";
import { 
	MessageSquare, 
	AlertTriangle, 
	ArrowUpRight, 
	Clock,
	Send,
	CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const FisioRetention: React.FC = () => {
	const { data, isLoading } = useQuery({
		queryKey: ["ia-studio", "retention"],
		queryFn: () => iaStudioApi.getAtRiskPatients(),
	});

	const handleSendWhatsApp = (patient: AtRiskPatient) => {
		toast.success(`Mensagem de reengajamento enviada para ${patient.fullName}`);
	};

	if (isLoading) {
		return <div className="space-y-4">
			{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
		</div>;
	}

	const patients = data?.data || [];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-bold flex items-center gap-2">
					<AlertTriangle className="w-5 h-5 text-amber-500" />
					Pacientes com Risco de Churn
				</h3>
				<Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
					{patients.length} Alertas
				</Badge>
			</div>

			<div className="grid grid-cols-1 gap-4">
				{patients.map((p, idx) => (
					<motion.div
						key={p.id}
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: idx * 0.1 }}
					>
						<Card className="border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 rounded-2xl overflow-hidden group">
							<CardContent className="p-5 flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="relative">
										<div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
											{p.fullName.charAt(0)}
										</div>
										<div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
											!
										</div>
									</div>
									<div className="space-y-1">
										<h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
											{p.fullName}
											<Badge className="bg-red-500/10 text-red-500 border-none text-[9px] h-4">
												Risco {p.riskScore}%
											</Badge>
										</h4>
										<p className="text-xs text-slate-500 flex items-center gap-1">
											<Clock className="w-3 h-3" />
											Última sessão: {new Date(p.lastSession).toLocaleDateString()} • {p.reason}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<Button 
										size="sm" 
										variant="outline"
										className="rounded-xl h-9 gap-1.5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
										onClick={() => handleSendWhatsApp(p)}
									>
										<MessageSquare className="w-3.5 h-3.5" />
										Reengajar
									</Button>
									<Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
										<ArrowUpRight className="w-4 h-4" />
									</Button>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				))}

				{patients.length === 0 && (
					<div className="text-center py-12 bg-emerald-500/5 rounded-[32px] border border-dashed border-emerald-500/20">
						<CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
						<p className="text-emerald-700 font-medium">Parabéns! Sua retenção está em 100%.</p>
						<p className="text-xs text-emerald-600/70">Nenhum paciente em risco detectado pela IA hoje.</p>
					</div>
				)}
			</div>
		</div>
	);
};
