import React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
	Stethoscope,
	ChevronDown,
	Info,
	Edit,
	ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
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
			} catch (e) {
				return [];
			}
		}
		return [];
	};

	const milestones = getArrayField(protocol.milestones);
	const restrictions = getArrayField(protocol.restrictions);
	const objectives = getArrayField((protocol as any).objectives); // Assuming it might exist based on description
	const phases = getArrayField((protocol as any).phases); // Some protocols have phases

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
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
			<motion.div
				initial="hidden"
				animate="visible"
				variants={containerVariants}
				className="relative w-full max-w-4xl max-h-[90vh] glass-card rounded-3xl overflow-hidden flex flex-col bg-[#0f172a]/95 border-white/10"
			>
				{/* Header Section */}
				<div className="relative h-48 sm:h-56 bg-gradient-to-br from-[#13ecc8]/20 via-[#0f172a] to-[#0f172a] p-6 sm:p-8 flex flex-col justify-end border-b border-white/5">
					<button
						onClick={onClose}
						className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all z-10"
					>
						<X className="w-5 h-5" />
					</button>

					<div className="space-y-3">
						<div className="flex flex-wrap items-center gap-2">
							<Badge className="bg-[#13ecc8] text-black hover:bg-[#11d8b7] font-bold">
								{protocol.protocol_type === "pos_operatorio"
									? "Pós-Operatório"
									: "Patologia"}
							</Badge>
							<Badge
								variant="outline"
								className="border-white/20 text-white/70 backdrop-blur-md"
							>
								{protocol.condition_name}
							</Badge>
						</div>

						<h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
							{protocol.name}
						</h1>

						<div className="flex items-center gap-4 text-white/50 text-sm">
							<span className="flex items-center gap-1.5">
								<Clock className="w-4 h-4 text-[#13ecc8]" />
								{protocol.weeks_total} semanas de duração
							</span>
							<span className="flex items-center gap-1.5">
								<Activity className="w-4 h-4 text-[#13ecc8]" />
								{milestones.length} marcos definidos
							</span>
						</div>
					</div>

					{/* Decorative glow */}
					<div className="absolute top-0 left-0 w-64 h-64 bg-[#13ecc8]/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
				</div>

				{/* Content Tabs/Scrollable Area */}
				<div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
					{/* Timeline Visualization */}
					<section className="space-y-4">
						<h3 className="text-sm font-bold uppercase tracking-widest text-[#13ecc8] flex items-center gap-2">
							<Calendar className="w-4 h-4" /> Linha do Tempo de Recuperação
						</h3>
						<div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
							<div className="flex mt-2 mb-8 relative">
								<div className="absolute top-3 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: "100%" }}
										transition={{ duration: 1.5, ease: "easeInOut" }}
										className="h-full bg-gradient-to-r from-[#13ecc8] via-[#11d8b7] to-[#13ecc8]/30"
									/>
								</div>

								{/* Milestone Markers on Timeline */}
								<div className="flex justify-between w-full z-10">
									{[0, 25, 50, 75, 100].map((percent) => (
										<div key={percent} className="flex flex-col items-center">
											<div
												className={cn(
													"w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-500",
													percent <= 50
														? "bg-black border-[#13ecc8] shadow-[0_0_10px_rgba(19,236,200,0.5)]"
														: "bg-black border-white/20",
												)}
											>
												<div
													className={cn(
														"w-2 h-2 rounded-full",
														percent <= 50 ? "bg-[#13ecc8]" : "bg-white/20",
													)}
												/>
											</div>
											<span className="text-[10px] text-white/40 mt-2 font-bold uppercase tracking-tighter">
												Semana{" "}
												{Math.round(
													(percent / 100) * (protocol.weeks_total || 12),
												)}
											</span>
										</div>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
									<div className="w-10 h-10 rounded-lg bg-[#13ecc8]/10 flex items-center justify-center">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger>
													<Milestone className="w-5 h-5 text-[#13ecc8]" />
												</TooltipTrigger>
												<TooltipContent>Próximo Marco Crítico</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
									<div>
										<p className="text-[10px] text-white/40 font-bold uppercase">
											Status Atual
										</p>
										<p className="text-sm font-medium text-white">
											Início do Protocolo
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
									<div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
										<Target className="w-5 h-5 text-orange-500" />
									</div>
									<div>
										<p className="text-[10px] text-white/40 font-bold uppercase">
											Objetivo Final
										</p>
										<p className="text-sm font-medium text-white">
											Retorno Total às Atividades
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
								<h3 className="text-sm font-bold uppercase tracking-widest text-[#13ecc8]">
									Visão Geral
								</h3>
								<p className="text-white/70 leading-relaxed">
									{(protocol as any).description ||
										"Este protocolo estabelece diretrizes para a progressão segura baseada em marcos de recuperação, respeitando a biologia da cicatrização e buscando o retorno funcional otimizado."}
								</p>
							</motion.div>

							{/* Milestones / Phases Detailed */}
							<motion.div variants={itemVariants} className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-[#13ecc8] flex items-center gap-2">
									<Target className="w-4 h-4" /> Marcos de Progressão
								</h3>

								<div className="space-y-3">
									{milestones.length === 0 ? (
										<div className="p-8 text-center border-2 border-dashed border-white/5 rounded-2xl text-white/30">
											Nenhum marco detalhado disponível.
										</div>
									) : (
										milestones.map((m: any, idx: number) => (
											<div
												key={idx}
												className="group flex gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-[#13ecc8]/30 transition-all cursor-default"
											>
												<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#13ecc8]/10 flex items-center justify-center text-[#13ecc8] font-black text-xl group-hover:scale-110 transition-transform">
													{m.week}
												</div>
												<div className="space-y-1">
													<h4 className="font-bold text-white group-hover:text-[#13ecc8] transition-colors flex items-center gap-2">
														Semana {m.week}{" "}
														<ChevronRight className="w-4 h-4 text-white/20" />
													</h4>
													<p className="text-sm text-white/60 leading-tight">
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
								<h3 className="text-sm font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
									<AlertTriangle className="w-4 h-4" /> Restrições Críticas
								</h3>

								<div className="space-y-3">
									{restrictions.length === 0 ? (
										<div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl text-green-500/70 text-xs flex items-center gap-2 font-medium">
											<CheckCircle2 className="w-4 h-4" /> Nenhuma restrição
											severa listada.
										</div>
									) : (
										restrictions.map((r: any, idx: number) => (
											<div
												key={idx}
												className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-1"
											>
												<div className="flex items-center justify-between">
													<span className="text-[10px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
														Semanas {r.week_start}{" "}
														{r.week_end ? `- ${r.week_end}` : ""}
													</span>
													<AlertTriangle className="w-3 h-3 text-red-400" />
												</div>
												<p className="text-xs text-white/80 font-medium">
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
								className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3"
							>
								<h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
									<Info className="w-4 h-4" /> Notas Clínicas
								</h4>
								<div className="space-y-2">
									<div className="flex gap-2 last:mb-0">
										<div className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
										<p className="text-[11px] text-white/60 leading-tight italic">
											Monitorar dor na Escala Visual Analógica (EVA).
										</p>
									</div>
									<div className="flex gap-2 last:mb-0">
										<div className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
										<p className="text-[11px] text-white/60 leading-tight italic">
											Respeitar fadiga muscular local.
										</p>
									</div>
								</div>
							</motion.div>

							{/* References */}
							<motion.div variants={itemVariants} className="space-y-3">
								<h3 className="text-sm font-bold uppercase tracking-widest text-[#13ecc8]">
									Base de Evidência
								</h3>
								<div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-colors cursor-pointer group">
									<div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
										<BookOpen className="w-4 h-4" />
									</div>
									<p className="text-[11px] text-white/50 font-medium group-hover:text-white transition-colors">
										Clinical Practice Guidelines (2025)
									</p>
								</div>
							</motion.div>
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-6 border-t border-white/10 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full border-2 border-[#13ecc8]/30 flex items-center justify-center bg-[#13ecc8]/10">
							<Activity className="w-5 h-5 text-[#13ecc8]" />
						</div>
						<div>
							<p className="text-xs text-white/40 font-bold uppercase">
								Protocolo Adaptável
							</p>
							<p className="text-sm text-white font-medium">
								FisioFlow Intelligence
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 w-full sm:w-auto">
						{onEdit && (
							<Button
								variant="ghost"
								onClick={() => onEdit(protocol)}
								className="flex-1 sm:flex-none text-white/70 hover:text-white hover:bg-white/10"
							>
								<Edit className="w-4 h-4 mr-2" /> Editar
							</Button>
						)}
						<Button
							onClick={onClose}
							className="flex-1 sm:flex-none bg-[#13ecc8] hover:bg-[#11d8b7] text-black font-bold h-11 px-8 shadow-[0_0_20px_rgba(19,236,200,0.2)]"
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
