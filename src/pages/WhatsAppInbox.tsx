import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	AlertTriangle,
	ArrowRightLeft,
	CheckCircle2,
	ChevronDown,
	Clock,
	Filter,
	Hash,
	Loader2,
	MessageCircle,
	MessageSquare,
	MoreVertical,
	NotebookPen,
	Paperclip,
	Phone,
	Plus,
	Search,
	Send,
	StickyNote,
	Tag,
	User,
	UserPlus,
	XCircle,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWhatsAppConversation, useWhatsAppInbox } from "@/hooks/useWhatsApp";
import type {
	Conversation,
	Message,
	QuickReply,
	Tag as TagType,
} from "@/services/whatsapp-api";
import {
	addTags,
	removeTag as apiRemoveTag,
	fetchQuickReplies,
	fetchTags,
} from "@/services/whatsapp-api";

const STATUS_TABS = [
	{ value: "all", label: "Todas" },
	{ value: "open", label: "Abertas" },
	{ value: "pending", label: "Pendentes" },
	{ value: "mine", label: "Minhas" },
	{ value: "resolved", label: "Resolvidas" },
];

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

function ConversationListItem({
	conversation,
	isSelected,
	onClick,
}: {
	conversation: Conversation;
	isSelected: boolean;
	onClick: () => void;
}) {
	const timeAgo = conversation.lastMessageAt
		? formatDistanceToNow(new Date(conversation.lastMessageAt), {
				addSuffix: false,
				locale: ptBR,
			})
		: "";

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
							{conversation.status === "open"
								? "Aberta"
								: conversation.status === "pending"
									? "Pendente"
									: conversation.status === "resolved"
										? "Resolvida"
										: "Fechada"}
						</span>
						{conversation.priority && conversation.priority !== "low" && (
							<AlertTriangle
								className={`h-3 w-3 ${PRIORITY_COLORS[conversation.priority] || ""}`}
							/>
						)}
						{conversation.slaBreached && (
							<Clock className="h-3 w-3 text-red-500" />
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

function MessageBubble({ message }: { message: Message }) {
	const isOutbound = message.direction === "outbound";
	const isNote = message.type === "note";
	const time = message.timestamp
		? formatDistanceToNow(new Date(message.timestamp), {
				addSuffix: true,
				locale: ptBR,
			})
		: "";

	if (isNote) {
		return (
			<div className="flex justify-center my-4">
				<div className="max-w-[85%] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-3 shadow-sm">
					<div className="flex items-center gap-1.5 mb-1.5">
						<StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
						<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wider">
							Nota interna
						</span>
						{message.senderName && (
							<span className="text-[11px] text-amber-600/80 dark:text-amber-500/80">
								· {message.senderName}
							</span>
						)}
					</div>
					<p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
						{message.content}
					</p>
					<span className="text-[10px] text-amber-500/80 dark:text-amber-600 mt-2 block font-medium">
						{time}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3 group`}
		>
			<div
				className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm relative ${
					isOutbound
						? "bg-primary text-primary-foreground rounded-tr-sm"
						: "bg-background border border-border/50 text-foreground rounded-tl-sm"
				}`}
			>
				<p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
					{message.content}
				</p>
				{message.interactiveData && (
					<div className="mt-2 space-y-1.5">
						{message.interactiveData.buttons?.map((btn) => (
							<div
								key={btn.id}
								className={`text-xs px-3 py-1.5 rounded-md border font-medium text-center cursor-default ${
									isOutbound
										? "border-primary-foreground/30 bg-primary-foreground/10"
										: "border-border bg-muted/30"
								}`}
							>
								{btn.title}
							</div>
						))}
					</div>
				)}
				<div
					className={`flex items-center gap-1.5 mt-1.5 select-none ${isOutbound ? "justify-end" : "justify-end"}`}
				>
					<span
						className={`text-[10px] font-medium ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}
					>
						{time}
					</span>
					{isOutbound && message.status && (
						<span
							className={`text-[10px] flex items-center ${
								message.status === "read"
									? "text-blue-300" // blue ticks for read in primary bg
									: "text-primary-foreground/70"
							}`}
						>
							{message.status === "read"
								? "✓✓"
								: message.status === "delivered"
									? "✓✓"
									: "✓"}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function ConversationDetailPanel({
	conversation,
	onAssign,
	onTransfer,
	onResolve,
	onClose,
	onAddTag,
	onRemoveTag,
	onQuickReply,
}: {
	conversation: Conversation;
	onAssign: () => void;
	onTransfer: () => void;
	onResolve: () => void;
	onClose: () => void;
	onAddTag: (tagId: string) => void;
	onRemoveTag: (tagId: string) => void;
	onQuickReply: (content: string) => void;
}) {
	const [allTags, setAllTags] = useState<TagType[]>([]);
	const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);

	useEffect(() => {
		fetchTags()
			.then(setAllTags)
			.catch(() => {});
		fetchQuickReplies()
			.then(setQuickReplies)
			.catch(() => {});
	}, []);

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
							<Link
								to={`/patients/${conversation.patientId}`}
								className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium hover:bg-primary/20 transition-colors"
							>
								<User className="h-3.5 w-3.5" />
								{conversation.patientName || "Ver perfil do paciente"}
							</Link>
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

						{(conversation.priority || conversation.slaBreached) && (
							<div>
								<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
									Atenção
								</h4>
								<div className="flex flex-wrap gap-2">
									{conversation.priority && (
										<Badge
											variant="outline"
											className={`text-xs ${PRIORITY_COLORS[conversation.priority]}`}
										>
											{conversation.priority === "urgent"
												? "Urgente"
												: conversation.priority === "high"
													? "Alta"
													: conversation.priority === "medium"
														? "Média"
														: "Baixa"}
										</Badge>
									)}
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
				</div>
			</ScrollArea>
		</div>
	);
}

function ChatPanel({
	selectedId,
	onAddNote,
	quickReplyText,
	onQuickReplyUsed,
}: {
	selectedId: string | null;
	onAddNote: (content: string) => void;
	quickReplyText: string | null;
	onQuickReplyUsed: () => void;
}) {
	const { conversation, messages, loading, sendMessage } =
		useWhatsAppConversation(selectedId);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [showNoteDialog, setShowNoteDialog] = useState(false);
	const [noteContent, setNoteContent] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	});

	useEffect(() => {
		if (quickReplyText) {
			setInput(quickReplyText);
			onQuickReplyUsed();
		}
	}, [quickReplyText, onQuickReplyUsed]);

	if (!selectedId) {
		return (
			<div className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20">
				<div className="text-center max-w-sm px-6">
					<div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
						<MessageCircle className="h-10 w-10 text-primary" />
					</div>
					<h3 className="text-xl font-semibold text-foreground mb-2">
						WhatsApp Web CRM
					</h3>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Selecione uma conversa na lista ao lado para começar a interagir com
						seus pacientes e gerenciar atendimentos.
					</p>
				</div>
			</div>
		);
	}

	if (loading && messages.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<span className="text-sm text-muted-foreground font-medium">
						Carregando conversa...
					</span>
				</div>
			</div>
		);
	}

	if (!conversation) return null;

	const handleSend = async () => {
		if (!input.trim() || sending) return;
		setSending(true);
		try {
			await sendMessage(input.trim());
			setInput("");
		} catch {
		} finally {
			setSending(false);
		}
	};

	const handleNote = () => {
		if (!noteContent.trim()) return;
		onAddNote(noteContent.trim());
		setNoteContent("");
		setShowNoteDialog(false);
	};

	return (
		<div className="flex-1 flex flex-col h-full bg-slate-50/30 dark:bg-background relative">
			{/* Background Pattern - Optional WhatsApp-like feel */}
			<div
				className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
				style={{
					backgroundImage:
						"radial-gradient(circle at center, #000 1px, transparent 1px)",
					backgroundSize: "24px 24px",
				}}
			></div>

			<div className="h-16 border-b px-5 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shadow-sm">
				<div className="flex items-center gap-3">
					<Avatar className="h-10 w-10 border shadow-sm">
						<AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
							{conversation.contactName?.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div>
						<h3 className="text-sm font-semibold">
							{conversation.contactName}
						</h3>
						<div className="flex items-center gap-2">
							<p className="text-xs text-muted-foreground">
								{conversation.contactPhone}
							</p>
							{conversation.patientName && (
								<>
									<span className="text-muted-foreground/30">•</span>
									<span className="text-[11px] text-primary font-medium">
										{conversation.patientName}
									</span>
								</>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<Badge
						variant="secondary"
						className={`${STATUS_COLORS[conversation.status] || ""} font-medium shadow-sm`}
					>
						{conversation.status === "open"
							? "Aberta"
							: conversation.status === "pending"
								? "Pendente"
								: conversation.status === "resolved"
									? "Resolvida"
									: "Fechada"}
					</Badge>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground"
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1 px-4 z-10">
				<div className="py-6">
					{messages.length === 0 ? (
						<div className="flex items-center justify-center h-32">
							<div className="bg-background border shadow-sm rounded-lg px-4 py-3 text-center max-w-sm">
								<p className="text-sm font-medium text-foreground mb-1">
									Nova Conversa
								</p>
								<p className="text-xs text-muted-foreground">
									Esta é sua primeira interação. Envie uma mensagem para
									começar.
								</p>
							</div>
						</div>
					) : (
						<div className="space-y-1">
							{messages.map((msg, index) => {
								const prevMsg = messages[index - 1];
								const showDate =
									!prevMsg ||
									new Date(msg.timestamp).toDateString() !==
										new Date(prevMsg.timestamp).toDateString();

								return (
									<div key={msg.id}>
										{showDate && (
											<div className="flex justify-center my-6">
												<span className="text-[11px] font-medium bg-background border shadow-sm px-3 py-1 rounded-full text-muted-foreground uppercase tracking-wider">
													{new Date(msg.timestamp).toLocaleDateString(
														ptBR.code,
														{ weekday: "long", day: "numeric", month: "long" },
													)}
												</span>
											</div>
										)}
										<MessageBubble message={msg} />
									</div>
								);
							})}
						</div>
					)}
					<div ref={messagesEndRef} className="h-2" />
				</div>
			</ScrollArea>

			<div className="p-4 bg-background border-t z-10 shrink-0">
				<div className="flex items-end gap-3 max-w-5xl mx-auto">
					<div className="flex gap-1.5 pb-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
						>
							<Paperclip className="h-5 w-5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9 rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
							onClick={() => setShowNoteDialog(true)}
							title="Adicionar Nota Interna"
						>
							<StickyNote className="h-5 w-5" />
						</Button>
					</div>
					<div className="flex-1 bg-muted/60 dark:bg-muted/40 rounded-3xl border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-colors flex items-end min-h-[44px]">
						<Textarea
							placeholder="Digite uma mensagem..."
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
							className="min-h-[44px] max-h-[120px] bg-transparent border-none resize-none py-3 px-4 shadow-none focus-visible:ring-0 text-[15px]"
							rows={1}
						/>
					</div>
					<Button
						size="icon"
						className={`h-11 w-11 rounded-full shrink-0 shadow-md transition-all ${
							input.trim()
								? "bg-primary text-primary-foreground hover:bg-primary/90"
								: "bg-muted text-muted-foreground"
						}`}
						onClick={handleSend}
						disabled={sending || !input.trim()}
					>
						{sending ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<Send className="h-5 w-5 ml-0.5" />
						)}
					</Button>
				</div>
			</div>

			<Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
							<StickyNote className="h-5 w-5" />
							Adicionar nota interna
						</DialogTitle>
					</DialogHeader>
					<div className="py-3">
						<Textarea
							placeholder="Escreva uma nota que ficará visível apenas para sua equipe..."
							value={noteContent}
							onChange={(e) => setNoteContent(e.target.value)}
							rows={4}
							className="resize-none border-amber-200 focus-visible:ring-amber-500/30"
						/>
						<p className="text-xs text-muted-foreground mt-2">
							O paciente não verá esta nota. Ela será salva no histórico da
							conversa.
						</p>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Cancelar</Button>
						</DialogClose>
						<Button
							onClick={handleNote}
							disabled={!noteContent.trim()}
							className="bg-amber-600 hover:bg-amber-700 text-white"
						>
							Salvar nota
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function WhatsAppInboxPage() {
	const [statusFilter, setStatusFilter] = useState("all");
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [showTransferDialog, setShowTransferDialog] = useState(false);
	const [quickReplyText, setQuickReplyText] = useState<string | null>(null);

	const { conversations, loading, pagination } = useWhatsAppInbox({
		status:
			statusFilter === "all"
				? undefined
				: statusFilter === "mine"
					? undefined
					: statusFilter,
		search: search || undefined,
	});

	const { conversation, addNote, assign, transfer, updateStatus } =
		useWhatsAppConversation(selectedId);

	const filteredConversations =
		statusFilter === "mine"
			? conversations.filter((c) => c.assignedTo === "current-user")
			: conversations;

	return (
		<MainLayout fullWidth noPadding>
			<div className="flex h-[calc(100vh-4rem)] bg-background">
				<div className="w-[340px] border-r flex flex-col shrink-0 bg-background/50 z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
					<div className="p-4 border-b bg-background">
						<h2 className="text-xl font-bold mb-4 flex items-center gap-2">
							<MessageCircle className="h-6 w-6 text-primary" />
							Inbox
						</h2>
						<div className="relative">
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar conversas, pacientes..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:border-primary/50 focus-visible:bg-background rounded-full text-sm"
							/>
						</div>
					</div>

					<div className="px-2 py-2 bg-background border-b shadow-sm z-10">
						<ScrollArea className="w-full whitespace-nowrap" type="scroll">
							<div className="flex w-max space-x-1.5 p-1">
								{STATUS_TABS.map((tab) => (
									<button
										type="button"
										key={tab.value}
										onClick={() => setStatusFilter(tab.value)}
										className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
											statusFilter === tab.value
												? "bg-primary text-primary-foreground shadow-sm"
												: "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>
							<ScrollBar orientation="horizontal" className="hidden" />
						</ScrollArea>
					</div>

					<ScrollArea className="flex-1 bg-background">
						{loading ? (
							<div className="flex flex-col items-center justify-center h-40 gap-3">
								<Loader2 className="h-6 w-6 animate-spin text-primary" />
								<span className="text-sm text-muted-foreground">
									Carregando conversas...
								</span>
							</div>
						) : filteredConversations.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-40 text-muted-foreground px-6 text-center">
								<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
									<Filter className="h-6 w-6 opacity-50" />
								</div>
								<p className="text-sm font-medium text-foreground">
									Nenhuma conversa encontrada
								</p>
								<p className="text-xs mt-1">
									Tente ajustar os filtros ou termo de busca.
								</p>
							</div>
						) : (
							<div className="py-1">
								{filteredConversations.map((conv) => (
									<ConversationListItem
										key={conv.id}
										conversation={conv}
										isSelected={selectedId === conv.id}
										onClick={() => setSelectedId(conv.id)}
									/>
								))}
							</div>
						)}
					</ScrollArea>
					{pagination.totalPages > 1 && (
						<div className="p-3 border-t text-center text-xs text-muted-foreground bg-muted/20 font-medium">
							Página {pagination.page} de {pagination.totalPages}
						</div>
					)}
				</div>

				<ChatPanel
					selectedId={selectedId}
					onAddNote={async (content) => {
						await addNote(content);
					}}
					quickReplyText={quickReplyText}
					onQuickReplyUsed={() => setQuickReplyText(null)}
				/>

				<div
					className={`transition-all duration-300 ease-in-out border-l bg-background shrink-0 flex flex-col shadow-[-1px_0_10px_rgba(0,0,0,0.02)] z-20 ${
						conversation
							? "w-[320px] translate-x-0"
							: "w-0 translate-x-full overflow-hidden border-none"
					}`}
				>
					{conversation && (
						<ConversationDetailPanel
							conversation={conversation}
							onAssign={() => setShowAssignDialog(true)}
							onTransfer={() => setShowTransferDialog(true)}
							onResolve={async () => {
								await updateStatus("resolved");
							}}
							onClose={async () => {
								await updateStatus("closed");
							}}
							onAddTag={async (tagId) => {
								await addTags(conversation.id, [tagId]);
							}}
							onRemoveTag={async (tagId) => {
								await apiRemoveTag(conversation.id, tagId);
							}}
							onQuickReply={(content) => setQuickReplyText(content)}
						/>
					)}
				</div>
			</div>

			<Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5 text-primary" />
							Atribuir conversa
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<Input
							placeholder="Buscar membro da equipe..."
							className="rounded-full bg-muted/50"
						/>
						<div className="text-sm text-muted-foreground text-center py-6 border rounded-lg bg-muted/20 border-dashed">
							Selecione um membro para atribuir
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Cancelar</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<ArrowRightLeft className="h-5 w-5 text-primary" />
							Transferir conversa
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<Input
							placeholder="Buscar setor ou responsável..."
							className="rounded-full bg-muted/50"
						/>
						<Textarea
							placeholder="Motivo da transferência (opcional)"
							className="resize-none"
							rows={3}
						/>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Cancelar</Button>
						</DialogClose>
						<Button>Confirmar Transferência</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</MainLayout>
	);
}
