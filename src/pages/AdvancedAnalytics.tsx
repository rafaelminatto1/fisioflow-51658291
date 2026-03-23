import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
	BarChart3,
	LayoutDashboard,
	Sparkles,
} from "lucide-react";
import { AppointmentAnalytics } from "@/components/analytics/AppointmentAnalytics";
import { PatientAnalytics } from "@/components/analytics/PatientAnalytics";
import { FinancialAnalytics } from "@/components/analytics/FinancialAnalytics";
import { PredictiveAnalytics } from "@/components/analytics/PredictiveAnalytics";
import { InternalDashboard } from "@/components/analytics/InternalDashboard";
import { useAnalyticsSummary } from "@/hooks/useAnalyticsSummary";
import { AnalyticsFiltersProvider } from "@/contexts/AnalyticsFiltersContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";

function AdvancedAnalyticsContent() {
	const { summary, isLoading } = useAnalyticsSummary();

	return (
		<div className="px-4 sm:px-8 py-6 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
			{/* Enhanced header */}
			<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
				<div className="space-y-4">
					<div className="flex items-center gap-4">
						<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-primary/20">
							<BarChart3 className="h-6 w-6 text-primary" />
						</div>
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
									Advanced Analytics <span className="text-primary">& IA</span>
								</h1>
								<div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
									<div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
									Real-time Active
								</div>
							</div>
							<p className="text-sm text-muted-foreground font-medium mt-1 max-w-2xl">
								Insights inteligentes e previsões baseadas em inteligência artificial para otimizar o desempenho da sua clínica.
							</p>
						</div>
					</div>

					{isLoading ? (
						<Skeleton className="h-8 w-full max-w-md rounded-xl" />
					) : (
						<div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-primary" />
								<span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
									<span className="text-foreground text-sm mr-1">
										{summary?.totalAppointments ?? 0}
									</span>{" "}
									Agendamentos
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-emerald-500" />
								<span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
									<span className="text-foreground text-sm mr-1">
										{summary?.activePatients ?? 0}
									</span>{" "}
									Ativos
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-amber-500" />
								<span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
									<span className="text-foreground text-sm mr-1">
										R${" "}
										{(summary?.monthlyRevenue ?? 0).toLocaleString("pt-BR", {
											minimumFractionDigits: 2,
										})}
									</span>{" "}
									Receita
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-blue-500" />
								<span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
									<span className="text-foreground text-sm mr-1">
										{summary?.occupancyRate ?? 0}%
									</span>{" "}
									Ocupação
								</span>
							</div>
						</div>
					)}
				</div>
				<div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl text-xs font-bold text-primary shadow-sm hover:shadow-md transition-all cursor-default group shrink-0">
					<Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
					Powered by Gemini AI
				</div>
			</div>

			{/* Filtros Globais */}
			<div className="relative">
				<div className="absolute -inset-1 bg-gradient-to-r from-primary/5 to-transparent rounded-[2rem] blur-2xl opacity-50" />
				<AnalyticsFilters />
			</div>

			{/* Tabs de Analytics */}
			<Tabs defaultValue="dashboard" className="space-y-6">
				<div className="flex items-center justify-between overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
					<TabsList className="h-12 inline-flex items-center justify-start p-1.5 bg-muted/50 rounded-2xl border border-border/50 backdrop-blur-sm">
						<TabsTrigger
							value="dashboard"
							className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
						>
							<LayoutDashboard className="h-3.5 w-3.5" />
							Dashboard
						</TabsTrigger>
						<TabsTrigger
							value="appointments"
							className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
						>
							Agendamentos
						</TabsTrigger>
						<TabsTrigger
							value="patients"
							className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
						>
							Pacientes
						</TabsTrigger>
						<TabsTrigger
							value="financial"
							className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
						>
							Financeiro
						</TabsTrigger>
						<TabsTrigger
							value="predictive"
							className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
						>
							<Sparkles className="h-3.5 w-3.5" />
							Preditivo
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent
					value="dashboard"
					className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
				>
					<InternalDashboard />
				</TabsContent>

				<TabsContent
					value="appointments"
					className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
				>
					<AppointmentAnalytics />
				</TabsContent>

				<TabsContent
					value="patients"
					className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
				>
					<PatientAnalytics />
				</TabsContent>

				<TabsContent
					value="financial"
					className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
				>
					<FinancialAnalytics />
				</TabsContent>

				<TabsContent
					value="predictive"
					className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
				>
					<PredictiveAnalytics />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default function AdvancedAnalytics() {
	return (
		<MainLayout fullWidth>
			<AnalyticsFiltersProvider>
				<AdvancedAnalyticsContent />
			</AnalyticsFiltersProvider>
		</MainLayout>
	);
}
