import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Bell,
	BellOff,
	CheckCheck,
	Calendar,
	DollarSign,
	Users,
	Info,
	AlertTriangle,
	MessageSquare,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Notification } from "@/api/v2";

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
	appointment: Calendar,
	payment: DollarSign,
	patient: Users,
	whatsapp: MessageSquare,
	warning: AlertTriangle,
	error: AlertTriangle,
	success: CheckCheck,
};

const NOTIFICATION_COLORS: Record<string, string> = {
	appointment:
		"bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
	payment:
		"bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
	patient:
		"bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
	whatsapp:
		"bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
	warning:
		"bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
	error: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
	success:
		"bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function NotificationItem({
	n,
	onMarkRead,
}: {
	n: Notification;
	onMarkRead: (id: string) => void;
}) {
	const Icon = NOTIFICATION_ICONS[n.type] ?? Info;
	const colorClass =
		NOTIFICATION_COLORS[n.type] ??
		"bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
	const timeAgo = formatDistanceToNow(new Date(n.created_at), {
		addSuffix: true,
		locale: ptBR,
	});

	return (
		<div
			className={cn(
				"flex items-start gap-3 p-3 rounded-2xl transition-all cursor-pointer group",
				n.is_read
					? "opacity-60 hover:opacity-100"
					: "bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20",
			)}
			onClick={() => !n.is_read && onMarkRead(n.id)}
		>
			<div className={cn("flex-shrink-0 p-2 rounded-xl", colorClass)}>
				<Icon className="w-3.5 h-3.5" />
			</div>
			<div className="flex-1 min-w-0">
				<p
					className={cn(
						"text-xs font-bold truncate",
						n.is_read
							? "text-slate-500 dark:text-slate-400"
							: "text-slate-900 dark:text-white",
					)}
				>
					{n.title}
				</p>
				{n.message && (
					<p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
						{n.message}
					</p>
				)}
				<p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
					{timeAgo}
				</p>
			</div>
			{!n.is_read && (
				<div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
			)}
		</div>
	);
}

export function DashboardNotificationWidget() {
	const navigate = useNavigate();
	const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
		useNotifications(10);

	const recent = notifications.slice(0, 6);

	return (
		<Card className="rounded-[2rem] border-border/40 shadow-premium-sm hover:shadow-premium-md transition-all duration-300 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
			<CardHeader className="pb-3 px-6 pt-6 border-b border-border/10 bg-slate-50/50 dark:bg-slate-800/20">
				<CardTitle className="flex items-center justify-between text-sm font-bold tracking-tight">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-xl relative">
							<Bell className="h-4 w-4 text-primary" />
							{unreadCount > 0 && (
								<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900">
									{unreadCount > 9 ? "9+" : unreadCount}
								</span>
							)}
						</div>
						<span>Notificações</span>
						{unreadCount > 0 && (
							<Badge className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border-none">
								{unreadCount} nova{unreadCount !== 1 ? "s" : ""}
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-2">
						{unreadCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 h-8 px-3 rounded-full"
								onClick={() => markAllAsRead()}
							>
								<CheckCheck className="w-3 h-3 mr-1" />
								Marcar todas
							</Button>
						)}
						<Button
							variant="ghost"
							size="sm"
							className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 h-8 px-3 rounded-full"
							onClick={() => navigate("/notificacoes")}
						>
							Ver todas
						</Button>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4">
				{isLoading ? (
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex items-start gap-3 p-3">
								<Skeleton className="h-8 w-8 rounded-xl" />
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-3 w-3/4 rounded" />
									<Skeleton className="h-2.5 w-1/2 rounded" />
								</div>
							</div>
						))}
					</div>
				) : recent.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-3">
							<BellOff className="w-6 h-6 text-slate-400" />
						</div>
						<p className="text-xs font-bold text-slate-500">Tudo em dia!</p>
						<p className="text-[11px] text-slate-400 mt-1">
							Nenhuma notificação pendente
						</p>
					</div>
				) : (
					<div className="space-y-1">
						{recent.map((n) => (
							<NotificationItem key={n.id} n={n} onMarkRead={markAsRead} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
