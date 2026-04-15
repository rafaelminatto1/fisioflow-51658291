import {
	ArrowUpRight,
	Brain,
	MoreHorizontal,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSmartDashboardData } from "@/hooks/useSmartDashboard";
import { BentoDashboard } from "@/components/dashboard/BentoDashboard";
import { cn } from "@/lib/utils";

// --- Types & Constants ---
type ViewMode = "today" | "week" | "month" | "custom";

export function SmartDashboardContent() {
	const [searchParams, setSearchParams] = useSearchParams();
	const viewMode = (searchParams.get("view") || "today") as ViewMode;

	const { data } = useSmartDashboardData(viewMode);
	const {
		medicalReturnsUpcoming = [],
	} = data;

	const navigate = useNavigate();

	const handleViewModeChange = (mode: ViewMode) => {
		setSearchParams({ view: mode }, { replace: true });
	};

	return (
		<div
			className="space-y-6 pb-20 w-full"
			data-testid="smart-dashboard-page"
		>
				{/* Modern Header */}
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pt-4">
					<div className="flex items-center gap-5">
						<div className="relative">
							<div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-2xl ring-1 ring-white/20">
								<Brain className="h-7 w-7 text-white" />
							</div>
							<div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-background animate-pulse">
								<Sparkles className="h-3 w-3 text-white" />
							</div>
						</div>
						<div>
							<div className="flex items-center gap-2 mb-1">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
								<p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] font-display">
									Inteligência Clínica Ativa
								</p>
							</div>
							<h1 className="text-2xl md:text-3xl font-black tracking-tighter text-primary dark:text-primary flex items-center gap-3 font-display">
								Smart Dashboard
								<Badge
									variant="outline"
									className="text-[10px] font-black uppercase bg-primary/5 text-primary border-primary/20 tracking-widest px-2 py-0 font-display"
								>
									v2.0 Beta
								</Badge>
							</h1>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center bg-secondary/30 p-1 rounded-2xl border border-border/50 shadow-inner">
							{["today", "week", "month"].map((mode) => (
								<Button
									key={mode}
									variant={viewMode === mode ? "default" : "ghost"}
									size="sm"
									onClick={() => handleViewModeChange(mode as ViewMode)}
									className={cn(
										"rounded-xl px-4 text-[10px] font-black uppercase tracking-widest h-8 transition-all duration-300 magnetic-button font-display",
										viewMode === mode && "shadow-lg scale-105",
									)}
								>
									{mode === "today"
										? "Hoje"
										: mode === "week"
											? "Semana"
											: "Mês"}
								</Button>
							))}
						</div>
						<Button
							variant="outline"
							size="icon"
							className="h-10 w-10 rounded-2xl bg-background/50 border-border/50 hover:bg-primary/5 hover:border-primary/20 magnetic-button glow-on-hover"
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Dynamic Alerts Section */}
				{medicalReturnsUpcoming.length > 0 && (
					<div
						className="bg-gradient-to-r from-blue-600/10 via-primary/5 to-transparent border-l-4 border-l-primary rounded-r-2xl p-4 flex items-center gap-5 group cursor-pointer hover:bg-primary/10 transition-all duration-300 card-premium-hover"
						onClick={() => navigate("/relatorios/medico")}
					>
						<div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
							<Stethoscope className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="font-black text-sm text-foreground flex items-center gap-2 font-display">
								Preparar Relatórios Médicos
								<Badge className="bg-primary text-white text-[10px] px-1.5 py-0 border-0 font-display">
									{medicalReturnsUpcoming.length}
								</Badge>
							</h3>
							<p className="text-xs text-muted-foreground font-medium truncate">
								{medicalReturnsUpcoming.length} pacientes possuem retornos
								médicos agendados para os próximos 14 dias.
								<span className="text-primary ml-1 font-bold underline-offset-4 hover:underline">
									Gerar documentação agora
								</span>
							</p>
						</div>
						<ArrowUpRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors mr-2" />
					</div>
				)}

				<BentoDashboard viewMode={viewMode} />
			</div>
	);
}
