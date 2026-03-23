import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import fisioflowLogo from "@/assets/logo.avif";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useNavPreload } from "@/hooks/useIntelligentPreload";
import { useToast } from "@/hooks/use-toast";
import { QueryKeys } from "@/hooks/queryKeys";
import { fetchTarefas } from "@/hooks/useTarefas";
import { PatientService } from "@/services/patientService";
import { exerciseService } from "@/services/exercises";
import { FinancialService } from "@/services/financialService";
import {
	LayoutDashboard,
	Users,
	Calendar,
	CalendarDays,
	Activity,
	DollarSign,
	BarChart3,
	Settings,
	ChevronLeft,
	ChevronRight,
	Stethoscope,
	FileText,
	MessageSquare,
	Clock,
	LogOut,
	LayoutGrid,
	ClipboardList,
	ChevronDown,
	Building2,
	CalendarOff,
	FileCheck,
	FileSignature,
	Target,
	TrendingUp,
	Sparkles,
	Trophy,
	ScanFace,
	Footprints,
	Image as ImageIcon,
	Mail,
	Database,
	ShoppingCart,
	Package,
	Video,
	Link2,
	LinkIcon,
	Layers,
	Brain,
	Shield,
	Gift,
	Flame,
	Receipt,
	BookOpen,
	Zap,
	Plug,
	FlaskConical,
	UserCircle,
	UserCheck,
	MoreHorizontal,
	Star,
	Calculator,
	CheckCircle2,
	Film,
	Search,
	Camera,
} from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useGamification } from "@/hooks/useGamification";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GlobalCommandPalette } from "@/components/evolution/search/GlobalCommandPalette";
import { ScrollArea } from "@/components/ui/scroll-area";

const GamificationMiniProfile = ({ collapsed }: { collapsed: boolean }) => {
	const { profile: authProfile } = useAuth();
	const isPatientContext =
		authProfile?.role === "paciente" || authProfile?.role === "patient";
	const patientId = isPatientContext ? authProfile?.id || "" : "";
	const { currentLevel, progressPercentage, currentXp, xpPerLevel } =
		useGamification(patientId);

	if (!isPatientContext) {
		return null;
	}

	if (collapsed) {
		return (
			<div className="flex flex-col items-center py-4 gap-1 group cursor-help transition-all duration-300">
				<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-xs shadow-premium-sm group-hover:shadow-premium-md group-hover:scale-110 transition-all duration-500">
					L{currentLevel}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-3 my-4 p-4 rounded-[1.5rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-border/40 shadow-premium-sm hover:shadow-premium-md transition-all duration-500 relative overflow-hidden group">
			<div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-400/5 rounded-full blur-2xl group-hover:bg-yellow-400/10 transition-colors" />
			<div className="flex items-center justify-between mb-3 relative z-10">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-yellow-500/20 group-hover:scale-110 transition-transform duration-500">
						<Trophy className="w-4.5 h-4.5" />
					</div>
					<div className="flex flex-col">
						<span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
							Nível
						</span>
						<span className="text-sm font-black text-slate-900 dark:text-white leading-none">
							{currentLevel}
						</span>
					</div>
				</div>
				<div className="flex flex-col items-end">
					<span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
						XP
					</span>
					<span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
						{currentXp}/{xpPerLevel}
					</span>
				</div>
			</div>
			<div className="relative z-10">
				<Progress
					value={progressPercentage}
					className="h-1.5 bg-slate-100 dark:bg-slate-800"
				/>
			</div>
		</div>
	);
};

// ORDEM FLUXO CLÍNICO 2026
const mainMenuItems = [
	{ icon: Calendar, label: "Agenda de Hoje", href: "/agenda", badge: "Hoje" },
	{ icon: Users, label: "Meus Pacientes", href: "/patients" },
];

const clinicaMenuItems = [
	{ icon: Activity, label: "Exercícios", href: "/exercises" },
	{ icon: Target, label: "Protocolos e Fases", href: "/protocols" },
	{ icon: ClipboardList, label: "Avaliações", href: "/clinical-tests" },
	{ icon: Camera, label: "Biomecânica", href: "/biomechanics" },
];

const inteligenciaMenuItems = [
	{ icon: LayoutDashboard, label: "Smart Dashboard", href: "/smart-dashboard" },
	{ icon: Brain, label: "Assistente IA", href: "/smart-ai" },
	{ icon: BarChart3, label: "Analytics Avançado", href: "/analytics" },
];

const operacionalMenuItems = [
	{ icon: CalendarDays, label: "Eventos", href: "/eventos" },
	{ icon: LayoutGrid, label: "Boards", href: "/boards" },
	{ icon: Package, label: "Estoque", href: "/inventory" },
	{ icon: Video, label: "Telemedicina", href: "/telemedicine" },
	{ icon: MessageSquare, label: "Comunicação", href: "/communications" },
];

const adminSubmenu = [
	{ icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
	{ icon: Users, label: "Usuários", href: "/admin/users" },
	{ icon: Shield, label: "Auditoria & Segurança", href: "/admin/audit-logs" },
	{ icon: Mail, label: "Convites", href: "/admin/invitations" },
	{ icon: Database, label: "CRUD Admin", href: "/admin/crud" },
	{ icon: Trophy, label: "Gamificação", href: "/admin/gamification" },
];

const SidebarSection = ({
	label,
	collapsed,
	children,
}: {
	label: string;
	collapsed: boolean;
	children: React.ReactNode;
}) => (
	<div className="space-y-1">
		{!collapsed && (
			<div className="px-4 py-2 mt-4 first:mt-0">
				<span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
					{label}
				</span>
			</div>
		)}
		{children}
	</div>
);

export function Sidebar() {
	const [collapsed, setCollapsed] = useState(false);
	const [adminOpen, setAdminOpen] = useState(false);
	const location = useLocation();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { preloadRoute } = useNavPreload();

	const isAdminActive = location.pathname.startsWith("/admin");

	const handleLogout = async () => {
		const { signOut } = useAuth();
		try {
			await signOut();
			toast({ title: "Logout realizado", description: "Até breve!" });
		} catch (error) {
			toast({
				title: "Erro ao sair",
				description: (error as Error)?.message || "Ocorreu um erro",
				variant: "destructive",
			});
		}
	};

	const renderMenuItem = (item: any) => {
		const Icon = item.icon;
		const isActive = location.pathname === item.href;

		return (
			<Link
				key={item.href}
				to={item.href}
				onMouseEnter={() => preloadRoute(item.href)}
				className={cn(
					"flex items-center gap-3 rounded-2xl transition-all duration-500 group relative overflow-hidden",
					collapsed ? "justify-center px-2 py-3.5" : "px-4 py-3",
					isActive
						? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-premium-md"
						: "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white",
				)}
			>
				<Icon
					className={cn(
						"h-5 w-5 transition-all duration-500 flex-shrink-0",
						isActive
							? "scale-110"
							: "group-hover:scale-110 group-hover:text-primary",
					)}
				/>
				{!collapsed && (
					<div className="flex items-center justify-between flex-1">
						<span className="text-xs font-bold uppercase tracking-widest">
							{item.label}
						</span>
						{item.badge && (
							<Badge className="bg-primary/10 text-primary border-0 text-[9px] h-4 px-1.5 font-black uppercase">
								{item.badge}
							</Badge>
						)}
					</div>
				)}
				{isActive && (
					<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.8)]" />
				)}
			</Link>
		);
	};

	return (
		<>
			<GlobalCommandPalette />
			<div
				className={cn(
					"hidden md:flex bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-r border-border/40 transition-all duration-500 ease-in-out flex-col h-screen sticky top-0 shadow-premium-lg z-50",
					collapsed ? "w-[84px]" : "w-[280px]",
				)}
			>
				{/* Premium Header */}
				<div className="p-6 relative">
					<div className="flex items-center justify-between">
						<Link to="/agenda" className="flex items-center gap-3 group">
							<div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
								<Activity className="h-6 w-6 text-white" />
							</div>
							{!collapsed && (
								<div className="flex flex-col animate-in fade-in slide-in-from-left-2">
									<span className="text-xl font-black tracking-tighter text-foreground">
										FisioFlow
									</span>
									<span className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em] leading-none">
										Mooca Fisio
									</span>
								</div>
							)}
						</Link>
						{!collapsed && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setCollapsed(true)}
								className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>
						)}
					</div>
					{collapsed && (
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCollapsed(false)}
							className="absolute -right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white dark:bg-slate-900 shadow-premium-md border border-border/40 z-50"
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
					)}
				</div>

				{/* Quick Search Hint (UX Skill: Fast Access) */}
				{!collapsed && (
					<div className="px-4 mb-2">
						<button
							onClick={() =>
								document.dispatchEvent(new CustomEvent("open-command-palette"))
							}
							className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-between group hover:bg-primary/5 hover:border-primary/20 transition-all"
						>
							<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary/70 transition-colors">
								<Search className="h-4 w-4" />
								<span className="text-[11px] font-bold uppercase tracking-wider">
									Buscar paciente...
								</span>
							</div>
							<kbd className="h-5 px-1.5 rounded bg-background border border-border text-[9px] font-black text-muted-foreground">
								⌘ K
							</kbd>
						</button>
					</div>
				)}

				{/* Navigation */}
				<ScrollArea className="flex-1 px-3 py-4">
					<div className="space-y-6">
						<SidebarSection label="Atendimento" collapsed={collapsed}>
							{mainMenuItems.map(renderMenuItem)}
						</SidebarSection>

						<SidebarSection label="Clínica" collapsed={collapsed}>
							{clinicaMenuItems.map(renderMenuItem)}
						</SidebarSection>

						<SidebarSection label="Inteligência & IA" collapsed={collapsed}>
							{inteligenciaMenuItems.map(renderMenuItem)}
						</SidebarSection>

						<SidebarSection label="Gestão & Operação" collapsed={collapsed}>
							{operacionalMenuItems.map(renderMenuItem)}
						</SidebarSection>

						<SidebarSection label="Configurações" collapsed={collapsed}>
							<Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
								<CollapsibleTrigger asChild>
									<button
										className={cn(
											"flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all duration-500 group",
											isAdminActive
												? "bg-slate-50 dark:bg-slate-800/30 text-slate-900 dark:text-white font-black"
												: "text-slate-500",
										)}
									>
										<div className="flex items-center gap-3">
											<Settings className="h-5 w-5" />
											{!collapsed && (
												<span className="text-xs font-bold uppercase tracking-widest">
													Painel Admin
												</span>
											)}
										</div>
										{!collapsed && (
											<ChevronDown
												className={cn(
													"h-3.5 w-3.5 transition-transform",
													adminOpen && "rotate-180",
												)}
											/>
										)}
									</button>
								</CollapsibleTrigger>
								<CollapsibleContent className="pl-9 space-y-1 mt-1 animate-in slide-in-from-top-2">
									{adminSubmenu.map((item) => (
										<Link
											key={item.href}
											to={item.href}
											className={cn(
												"block px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
												location.pathname === item.href
													? "text-primary bg-primary/5"
													: "text-muted-foreground hover:text-foreground hover:pl-4",
											)}
										>
											{item.label}
										</Link>
									))}
								</CollapsibleContent>
							</Collapsible>
						</SidebarSection>
					</div>
				</ScrollArea>

				{/* Footer */}
				<div className="shrink-0 p-3 flex flex-col gap-2 border-t border-border/40">
					<GamificationMiniProfile collapsed={collapsed} />
					<Button
						variant="ghost"
						onClick={handleLogout}
						className={cn(
							"w-full justify-start gap-3 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 rounded-2xl transition-all duration-300 group",
							collapsed ? "px-0 justify-center h-12" : "px-4 py-6",
						)}
					>
						<LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
						{!collapsed && (
							<span className="text-xs font-black uppercase tracking-widest">
								Sair
							</span>
						)}
					</Button>
				</div>
			</div>
		</>
	);
}
