import React from "react";
import { motion } from "framer-motion";
import {
	X,
	Calendar,
	Target,
	AlertTriangle,
	Clock,
	ChevronRight,
	Activity,
	Milestone,
	BookOpen,
	CheckCircle2,
	Info,
	Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type ExerciseProtocol } from "@/hooks/useExerciseProtocols";

interface ProtocolDetailViewProps {
	protocol: ExerciseProtocol;
	onClose: () => void;
	onEdit?: (protocol: ExerciseProtocol) => void;
}

const ProtocolDetailView: React.FC<ProtocolDetailViewProps> = ({
	protocol,
	onClose,
	onEdit,
}) => {
	// Helpers to safely parse JSON fields if they are strings (sometimes happens with DB drivers)
	const getArrayField = (field: any) => {
		if (Array.isArray(field)) return field;
		if (typeof field === "string") {
			try {
				return JSON.parse(field);
			} catch  {
				return [];
			}
		}
		return [];
	};

	const milestones = getArrayField(protocol.milestones);
	const restrictions = getArrayField(protocol.restrictions);
	 // Assuming it might exist based on description
	 // Some protocols have phases

	const containerVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.5,
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, x: -10 },
		visible: { opacity: 1, x: 0 },
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md overflow-hidden">
			<motion.div
				initial="hidden"
				animate="visible"
				variants={containerVariants}
				className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden flex flex-col shadow-premium-lg border border-border"
			>
				{/* Header Section */}
				<div className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/10 via-white to-white p-6 sm:p-8 flex flex-col justify-end border-b border-border shadow-sm">
					<button
						onClick={onClose}
						className="absolute top-6 right-6 p-2 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all z-10"
					>
						<X className="w-5 h-5" />
					</button>

					<div className="space-y-3">
						<div className="flex flex-wrap items-center gap-2">
							<Badge className="bg-primary text-white hover:bg-primary/90 font-bold px-3 py-1 rounded-lg">
								{protocol.protocol_type === "pos_operatorio"
									? "Pós-Operatório"
									: "Patologia"}
							</Badge>
							<Badge
								variant="outline"
								className="border-primary/20 text-primary bg-primary/5 px-3 py-1 rounded-lg"
							>
								{protocol.condition_name}
							</Badge>
						</div>

						<h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
							{protocol.name}
						</h1>

						<div className="flex items-center gap-4 text-muted-foreground text-sm font-medium">
							<span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
								<Clock className="w-4 h-4 text-primary" />
								{protocol.weeks_total} semanas
							</span>
							<span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
								<Activity className="w-4 h-4 text-primary" />
								{milestones.length} marcos
							</span>
						</div>
					</div>

					{/* Decorative background glow */}
					<div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
					{/* Timeline Visualization */}
					<section className="space-y-4">
						<h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-3">
							<div className="h-6 w-1 rounded-full bg-primary" />
							<Calendar className="w-4 h-4" /> Linha do Tempo
						</h3>
						<div className="relative p-6 rounded-2xl bg-secondary/20 border border-border overflow-hidden shadow-inner-border">
							<div className="flex mt-2 mb-10 relative">
								<div className="absolute top-3.5 left-0 right-0 h-1 bg-border rounded-full overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: "100%" }}
										transition={{ duration: 1.5, ease: "easeInOut" }}
										className="h-full bg-gradient-to-r from-primary to-primary/40"
									/>
								</div>

								{/* Milestone Markers on Timeline */}
								<div className="flex justify-between w-full z-10">
									{[0, 25, 50, 75, 100].map((percent) => (
										<div key={percent} className="flex flex-col items-center">
											<div
												className={cn(
													"w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500",
													percent <= 50
														? "bg-white border-primary shadow-lg"
														: "bg-white border-border",
												)}
											>
												<div
													className={cn(
														"w-2 h-2 rounded-full",
														percent <= 50 ? "bg-primary" : "bg-muted",
													)}
												/>
											</div>
											<span className="text-[10px] text-muted-foreground/60 mt-3 font-black uppercase tracking-widest">
												Sem{" "}
												{Math.round(
													(percent / 100) * (protocol.weeks_total || 12),
												)}
											</span>
										</div>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border shadow-sm">
									<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger>
													<Milestone className="w-5 h-5 text-primary" />
												</TooltipTrigger>
												<TooltipContent>Próximo Marco Crítico</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
									<div>
										<p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
											Status Atual
										</p>
										<p className="text-sm font-bold text-foreground">
											Início do Protocolo
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border shadow-sm">
									<div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
										<Target className="w-5 h-5 text-orange-500" />
									</div>
									<div>
										<p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
											Objetivo Final
										</p>
										<p className="text-sm font-bold text-foreground">
											Retorno Total
										</p>
									</div>
								</div>
							</div>
						</div>
					</section>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Left Column: Details & Phases */}
						<div className="lg:col-span-2 space-y-8">
							{/* Description */}
							<motion.div variants={itemVariants} className="space-y-3">
								<h3 className="text-xs font-black uppercase tracking-widest text-primary">
									Visão Geral
								</h3>
								<p className="text-muted-foreground leading-relaxed text-base">
									{(protocol as any).description ||
										"Este protocolo estabelece diretrizes para a progressão segura baseada em marcos de recuperação, respeitando a biologia da cicatrização e buscando o retorno funcional otimizado."}
								</p>
							</motion.div>

							{/* Milestones / Phases Detailed */}
							<motion.div variants={itemVariants} className="space-y-4">
								<h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-3">
									<div className="h-4 w-1 rounded-full bg-primary" />
									Marcos de Progressão
								</h3>

								<div className="space-y-3">
									{milestones.length === 0 ? (
										<div className="p-8 text-center border border-dashed border-border rounded-2xl text-muted-foreground/30 font-bold bg-secondary/10">
											Nenhum marco detalhado disponível.
										</div>
									) : (
										milestones.map((m: any, idx: number) => (
											<div
												key={idx}
												className="group flex gap-5 p-5 rounded-2xl bg-white border border-border hover:border-primary/30 hover:shadow-premium-md transition-all cursor-default"
											>
												<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl group-hover:scale-110 transition-transform">
													{m.week}
												</div>
												<div className="space-y-1">
													<h4 className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
														Semana {m.week}{" "}
														<ChevronRight className="w-4 h-4 text-muted-foreground/30" />
													</h4>
													<p className="text-sm text-muted-foreground leading-relaxed">
														{m.description}
													</p>
												</div>
											</div>
										))
									)}
								</div>
							</motion.div>
						</div>

						{/* Right Column: Restrictions & Cautions */}
						<div className="space-y-8">
							{/* Restrictions */}
							<motion.div variants={itemVariants} className="space-y-4">
								<h3 className="text-xs font-black uppercase tracking-widest text-destructive flex items-center gap-2">
									<AlertTriangle className="w-4 h-4" /> Restrições Críticas
								</h3>

								<div className="space-y-3">
									{restrictions.length === 0 ? (
										<div className="p-4 bg-success/5 border border-success/10 rounded-xl text-success/70 text-xs flex items-center gap-2 font-bold">
											<CheckCircle2 className="w-4 h-4" /> Nenhuma restrição severa.
										</div>
									) : (
										restrictions.map((r: any, idx: number) => (
											<div
												key={idx}
												className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 space-y-2"
											>
												<div className="flex items-center justify-between">
													<span className="text-[10px] font-black uppercase text-destructive bg-destructive/10 px-2 py-0.5 rounded">
														Semanas {r.week_start}{" "}
														{r.week_end ? `- ${r.week_end}` : ""}
													</span>
													<AlertTriangle className="w-3 h-3 text-destructive" />
												</div>
												<p className="text-xs text-foreground font-bold">
													{r.description}
												</p>
											</div>
										))
									)}
								</div>
							</motion.div>

							{/* Extra Info / Notes */}
							<motion.div
								variants={itemVariants}
								className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4"
							>
								<h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
									<Info className="w-4 h-4" /> Notas Clínicas
								</h4>
								<div className="space-y-3">
									<div className="flex gap-3">
										<div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
										<p className="text-xs text-muted-foreground leading-relaxed italic">
											Monitorar dor na Escala Visual Analógica (EVA).
										</p>
									</div>
									<div className="flex gap-3">
										<div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
										<p className="text-xs text-muted-foreground leading-relaxed italic">
											Respeitar fadiga muscular local.
										</p>
									</div>
								</div>
							</motion.div>

							{/* References */}
							<motion.div variants={itemVariants} className="space-y-3">
								<h3 className="text-xs font-black uppercase tracking-widest text-primary">
									Base de Evidência
								</h3>
								<div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border hover:border-primary/30 transition-all cursor-pointer group shadow-sm">
									<div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
										<BookOpen className="w-4 h-4" />
									</div>
									<p className="text-[11px] text-muted-foreground font-bold group-hover:text-primary transition-colors">
										Clinical Practice Guidelines (2025)
									</p>
								</div>
							</motion.div>
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-6 border-t border-border bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl border border-primary/20 flex items-center justify-center bg-white shadow-sm">
							<Activity className="w-5 h-5 text-primary" />
						</div>
						<div>
							<p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest leading-none">
								Protocolo Adaptável
							</p>
							<p className="text-sm text-foreground font-black">
								FisioFlow Intelligence
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 w-full sm:w-auto">
						{onEdit && (
							<Button
								variant="outline"
								onClick={() => onEdit(protocol)}
								className="flex-1 sm:flex-none h-11 px-6 rounded-xl border-border text-muted-foreground hover:text-primary hover:border-primary/20"
							>
								<Edit className="w-4 h-4 mr-2" /> Editar
							</Button>
						)}
						<Button
							onClick={onClose}
							className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl shadow-lg hover:shadow-primary/20"
						>
							Concluído <ChevronRight className="w-4 h-4 ml-2" />
						</Button>
					</div>
				</div>
			</motion.div>
		</div>
	);
};

export default ProtocolDetailView;
