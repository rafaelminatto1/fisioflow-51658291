import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	MessageSquare,
	Search,
	Send,
	Phone,
	Clock,
	User,
	Tag,
	MoreVertical,
	Paperclip,
	StickyNote,
	ArrowRightLeft,
	UserPlus,
	CheckCircle2,
	XCircle,
	ChevronDown,
	Loader2,
	AlertTriangle,
	Hash,
	NotebookPen,
	Zap,
	UserCheck,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWhatsAppInbox, useWhatsAppConversation } from "@/hooks/useWhatsApp";
import {
	fetchTags,
	fetchQuickReplies,
	addTags,
	removeTag as apiRemoveTag,
} from "@/services/whatsapp-api";
import type {
	Conversation,
	Message,
	Tag as TagType,
	QuickReply,
} from "@/services/whatsapp-api";

const STATUS_TABS = [
	{ value: "all", label: "Todas" },
	{ value: "open", label: "Abertas" },
	{ value: "pending", label: "Pendentes" },
	{ value: "mine", label: "Minhas" },
	{ value: "resolved", label: "Resolvidas" },
];

const STATUS_COLORS: Record<string, string> = {
	open: "bg-green-100 text-green-700 border-green-200",
	pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
	resolved: "bg-blue-100 text-blue-700 border-blue-200",
	closed: "bg-gray-100 text-gray-700 border-gray-200",
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
				addSuffix: true,
				locale: ptBR,
			})
		: "";

	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${
				isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
			}`}
		>
			<div className="flex items-start gap-3">
				<Avatar className="h-10 w-10 shrink-0">
					<AvatarFallback className="text-xs bg-primary/10 text-primary">
						{conversation.contactName?.slice(0, 2).toUpperCase() || "??"}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between gap-2">
						<span className="font-medium text-sm truncate">
							{conversation.contactName}
						</span>
						<span className="text-xs text-muted-foreground whitespace-nowrap">
							{timeAgo}
						</span>
					</div>
					<div className="flex items-center gap-1 mt-0.5">
						<span className="text-xs text-muted-foreground truncate flex-1">
							{conversation.lastMessage || "Sem mensagens"}
						</span>
					</div>
					<div className="flex items-center gap-2 mt-1.5">
						{conversation.unreadCount > 0 && (
							<span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
								{conversation.unreadCount}
							</span>
						)}
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
								<AvatarFallback className="text-[8px] bg-muted">
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
			<div className="flex justify-center my-2">
				<div className="max-w-[85%] bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
					<div className="flex items-center gap-1.5 mb-1">
						<StickyNote className="h-3 w-3 text-amber-600" />
						<span className="text-[11px] font-medium text-amber-700">
							Nota interna
						</span>
						{message.senderName && (
							<span className="text-[11px] text-amber-600">
								· {message.senderName}
							</span>
						)}
					</div>
					<p className="text-sm text-amber-900">{message.content}</p>
					<span className="text-[10px] text-amber-500 mt-1 block">{time}</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-2`}
		>
			<div
				className={`max-w-[70%] rounded-lg px-3 py-2 ${
					isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
				}`}
			>
				<p className="text-sm whitespace-pre-wrap break-words">
					{message.content}
				</p>
				{message.interactiveData && (
					<div className="mt-2 space-y-1">
						{message.interactiveData.buttons?.map((btn) => (
							<div
								key={btn.id}
								className={`text-xs px-2 py-1 rounded border ${
									isOutbound ? "border-primary-foreground/30" : "border-border"
								}`}
							>
								{btn.title}
							</div>
						))}
					</div>
				)}
				<div
					className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : ""}`}
				>
					<span
						className={`text-[10px] ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}
					>
						{time}
					</span>
					{isOutbound && message.status && (
						<span
							className={`text-[10px] ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}
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
}: {
	conversation: Conversation;
	onAssign: () => void;
	onTransfer: () => void;
	onResolve: () => void;
	onClose: () => void;
	onAddTag: (tagId: string) => void;
	onRemoveTag: (tagId: string) => void;
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
		<div className="h-full flex flex-col">
			<div className="p-4 border-b">
				<h3 className="font-semibold text-sm">Detalhes</h3>
			</div>
			<ScrollArea className="flex-1">
				<div className="p-4 space-y-4">
					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-1">
							Contato
						</h4>
						<div className="flex items-center gap-2">
							<Avatar className="h-8 w-8">
								<AvatarFallback className="text-xs bg-primary/10 text-primary">
									{conversation.contactName?.slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div>
								<p className="text-sm font-medium">
									{conversation.contactName}
								</p>
								<p className="text-xs text-muted-foreground">
									{conversation.contactPhone}
								</p>
							</div>
						</div>
					</div>

					{conversation.patientId && (
						<div>
							<h4 className="text-xs font-medium text-muted-foreground mb-1">
								Paciente vinculado
							</h4>
							<Link
								to={`/patients/${conversation.patientId}`}
								className="text-sm text-primary hover:underline flex items-center gap-1"
							>
								<User className="h-3 w-3" />
								{conversation.patientName || "Ver paciente"}
							</Link>
						</div>
					)}

					<Separator />

					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-1">
							Tags
						</h4>
						<div className="flex flex-wrap gap-1">
							{conversation.tags.map((tag) => (
								<Badge
									key={tag.id}
									variant="outline"
									className="text-xs cursor-pointer hover:bg-destructive/10"
									style={{ borderColor: tag.color, color: tag.color }}
									onClick={() => onRemoveTag(tag.id)}
								>
									{tag.name} ×
								</Badge>
							))}
							{availableTags.length > 0 && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 text-xs px-2"
										>
											<Hash className="h-3 w-3 mr-1" />
											Add
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										{availableTags.map((tag) => (
											<DropdownMenuItem
												key={tag.id}
												onClick={() => onAddTag(tag.id)}
											>
												<span style={{ color: tag.color }}>●</span> {tag.name}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					</div>

					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-1">
							Responsável
						</h4>
						<div className="flex items-center gap-2">
							<Avatar className="h-6 w-6">
								<AvatarFallback className="text-[10px]">
									{conversation.assignedToName?.slice(0, 2).toUpperCase() ||
										"?"}
								</AvatarFallback>
							</Avatar>
							<span className="text-sm">
								{conversation.assignedToName || "Não atribuído"}
							</span>
						</div>
					</div>

					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-1">
							Status
						</h4>
						<Badge className={STATUS_COLORS[conversation.status] || ""}>
							{conversation.status === "open"
								? "Aberta"
								: conversation.status === "pending"
									? "Pendente"
									: conversation.status === "resolved"
										? "Resolvida"
										: "Fechada"}
						</Badge>
						{conversation.slaBreached && (
							<div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
								<AlertTriangle className="h-3 w-3" /> SLA vencido
							</div>
						)}
					</div>

					{conversation.priority && (
						<div>
							<h4 className="text-xs font-medium text-muted-foreground mb-1">
								Prioridade
							</h4>
							<span
								className={`text-sm flex items-center gap-1 ${PRIORITY_COLORS[conversation.priority]}`}
							>
								{conversation.priority === "urgent"
									? "Urgente"
									: conversation.priority === "high"
										? "Alta"
										: conversation.priority === "medium"
											? "Média"
											: "Baixa"}
							</span>
						</div>
					)}

					<Separator />

					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-2">
							Ações rápidas
						</h4>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={onAssign}
							>
								<UserPlus className="h-3 w-3 mr-1" /> Atribuir
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={onTransfer}
							>
								<ArrowRightLeft className="h-3 w-3 mr-1" /> Transferir
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={onResolve}
							>
								<CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={onClose}
							>
								<XCircle className="h-3 w-3 mr-1" /> Fechar
							</Button>
						</div>
					</div>

					{quickReplies.length > 0 && (
						<div>
							<h4 className="text-xs font-medium text-muted-foreground mb-2">
								Respostas rápidas
							</h4>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="w-full text-xs"
									>
										<Zap className="h-3 w-3 mr-1" /> Respostas rápidas
										<ChevronDown className="h-3 w-3 ml-auto" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-64">
									{quickReplies.map((qr) => (
										<DropdownMenuItem key={qr.id}>
											<div>
												<p className="font-medium text-xs">{qr.name}</p>
												<p className="text-[10px] text-muted-foreground truncate max-w-56">
													{qr.content}
												</p>
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
}: {
	selectedId: string | null;
	onAddNote: (content: string) => void;
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

	if (!selectedId) {
		return (
			<div className="flex-1 flex items-center justify-center bg-muted/30">
				<div className="text-center">
					<MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
					<h3 className="text-lg font-medium text-muted-foreground">
						Selecione uma conversa
					</h3>
					<p className="text-sm text-muted-foreground/70">
						Escolha uma conversa na lista para começar
					</p>
				</div>
			</div>
		);
	}

	if (loading && messages.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
		<div className="flex-1 flex flex-col h-full">
			<div className="h-14 border-b px-4 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-3">
					<Avatar className="h-8 w-8">
						<AvatarFallback className="text-xs bg-primary/10 text-primary">
							{conversation.contactName?.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div>
						<h3 className="text-sm font-medium">{conversation.contactName}</h3>
						<p className="text-xs text-muted-foreground">
							{conversation.contactPhone}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge className={STATUS_COLORS[conversation.status] || ""}>
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

			<ScrollArea className="flex-1 p-4">
				{messages.length === 0 ? (
					<div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
						Nenhuma mensagem ainda
					</div>
				) : (
					messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
				)}
				<div ref={messagesEndRef} />
			</ScrollArea>

			<div className="border-t p-3 shrink-0">
				<div className="flex items-end gap-2">
					<div className="flex gap-1">
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<Paperclip className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={() => setShowNoteDialog(true)}
						>
							<NotebookPen className="h-4 w-4" />
						</Button>
					</div>
					<div className="flex-1">
						<Input
							placeholder="Digite uma mensagem..."
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
							className="h-9"
						/>
					</div>
					<Button
						size="icon"
						className="h-9 w-9"
						onClick={handleSend}
						disabled={sending || !input.trim()}
					>
						{sending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>

			<Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Adicionar nota interna</DialogTitle>
					</DialogHeader>
					<Textarea
						placeholder="Escreva uma nota interna..."
						value={noteContent}
						onChange={(e) => setNoteContent(e.target.value)}
						rows={4}
					/>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancelar</Button>
						</DialogClose>
						<Button onClick={handleNote} disabled={!noteContent.trim()}>
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
			<div className="flex h-[calc(100vh-4rem)]">
				<div className="w-[300px] border-r flex flex-col shrink-0 bg-background">
					<div className="p-3 border-b">
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar conversas..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-9"
							/>
						</div>
					</div>
					<Tabs
						value={statusFilter}
						onValueChange={setStatusFilter}
						className="px-3 pt-2"
					>
						<TabsList className="w-full h-8 p-0 bg-transparent">
							{STATUS_TABS.map((tab) => (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className="flex-1 text-[11px] h-7 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
								>
									{tab.label}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					<ScrollArea className="flex-1">
						{loading ? (
							<div className="flex items-center justify-center h-40">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : filteredConversations.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
								<MessageSquare className="h-8 w-8 mb-2 opacity-50" />
								<p className="text-sm">Nenhuma conversa encontrada</p>
							</div>
						) : (
							filteredConversations.map((conv) => (
								<ConversationListItem
									key={conv.id}
									conversation={conv}
									isSelected={selectedId === conv.id}
									onClick={() => setSelectedId(conv.id)}
								/>
							))
						)}
					</ScrollArea>
					{pagination.totalPages > 1 && (
						<div className="p-2 border-t text-center text-xs text-muted-foreground">
							Página {pagination.page} de {pagination.totalPages}
						</div>
					)}
				</div>

				<ChatPanel
					selectedId={selectedId}
					onAddNote={async (content) => {
						await addNote(content);
					}}
				/>

				<div className="w-[280px] border-l shrink-0 bg-background">
					{conversation ? (
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
						/>
					) : (
						<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
							Selecione uma conversa
						</div>
					)}
				</div>
			</div>

			<Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Atribuir conversa</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Input placeholder="Buscar membro da equipe..." />
						<div className="text-sm text-muted-foreground">
							Selecione um membro para atribuir
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancelar</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Transferir conversa</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Input placeholder="Buscar novo responsável..." />
						<Input placeholder="Motivo da transferência (opcional)" />
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancelar</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</MainLayout>
	);
}
