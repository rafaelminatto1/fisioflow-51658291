/**
 * MainLayout - Migrated to Neon/Cloudflare
 */

import type React from "react";
import "@/styles/premium-utilities.css";
import "@/styles/mobile-utilities.css";
import { Bell, ChevronDown, LogOut, User, WifiOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { SkipLinks } from "@/components/accessibility/SkipLinks";
import { ComplianceBanner } from "@/components/communications/ComplianceBanner";
import { GlobalSearch } from "@/components/eventos/GlobalSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageBreadcrumbs } from "@/components/ui/page-breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { BottomNavigation } from "./BottomNavigation";
import { MobileHeader } from "./MobileHeader";
import { OnlineUsersIndicator } from "./OnlineUsersIndicator";
import { Sidebar } from "./Sidebar";
import { ThemeControls } from "@/components/ui/theme";

interface MainLayoutProps {
	children: React.ReactNode;
	showBreadcrumbs?: boolean;
	customBreadcrumbLabels?: Record<string, string>;
	fullWidth?: boolean;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
	noPadding?: boolean;
	compactPadding?: boolean;
	customHeader?: React.ReactNode;
	hideDefaultHeader?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
	children,
	showBreadcrumbs = true,
	customBreadcrumbLabels,
	fullWidth = false,
	maxWidth,
	noPadding = false,
	compactPadding = false,
	customHeader,
	hideDefaultHeader = false,
}) => {
	const { profile, loading, getDisplayName, getInitials } = useUserProfile();
	const { signOut } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [isOffline, setIsOffline] = useState(!window.navigator.onLine);

	useEffect(() => {
		const handleOnline = () => setIsOffline(false);
		const handleOffline = () => setIsOffline(true);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const handleLogout = async () => {
		try {
			await signOut();
			toast({
				title: "Sessão encerrada",
				description: "Você foi desconectado com sucesso.",
			});
			navigate("/auth");
		} catch {
			toast({
				title: "Erro ao sair",
				description: "Não foi possível encerrar a sessão.",
				variant: "destructive",
			});
		}
	};

	const displayName = getDisplayName();
	const initials = getInitials();

	return (
		<div
			className="min-h-screen flex flex-col w-full bg-slate-50 dark:bg-slate-950"
			data-testid="main-layout"
		>
			<ComplianceBanner />
			<div className="flex flex-1 w-full relative">
				{/* Skip Links for Accessibility */}
				<SkipLinks />

				{/* Sidebar - Hidden on mobile */}
				<Sidebar />

				<div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden relative">
					{/* Decorative background for the whole content area */}
					<div className="absolute inset-0 bg-gradient-to-br from-background via-accent/5 to-background pointer-events-none" />

					{/* Header Mobile */}
					<MobileHeader />

					{/* Header Desktop */}
					{customHeader
						? customHeader
						: !hideDefaultHeader && (
								<header
									className="hidden md:flex h-10 gradient-brand-light backdrop-blur-md border-b border-primary/20 items-center justify-between px-6 sticky top-0 z-40 transition-all duration-500"
									data-testid="main-header"
								>
									<div className="flex items-center gap-6">
										<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/50 dark:bg-slate-800/50 border border-border/50">
											<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
											<span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">
												Real-time Active
											</span>
										</div>

										<div className="h-4 w-px bg-border/40" />

										{showBreadcrumbs && (
											<div className="animate-fade-in">
												<PageBreadcrumbs
													customLabels={customBreadcrumbLabels}
												/>
											</div>
										)}
									</div>

									<div className="flex items-center gap-4">
										<div className="relative group">
											<GlobalSearch />
										</div>

										<div className="h-6 w-px bg-border/40 mx-2" />

										<div className="flex items-center gap-3">
											<Button
												variant="ghost"
												size="icon"
												className="rounded-full h-10 w-10 text-slate-500 hover:text-primary transition-all duration-300 relative magnetic-button glow-on-hover"
											>
												<Bell className="w-5 h-5" />
												<span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
											</Button>

											<OnlineUsersIndicator />
											<ThemeControls />
										</div>

										{/* Offline Badge */}
										{isOffline && (
											<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 animate-pulse transition-all duration-500">
												<div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
												<span className="text-[9px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest">
													Modo Offline
												</span>
											</div>
										)}

										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													className="flex items-center gap-3 h-11 pl-1 pr-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all rounded-full border border-border/40 group"
													data-testid="user-menu"
												>
													{loading ? (
														<Skeleton className="w-8 h-8 rounded-full" />
													) : (
														<div className="relative">
															<Avatar className="w-8 h-8 ring-2 ring-white dark:ring-slate-800 shadow-premium-sm magnetic-button">
																<AvatarImage src={profile?.avatar_url || ""} />
																<AvatarFallback className="gradient-brand text-white font-display font-bold text-xs">
																	{initials}
																</AvatarFallback>
															</Avatar>
															<span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></span>
														</div>
													)}
													<div className="hidden lg:flex flex-col items-start text-left">
														<span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
															{loading ? "..." : displayName}
														</span>
														<span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
															{profile?.role || "User"}
														</span>
													</div>
													<ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="end"
												className="w-64 p-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-border/40 shadow-premium-lg rounded-3xl animate-scale-in card-premium-hover"
											>
												<DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
													Sessão Ativa
												</DropdownMenuLabel>
												<DropdownMenuSeparator className="my-2" />
												<DropdownMenuItem
													asChild
													className="rounded-2xl px-4 py-3 hover:bg-primary/5 hover:text-primary cursor-pointer transition-all duration-300 focus:bg-primary/5 focus:text-primary group magnetic-button"
												>
													<Link
														to="/profile"
														className="flex items-center w-full"
													>
														<div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl mr-3 group-hover:bg-primary/10 transition-colors">
															<User className="w-4 h-4" />
														</div>
														<span className="font-bold text-sm">
															Meu Perfil
														</span>
													</Link>
												</DropdownMenuItem>
												<DropdownMenuSeparator className="my-2" />
												<DropdownMenuItem
													onClick={handleLogout}
													data-testid="user-menu-logout"
													className="rounded-2xl px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-all duration-300 focus:bg-red-50 focus:text-red-500 group magnetic-button glow-on-hover"
												>
													<div className="p-2 bg-red-50 dark:bg-red-950/10 rounded-xl mr-3 group-hover:bg-red-100 transition-colors">
														<LogOut className="w-4 h-4" />
													</div>
													<span className="font-bold text-sm">
														Encerrar Sessão
													</span>
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</header>
							)}

					{/* Main Content */}
					<main
						id="main-content"
						role="main"
						tabIndex={-1}
						aria-label="Conteúdo principal"
						className={cn(
							"flex-1 relative z-10",
							noPadding
								? "pt-[60px] md:pt-0 pb-24 md:pb-0"
								: compactPadding
									? "p-2 xs:p-3 sm:p-3 md:p-4 pt-[60px] md:pt-4 pb-24 md:pb-4"
									: "p-3 xs:p-4 sm:p-6 md:p-8 pt-[60px] md:pt-8 pb-24 md:pb-8",
						)}
					>
						<div
							className={cn(
								"mx-auto transition-all duration-300 w-full",
								fullWidth && "px-0",
								maxWidth === "sm" && "max-w-sm",
								maxWidth === "md" && "max-w-md",
								maxWidth === "lg" && "max-w-lg",
								maxWidth === "xl" && "max-w-xl",
								maxWidth === "2xl" && "max-w-2xl",
								maxWidth === "7xl" && "max-w-7xl",
								maxWidth === "full" && "max-w-full",
								!fullWidth && !maxWidth && "max-w-full",
							)}
						>
							<div key={location.pathname} className="w-full">
								{children}
							</div>
						</div>
					</main>
				</div>
			</div>

			{/* Bottom Navigation - Mobile only */}
			<BottomNavigation />
		</div>
	);
};

export default MainLayout;
