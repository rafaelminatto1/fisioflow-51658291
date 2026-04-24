import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Phone,
	User,
	Calendar,
	Hash,
	XCircle,
	Plus,
	Target,
	AlertTriangle,
	ChevronDown,
	UserPlus,
	ArrowRightLeft,
	CheckCircle2,
	AlarmClock,
	Zap,
	Activity,
	Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	fetchTags,
	fetchQuickReplies,
	fetchConversationActivity,
	type Conversation,
	type Tag as TagType,
	type QuickReply,
} from "@/services/whatsapp-api";

const STATUS_COLORS: Record<string, string> = {
	open: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30",
	pending:
		"bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
	resolved:
		"bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
	closed:
		"bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
	low: "text-gray-400",
	medium: "text-blue-500",
	high: "text-orange-500",
	urgent: "text-red-500",
};

const PRIORITY_LABELS: Record<string, string> = {
	low: "Baixa",
	medium: "Média",
	high: "Alta",
	urgent: "Urgente",
};

interface ConversationDetailPanelProps {
	conversation: Conversation;
	onPriorityChange?: (priority: "low" | "medium" | "high" | "urgent") => void;
	onAssign: () => void;
	onTransfer: () => void;
	onResolve: () => void;
	onClose: () => void;
	onAddTag: (tagId: string) => void;
	onRemoveTag: (tagId: string) => void;
	onQuickReply: (content: string) => void;
	onSnooze: () => void;
}

export function ConversationDetailPanel({
	conversation,
	onAssign,
	onTransfer,
	onResolve,
	onClose,
	onAddTag,
	onRemoveTag,
	onQuickReply,
	onPriorityChange,
	onSnooze,
}: ConversationDetailPanelProps) {
	const [allTags, setAllTags] = useState<TagType[]>([]);
	const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
	const [showActivity, setShowActivity] = useState(false);
	const [activity, setActivity] = useState<any[]>([]);
	const [activityLoading, setActivityLoading] = useState(false);

	useEffect(() => {
		fetchTags()
			.then(setAllTags)
			.catch(() => {});
		fetchQuickReplies()
			.then(setQuickReplies)
			.catch(() => {});
	}, []);

	const loadActivity = async () => {
		if (!conversation.id) return;
		setActivityLoading(true);
		try {
			const data = await fetchConversationActivity(conversation.id);
			setActivity(data);
		} finally {
			setActivityLoading(false);
		}
	};

	const availableTags = allTags.filter(
		(t) => !conversation.tags.some((ct) => ct.id === t.id),
	);

	return (
		<div className="h-full flex flex-col bg-background">
			<div className="h-16 px-4 border-b flex items-center shrink-0">
				<h3 className="font-semibold text-sm">Detalhes da Conversa</h3>
			</div>
			<ScrollArea className="flex-1">
				<div className="p-5 space-y-6">
					<div className="flex flex-col items-center text-center">
						<Avatar className="h-20 w-20 mb-3 border-2 border-background shadow-md">
							<AvatarFallback className="text-xl bg-primary/10 text-primary font-medium">
								{conversation.contactName?.slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<h3 className="text-lg font-semibold">
							{conversation.contactName}
						</h3>
						<div className="flex items-center text-muted-foreground mt-1 gap-1.5 text-sm">
							<Phone className="h-3.5 w-3.5" />
							{conversation.contactPhone}
						</div>

						{conversation.patientId && (
							<div className="flex flex-col items-center gap-2 mt-3">
								<Link
									to={`/patients/${conversation.patientId}`}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium hover:bg-primary/20 transition-colors"
								>
									<User className="h-3.5 w-3.5" />
									{conversation.patientName || "Ver perfil do paciente"}
								</Link>
								<Link
									to={`/schedule?patientId=${conversation.patientId}`}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
								>
									<Calendar className="h-3.5 w-3.5" />
									Agendar consulta
								</Link>
							</div>
						)}
					</div>

					<Separator className="opacity-50" />

					<div className="space-y-4">
						<div>
							<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
								<Hash className="h-3.5 w-3.5" /> Tags
							</h4>
							<div className="flex flex-wrap gap-1.5">
								{conversation.tags.map((tag) => (
									<Badge
										key={tag.id}
										variant="outline"
										className="text-xs px-2 py-0.5 cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors group"
										style={{ borderColor: tag.color, color: tag.color }}
										onClick={() => onRemoveTag(tag.id)}
									>
										{tag.name}
										<XCircle className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Badge>
								))}
								{availableTags.length > 0 && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="h-6 text-xs px-2 rounded-full border-dashed"
											>
												<Plus className="h-3 w-3 mr-1" />
												Adicionar
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start" className="w-48">
											{availableTags.map((tag) => (
												<DropdownMenuItem
													key={tag.id}
													onClick={() => onAddTag(tag.id)}
													className="text-xs"
												>
													<div
														className="h-2 w-2 rounded-full mr-2"
														style={{ backgroundColor: tag.color }}
													/>
													{tag.name}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
									Responsável
								</h4>
								<div className="flex items-center gap-2">
									<Avatar className="h-7 w-7 border">
										<AvatarFallback className="text-[10px] font-medium bg-muted">
											{conversation.assignedToName?.slice(0, 2).toUpperCase() ||
												"?"}
										</AvatarFallback>
									</Avatar>
									<span className="text-sm font-medium">
										{conversation.assignedToName || "Não atribuído"}
									</span>
								</div>
							</div>

							<div>
								<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
									Status
								</h4>
								<Badge
									className={`${STATUS_COLORS[conversation.status] || ""} font-semibold`}
								>
									{conversation.status === "open"
										? "Aberta"
										: conversation.status === "pending"
											? "Pendente"
											: conversation.status === "resolved"
												? "Resolvida"
												: "Fechada"}
								</Badge>
							</div>
						</div>

						<div>
							<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
								<Target className="h-3.5 w-3.5" /> Prioridade
							</h4>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className={`h-7 text-xs gap-1.5 ${conversation.priority ? PRIORITY_COLORS[conversation.priority] : "text-muted-foreground"}`}
									>
										<AlertTriangle className="h-3 w-3" />
										{conversation.priority
											? PRIORITY_LABELS[conversation.priority]
											: "Definir"}
										<ChevronDown className="h-3 w-3 ml-auto" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-36">
									{(["low", "medium", "high", "urgent"] as const).map((p) => (
										<DropdownMenuItem
											key={p}
											className={`text-xs ${PRIORITY_COLORS[p]}`}
											onClick={() => onPriorityChange?.(p)}
										>
											{PRIORITY_LABELS[p]}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{conversation.slaBreached && (
							<div>
								<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
									Atenção
								</h4>
								<div className="flex flex-wrap gap-2">
									{conversation.slaBreached && (
										<Badge
											variant="outline"
											className="text-xs text-red-500 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"
										>
											<AlertTriangle className="h-3 w-3 mr-1" /> SLA vencido
										</Badge>
									)}
								</div>
							</div>
						)}
					</div>

					<Separator className="opacity-50" />

					<div>
						<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
							Ações
						</h4>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								size="sm"
								className="text-xs h-9"
								onClick={onAssign}
							>
								<UserPlus className="h-3.5 w-3.5 mr-1.5" /> Atribuir
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-xs h-9"
								onClick={onTransfer}
							>
								<ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Transferir
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-xs h-9 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
								onClick={onResolve}
							>
								<CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Resolver
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-xs h-9 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
								onClick={onClose}
							>
								<XCircle className="h-3.5 w-3.5 mr-1.5" /> Fechar
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-xs h-9 col-span-2"
								onClick={onSnooze}
							>
								<AlarmClock className="h-3.5 w-3.5 mr-1.5" /> Snooze
							</Button>
						</div>
					</div>

					{quickReplies.length > 0 && (
						<div>
							<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
								Respostas rápidas
							</h4>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="w-full text-xs h-9 justify-between"
									>
										<span className="flex items-center">
											<Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />{" "}
											Modelos
										</span>
										<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-64" align="end">
									{quickReplies.map((qr) => (
										<DropdownMenuItem
											key={qr.id}
											className="cursor-pointer"
											onClick={() => onQuickReply(qr.content)}
										>
											<div className="flex flex-col gap-0.5">
												<span className="font-medium text-xs">{qr.name}</span>
												<span className="text-[10px] text-muted-foreground truncate max-w-[220px]">
													{qr.content}
												</span>
											</div>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)}

					<Separator className="opacity-50" />

					<div>
						<button
							type="button"
							className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
							onClick={() => {
								setShowActivity((v) => !v);
								if (!showActivity) loadActivity();
							}}
						>
							<span className="flex items-center gap-1.5">
								<Activity className="h-3.5 w-3.5" /> Histórico
							</span>
							<ChevronDown
								className={`h-3.5 w-3.5 transition-transform ${showActivity ? "rotate-180" : ""}`}
							/>
						</button>
						{showActivity && (
							<div className="space-y-2">
								{activityLoading ? (
									<div className="flex justify-center py-3">
										<Loader2 className="h-4 w-4 animate-spin text-primary" />
									</div>
								) : activity.length === 0 ? (
									<p className="text-xs text-muted-foreground text-center py-3">
										Sem histórico de ações
									</p>
								) : (
									activity.map((item) => (
										<div key={item.id} className="flex gap-2 text-xs">
											<div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
											<div>
												<p className="text-foreground/80">{item.description}</p>
												{item.by && (
													<p className="text-muted-foreground text-[10px]">
														{item.by}
													</p>
												)}
												<p className="text-muted-foreground text-[10px]">
													{item.timestamp
														? formatDistanceToNow(new Date(item.timestamp), {
																addSuffix: true,
																locale: ptBR,
															})
														: ""}
												</p>
											</div>
										</div>
									))
								)}
							</div>
						)}
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}
