import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, AlertTriangle, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation } from "@/services/whatsapp-api";

const STATUS_COLORS: Record<string, string> = {
	open: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30",
	pending:
		"bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
	resolved:
		"bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
	closed:
		"bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30",
};

const STATUS_LABELS: Record<string, string> = {
	open: "Aberta",
	pending: "Pendente",
	resolved: "Resolvida",
	closed: "Fechada",
};

const PRIORITY_COLORS: Record<string, string> = {
	low: "text-gray-400",
	medium: "text-blue-500",
	high: "text-orange-500",
	urgent: "text-red-500",
};

function statusLabel(status: string): string {
	return STATUS_LABELS[status] ?? status;
}

function getSlaLabel(
	deadline: string | undefined,
	breached: boolean | undefined,
): { label: string; color: string } | null {
	if (!deadline) return null;
	const now = Date.now();
	const end = new Date(deadline).getTime();
	const diffMs = end - now;
	if (breached || diffMs <= 0)
		return {
			label: "SLA vencido",
			color: "text-red-500 bg-red-50 dark:bg-red-900/20",
		};
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 10)
		return { label: `${diffMin}min`, color: "text-red-500 bg-red-50" };
	if (diffMin < 60)
		return { label: `${diffMin}min`, color: "text-orange-500 bg-orange-50" };
	const diffH = Math.floor(diffMin / 60);
	return { label: `${diffH}h`, color: "text-green-600 bg-green-50" };
}

interface ConversationListItemProps {
	conversation: Conversation;
	isSelected: boolean;
	onClick: () => void;
	bulkMode?: boolean;
	isSelectedBulk?: boolean;
}

export function ConversationListItem({
	conversation,
	isSelected,
	onClick,
	bulkMode,
	isSelectedBulk,
}: ConversationListItemProps) {
	const timeAgo = conversation.lastMessageAt
		? formatDistanceToNow(new Date(conversation.lastMessageAt), {
				addSuffix: false,
				locale: ptBR,
			})
		: "";

	const sla = getSlaLabel(conversation.slaDeadline, conversation.slaBreached);

	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left px-3 py-3 hover:bg-muted/50 transition-all border-b border-border/40 ${
				isSelected
					? "bg-muted/60 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary"
					: ""
			}`}
		>
			<div className="flex items-start gap-3">
				{bulkMode && (
					<div
						className={`h-5 w-5 rounded border-2 flex items-center justify-center mt-3.5 shrink-0 ${isSelectedBulk ? "bg-primary border-primary" : "border-border"}`}
					>
						{isSelectedBulk && (
							<Check className="h-3 w-3 text-primary-foreground" />
						)}
					</div>
				)}
				<Avatar className="h-12 w-12 shrink-0 border border-border/50 shadow-sm">
					<AvatarFallback className="text-sm bg-primary/5 text-primary font-medium">
						{conversation.contactName?.slice(0, 2).toUpperCase() || "??"}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1 min-w-0 py-0.5">
					<div className="flex items-center justify-between gap-2 mb-1">
						<span
							className={`font-semibold text-sm truncate ${conversation.unreadCount > 0 ? "text-foreground" : "text-foreground/90"}`}
						>
							{conversation.contactName}
						</span>
						<span
							className={`text-[11px] whitespace-nowrap ${conversation.unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}
						>
							{timeAgo}
						</span>
					</div>
					<div className="flex items-center gap-2 mb-1.5">
						<span
							className={`text-xs truncate flex-1 ${conversation.unreadCount > 0 ? "font-medium text-foreground/90" : "text-muted-foreground"}`}
						>
							{conversation.lastMessage || "Sem mensagens"}
						</span>
						{conversation.unreadCount > 0 && (
							<span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-sm">
								{conversation.unreadCount}
							</span>
						)}
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span
							className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[conversation.status] || ""}`}
						>
							{statusLabel(conversation.status)}
						</span>
						{conversation.priority && conversation.priority !== "low" && (
							<AlertTriangle
								className={`h-3 w-3 ${PRIORITY_COLORS[conversation.priority] || ""}`}
							/>
						)}
						{sla && (
							<span
								className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${sla.color}`}
							>
								<Clock className="h-2.5 w-2.5" />
								{sla.label}
							</span>
						)}
						{conversation.assignedToName && (
							<Avatar className="h-4 w-4 ml-auto">
								<AvatarFallback
									className="text-[8px] bg-muted font-medium"
									title={conversation.assignedToName}
								>
									{conversation.assignedToName.slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
						)}
					</div>
				</div>
			</div>
		</button>
	);
}
