import { useState, lazy, Suspense } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Download, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { IncompleteRegistrationAlert } from "@/components/dashboard/IncompleteRegistrationAlert";
import { RealtimeActivityFeed } from "@/components/dashboard/RealtimeActivityFeed";
import { DashboardNotificationWidget } from "@/components/dashboard/DashboardNotificationWidget";
import { AnalyticsFiltersProvider } from "@/contexts/AnalyticsFiltersContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DashboardPeriod } from "@/hooks/useDashboardMetrics";

const AdminDashboard = lazy(() =>
	import("@/components/dashboard/AdminDashboard").then((m) => ({
		default: m.AdminDashboard,
	})),
);
const PatientDashboard = lazy(() =>
	import("@/components/dashboard/PatientDashboard").then((m) => ({
		default: m.PatientDashboard,
	})),
);
const TherapistDashboard = lazy(() =>
	import("@/components/dashboard/TherapistDashboard").then((m) => ({
		default: m.TherapistDashboard,
	})),
);

const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
	{ value: "hoje", label: "Hoje" },
	{ value: "semana", label: "Semana" },
	{ value: "mes", label: "Mês" },
];

const DashboardSkeleton = () => (
	<div className="space-y-4">
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{[1, 2, 3, 4].map((i) => (
				<Skeleton key={i} className="h-28 w-full rounded-2xl" />
			))}
		</div>
		<Skeleton className="h-72 w-full rounded-2xl" />
		<div className="grid gap-4 lg:grid-cols-2">
			<Skeleton className="h-64 w-full rounded-2xl" />
			<Skeleton className="h-64 w-full rounded-2xl" />
		</div>
	</div>
);

const Index = () => {
	const { profile } = useAuth();
	const {
		getDisplayName,
		getInitials,
		loading: profileLoading,
	} = useUserProfile();
	const [periodFilter, setPeriodFilter] = useState<DashboardPeriod>("hoje");

	const handleDownloadReport = () =>
		toast.info("Gerando relatório consolidado...");
	const handleSettings = () => {
		window.location.href = "/settings";
	};

	const renderDashboard = () => (
		<Suspense fallback={<DashboardSkeleton />}>
			{(() => {
				if (!profile) return <AdminDashboard period={periodFilter} />;
				switch (profile.role) {
					case "admin":
						return <AdminDashboard period={periodFilter} />;
					case "fisioterapeuta":
						return (
							<TherapistDashboard
								lastUpdate={new Date()}
								profile={profile}
								period={periodFilter}
							/>
						);
					case "paciente":
						return (
							<PatientDashboard _lastUpdate={new Date()} profile={profile} />
						);
					default:
						return <AdminDashboard period={periodFilter} />;
				}
			})()}
		</Suspense>
	);

	const initials = getInitials();
	const displayName = getDisplayName();
	const firstName = displayName.split(" ")[0] || "Dr.";
	const selectedPeriodLabel =
		periodOptions.find((o) => o.value === periodFilter)?.label ?? "Hoje";

	return (
		<MainLayout showBreadcrumbs={false}>
			{/* Ambient gradient blobs */}
			<div
				className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
				aria-hidden
			>
				<div className="absolute left-[-10%] top-[-8%] h-[36%] w-[36%] rounded-full bg-primary/5 blur-[120px]" />
				<div className="absolute bottom-[12%] right-[-6%] h-[28%] w-[28%] rounded-full bg-sky-500/5 blur-[100px]" />
			</div>

			<div
				className="relative z-10 space-y-5 animate-fade-in pb-16 md:pb-10"
				data-testid="dashboard-page"
			>
				{/* ── Compact Command Bar ── */}
				<div
					className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl px-5 py-3 shadow-sm"
					data-testid="dashboard-header"
				>
					{/* Identity */}
					<div className="flex items-center gap-3">
						<div className="relative shrink-0">
							<Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
								<AvatarImage
									src={profile?.avatar_url || ""}
									alt={displayName}
								/>
								<AvatarFallback className="bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-black text-white">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
						</div>
						<div>
							<p className="text-sm font-semibold text-foreground leading-none mb-0.5">
								{profileLoading ? "Carregando..." : `Olá, ${firstName}!`}
							</p>
							<p className="text-xs text-muted-foreground flex items-center gap-1.5">
								<Calendar className="h-3 w-3 shrink-0" />
								<span>
									{format(new Date(), "EEE, d 'de' MMM", { locale: ptBR })}
								</span>
								<span className="text-border mx-0.5">·</span>
								<span className="text-primary font-medium">
									{selectedPeriodLabel}
								</span>
							</p>
						</div>
					</div>

					{/* Controls */}
					<div className="flex items-center gap-2 flex-wrap">
						<div className="flex items-center rounded-xl border border-border/60 bg-muted/30 p-0.5 gap-0.5">
							{periodOptions.map((opt) => (
								<Button
									key={opt.value}
									variant={periodFilter === opt.value ? "default" : "ghost"}
									size="sm"
									onClick={() => setPeriodFilter(opt.value)}
									className={cn(
										"rounded-[10px] h-7 px-3.5 text-[11px] font-semibold tracking-wide transition-all",
										periodFilter === opt.value && "shadow-sm",
									)}
								>
									{opt.label}
								</Button>
							))}
						</div>

						<Separator orientation="vertical" className="h-5 hidden sm:block" />

						<Button
							variant="outline"
							size="sm"
							onClick={handleDownloadReport}
							className="h-8 rounded-xl border-border/60 text-xs font-semibold gap-1.5 hidden sm:inline-flex"
						>
							<Download className="h-3.5 w-3.5" />
							Exportar
						</Button>
						<Button
							size="sm"
							onClick={handleSettings}
							className="h-8 rounded-xl text-xs font-semibold gap-1.5"
						>
							<SettingsIcon className="h-3.5 w-3.5" />
							Ajustes
						</Button>
					</div>
				</div>

				{/* ── Main content ── */}
				<AnalyticsFiltersProvider>
					<IncompleteRegistrationAlert />

					<div
						className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"
						data-testid="today-schedule"
					>
						{/* Dashboard content */}
						<div className="min-w-0">{renderDashboard()}</div>

						{/* Right panel — notifications + activity */}
						<aside className="xl:sticky xl:top-20 xl:self-start space-y-4 min-w-0">
							<DashboardNotificationWidget />
							<RealtimeActivityFeed />
						</aside>
					</div>
				</AnalyticsFiltersProvider>
			</div>
		</MainLayout>
	);
};

export default Index;
