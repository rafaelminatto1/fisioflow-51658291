import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Activity,
	AlarmClock,
	AlertTriangle,
	ArrowRightLeft,
	BarChart3,
	BellRing,
	Calendar,
	CalendarCheck,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Edit3,
	Filter,
	Hash,
	ListChecks,
	Loader2,
	LayoutTemplate,
	Info,
	MapPin,
	Megaphone,
	MessageCircle,
	MessageSquare,
	Mic,
	MoreVertical,
	Paperclip,
	Phone,
	Plus,
	Search,
	Send,
	StickyNote,
	Tag,
	Target,
	Trash2,
	User,
	UserPlus,
	XCircle,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
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
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import { organizationMembersApi } from "@/api/v2/system";
import { uploadFile } from "@/lib/storage/upload";
import type {
	Conversation,
	Contact,
	Message,
	Metrics,
	QuickReply,
	Tag as TagType,
} from "@/services/whatsapp-api";
import {
	addTags,
	bulkAction,
	fetchAgentsWorkload,
	fetchConversationActivity,
	fetchMetrics,
	fetchPendingConfirmations,
	removeTag as apiRemoveTag,
	fetchContacts,
	fetchQuickReplies,
	fetchTags,
	findOrCreateConversation,
	resolveContact,
	sendBroadcast,
	sendMessage as apiSendMessage,
	snoozeConversation,
	updatePriority,
} from "@/services/whatsapp-api";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

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

const PRIORITY_LABELS: Record<string, string> = {
	low: "Baixa",
	medium: "Média",
	high: "Alta",
	urgent: "Urgente",
};

const STATUS_LABELS: Record<string, string> = {
	open: "Aberta",
	pending: "Pendente",
	resolved: "Resolvida",
	closed: "Fechada",
};

function statusLabel(status: string): string {
	return STATUS_LABELS[status] ?? status;
}

function getMemberUserId(member: any): string {
	return member.userId ?? member.user_id ?? member.user?.id ?? member.id;
}

function getMemberName(member: any): string {
	return (
		member.user?.name ??
		member.profiles?.full_name ??
		member.profiles?.name ??
		member.name ??
		member.profiles?.email ??
		member.user?.email ??
		"Membro"
	);
}

function getMemberEmail(member: any): string {
	return member.user?.email ?? member.profiles?.email ?? member.email ?? "";
}

function MetricsStrip({ metrics }: { metrics: Metrics | null }) {
	if (!metrics) return null;

	const open =
		metrics.openConversations ?? (metrics as any).byStatus?.open ?? 0;
	const pending =
		metrics.pendingConversations ?? (metrics as any).byStatus?.pending ?? 0;
	const slaBreached = metrics.slaBreached ?? 0;
	const avgMin = metrics.avgFirstResponseTime
		? Math.round(metrics.avgFirstResponseTime / 60)
		: (metrics as any).avgResponseSeconds
			? Math.round((metrics as any).avgResponseSeconds / 60)
			: 0;

	return (
		<div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b text-xs">
			<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
				<MessageCircle className="h-3 w-3" />
				<span>{open} abertas</span>
			</div>
			<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-medium">
				<Clock className="h-3 w-3" />
				<span>{pending} pendentes</span>
			</div>
			{slaBreached > 0 && (
				<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium">
					<AlertTriangle className="h-3 w-3" />
					<span>{slaBreached} SLA</span>
				</div>
			)}
			{avgMin > 0 && (
				<div className="flex items-center gap-1.5 ml-auto text-muted-foreground">
					<BarChart3 className="h-3 w-3" />
					<span>~{avgMin}min resposta</span>
				</div>
			)}
		</div>
	);
}

function BroadcastModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [contactSearch, setContactSearch] = useState("");
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [loadingContacts, setLoadingContacts] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [result, setResult] = useState<{
		sent: number;
		failed: number;
		total: number;
	} | null>(null);

	useEffect(() => {
		if (!open) return;
		let active = true;
		const t = window.setTimeout(async () => {
			setLoadingContacts(true);
			try {
				const res = await fetchContacts({
					search: contactSearch || undefined,
					limit: 50,
				});
				if (active) setContacts(res.data);
			} catch {
				if (active) setContacts([]);
			} finally {
				if (active) setLoadingContacts(false);
			}
		}, 250);
		return () => {
			active = false;
			window.clearTimeout(t);
		};
	}, [open, contactSearch]);

	const handleClose = () => {
		setStep(1);
		setSelectedIds(new Set());
		setMessage("");
		setResult(null);
		setContactSearch("");
		onClose();
	};

	const toggleContact = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSend = async () => {
		if (!message.trim() || selectedIds.size === 0) return;
		setSending(true);
		try {
			const res = await sendBroadcast([...selectedIds], message.trim());
			setResult(res);
			setStep(3);
		} catch {
			// ignore
		} finally {
			setSending(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) handleClose();
			}}
		>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-primary">
						<Megaphone className="h-5 w-5" />
						Campanha WhatsApp
					</DialogTitle>
				</DialogHeader>

				{step === 1 && (
					<div className="space-y-4 py-2">
						<div className="flex items-center gap-2">
							<div className="flex-1 h-1.5 rounded-full bg-primary" />
							<div className="flex-1 h-1.5 rounded-full bg-muted" />
							<div className="flex-1 h-1.5 rounded-full bg-muted" />
						</div>
						<p className="text-sm text-muted-foreground">
							Selecione os contatos que receberão a mensagem ({selectedIds.size}{" "}
							selecionados)
						</p>
						<Input
							placeholder="Buscar contato..."
							value={contactSearch}
							onChange={(e) => setContactSearch(e.target.value)}
							className="rounded-full bg-muted/50"
						/>
						<ScrollArea className="h-[280px] border rounded-xl bg-muted/10 px-2 py-2">
							{loadingContacts ? (
								<div className="flex justify-center py-8">
									<Loader2 className="h-5 w-5 animate-spin text-primary" />
								</div>
							) : contacts.length === 0 ? (
								<div className="text-sm text-muted-foreground text-center py-8">
									Nenhum contato encontrado
								</div>
							) : (
								<div className="space-y-1">
									{contacts.map((c) => {
										const sel = selectedIds.has(c.id);
										return (
											<button
												key={c.id}
												type="button"
												onClick={() => toggleContact(c.id)}
												className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${sel ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/60"}`}
											>
												<div
													className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "bg-primary border-primary" : "border-border"}`}
												>
													{sel && (
														<CheckCircle2 className="h-3 w-3 text-primary-foreground" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">
														{c.name}
													</p>
													<p className="text-xs text-muted-foreground truncate">
														{c.phone || "Sem telefone"}
													</p>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</ScrollArea>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="ghost" onClick={handleClose}>
									Cancelar
								</Button>
							</DialogClose>
							<Button
								onClick={() => setStep(2)}
								disabled={selectedIds.size === 0}
							>
								Próximo ({selectedIds.size})
							</Button>
						</DialogFooter>
					</div>
				)}

				{step === 2 && (
					<div className="space-y-4 py-2">
						<div className="flex items-center gap-2">
							<div className="flex-1 h-1.5 rounded-full bg-primary" />
							<div className="flex-1 h-1.5 rounded-full bg-primary" />
							<div className="flex-1 h-1.5 rounded-full bg-muted" />
						</div>
						<p className="text-sm text-muted-foreground">
							Escreva a mensagem para enviar a{" "}
							<strong>{selectedIds.size} contato(s)</strong>
						</p>
						<Textarea
							placeholder="Digite a mensagem da campanha..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={6}
							className="resize-none"
						/>
						<p className="text-xs text-muted-foreground">
							A mensagem será enviada individualmente para cada contato
							selecionado.
						</p>
						<DialogFooter>
							<Button variant="outline" onClick={() => setStep(1)}>
								Voltar
							</Button>
							<Button
								onClick={handleSend}
								disabled={!message.trim() || sending}
							>
								{sending ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<Send className="h-4 w-4 mr-2" />
								)}
								Enviar campanha
							</Button>
						</DialogFooter>
					</div>
				)}

				{step === 3 && result && (
					<div className="space-y-4 py-4 text-center">
						<div className="flex items-center gap-2 justify-center">
							<div className="flex-1 h-1.5 rounded-full bg-primary" />
							<div className="flex-1 h-1.5 rounded-full bg-primary" />
							<div className="flex-1 h-1.5 rounded-full bg-primary" />
						</div>
						<div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
							<CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<h3 className="font-semibold text-lg">Campanha enviada!</h3>
							<p className="text-sm text-muted-foreground mt-1">
								{result.sent} enviadas · {result.failed} falhas · {result.total}{" "}
								total
							</p>
						</div>
						<Button className="w-full" onClick={handleClose}>
							Concluir
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ConfirmationsModal({
	open,
	onClose,
	onSendConfirmation,
}: {
	open: boolean;
	onClose: () => void;
	onSendConfirmation: (
		phone: string,
		patientName: string,
		date: string,
		time: string,
	) => Promise<void>;
}) {
	const [confirmations, setConfirmations] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState<string | null>(null);
	const [sent, setSent] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		fetchPendingConfirmations(50)
			.then(setConfirmations)
			.catch(() => setConfirmations([]))
			.finally(() => setLoading(false));
	}, [open]);

	const handleSend = async (appt: any) => {
		const phone = appt.patient?.phone;
		if (!phone || sending) return;
		setSending(appt.appointment_id);
		try {
			await onSendConfirmation(
				phone,
				appt.patient?.name || "Paciente",
				appt.appointment_date || "",
				appt.appointment_time || "",
			);
			setSent((prev) => new Set([...prev, appt.appointment_id]));
		} finally {
			setSending(null);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) {
					setSent(new Set());
					onClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-primary">
						<CalendarCheck className="h-5 w-5" />
						Confirmar Consultas
					</DialogTitle>
				</DialogHeader>
				<div className="py-2">
					{loading ? (
						<div className="flex justify-center py-10">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : confirmations.length === 0 ? (
						<div className="text-center py-10 text-muted-foreground">
							<CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p className="text-sm font-medium text-foreground">
								Nenhuma consulta pendente
							</p>
							<p className="text-xs mt-1">
								Não há consultas aguardando confirmação.
							</p>
						</div>
					) : (
						<ScrollArea className="h-[360px]">
							<div className="space-y-2 pr-2">
								{confirmations.map((appt) => {
									const isAlreadySent = sent.has(appt.appointment_id);
									const isSending = sending === appt.appointment_id;
									const hasPhone = !!appt.patient?.phone;
									return (
										<div
											key={appt.appointment_id}
											className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
										>
											<div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
												<Calendar className="h-4 w-4 text-primary" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{appt.patient?.name || "Paciente desconhecido"}
												</p>
												<p className="text-xs text-muted-foreground">
													{appt.appointment_date
														? new Date(
																appt.appointment_date + "T00:00:00",
															).toLocaleDateString("pt-BR", {
																weekday: "short",
																day: "numeric",
																month: "short",
															})
														: "—"}{" "}
													às {appt.appointment_time || "—"}
												</p>
												{!hasPhone && (
													<p className="text-[11px] text-orange-500 mt-0.5">
														Sem número cadastrado
													</p>
												)}
											</div>
											<Button
												size="sm"
												variant={isAlreadySent ? "ghost" : "outline"}
												className={`h-8 text-xs shrink-0 ${isAlreadySent ? "text-green-600 dark:text-green-400" : ""}`}
												disabled={!hasPhone || isSending || isAlreadySent}
												onClick={() => handleSend(appt)}
											>
												{isSending ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : isAlreadySent ? (
													<>
														<CheckCircle2 className="h-3 w-3 mr-1" /> Enviado
													</>
												) : (
													<>
														<BellRing className="h-3 w-3 mr-1" /> Confirmar
													</>
												)}
											</Button>
										</div>
									);
								})}
							</div>
						</ScrollArea>
					)}
				</div>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => {
							setSent(new Set());
							onClose();
						}}
					>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
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

function ConversationListItem({
	conversation,
	isSelected,
	onClick,
	bulkMode,
	isSelectedBulk,
}: {
	conversation: Conversation;
	isSelected: boolean;
	onClick: () => void;
	bulkMode?: boolean;
	isSelectedBulk?: boolean;
}) {
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

function renderMessageContent(message: Message) {
	let parsed: any = null;
	if (typeof message.content === "string") {
		try {
			parsed = JSON.parse(message.content);
		} catch {
			parsed = null;
		}
	} else {
		parsed = message.content;
	}

	const type = message.type;

	if (type === "image" || parsed?.type === "image") {
		const url =
			parsed?.url ||
			parsed?.link ||
			(typeof message.content === "string" && message.content.startsWith("http")
				? message.content
				: null);
		if (url) {
			return (
				<div className="mt-1">
					<img
						src={url}
						alt="Imagem"
						className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
						onClick={() => window.open(url, "_blank")}
					/>
					{parsed?.caption && <p className="text-sm mt-1">{parsed.caption}</p>}
				</div>
			);
		}
	}

	if (type === "audio" || (type as string) === "voice") {
		const url = parsed?.url || parsed?.link;
		if (url) {
			return <audio controls src={url} className="mt-1 max-w-full h-10" />;
		}
		return (
			<div className="flex items-center gap-2 mt-1 text-xs opacity-75">
				<Mic className="h-4 w-4" /> Mensagem de voz
			</div>
		);
	}

	if (type === "document") {
		const url = parsed?.url || parsed?.link;
		const filename = parsed?.filename || parsed?.name || "Documento";
		return (
			<div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-black/10 dark:bg-white/10">
				<Paperclip className="h-4 w-4 shrink-0" />
				<span className="text-sm truncate flex-1">{filename}</span>
				{url && (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs underline shrink-0"
					>
						Baixar
					</a>
				)}
			</div>
		);
	}

	if (type === "location") {
		const lat = parsed?.latitude;
		const lng = parsed?.longitude;
		const name = parsed?.name || "Localização";
		if (lat && lng) {
			return (
				<a
					href={`https://maps.google.com/?q=${lat},${lng}`}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 mt-1 text-sm underline"
				>
					<MapPin className="h-4 w-4 shrink-0" /> {name}
				</a>
			);
		}
	}

	const text =
		typeof message.content === "string"
			? message.content
			: JSON.stringify(message.content);
	return (
		<p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
			{text}
		</p>
	);
}

function MessageBubble({
	message,
	onEdit,
	onDelete,
}: {
	message: Message;
	onEdit?: (message: Message) => void;
	onDelete?: (message: Message, scope: "local" | "everyone") => void;
}) {
	const isOutbound = message.direction === "outbound";
	const isNote = message.type === "note";
	const isDeleted = Boolean(message.deletedAt);
	const canEdit = Boolean(onEdit) && !isDeleted;
	const canDelete = Boolean(onDelete) && !isDeleted;
	const canDeleteForEveryone =
		canDelete && isOutbound && message.canDeleteForEveryone === true;
	const deleteForEveryoneExpired =
		canDelete &&
		isOutbound &&
		message.canDeleteForEveryone === false &&
		Boolean(message.deleteForEveryoneExpiresAt);
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
						{message.editedAt ? " · editada" : ""}
					</span>
					{(canEdit || canDelete) && (
						<div className="mt-2 flex justify-end">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 px-2 text-[11px] text-amber-700 hover:text-amber-900"
									>
										<MoreVertical className="h-3.5 w-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{canEdit && (
										<DropdownMenuItem onClick={() => onEdit?.(message)}>
											<Edit3 className="h-4 w-4 mr-2" />
											Editar nota
										</DropdownMenuItem>
									)}
									{canDelete && (
										<DropdownMenuItem onClick={() => onDelete?.(message, "local")}>
											<Trash2 className="h-4 w-4 mr-2" />
											Apagar nota
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)}
				</div>
			</div>
		);
	}

	if (isDeleted) {
		return (
			<div
				className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3`}
			>
				<div
					className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm relative ${
						isOutbound
							? "bg-muted/30 text-muted-foreground rounded-tr-sm border border-border/20"
							: "bg-muted/10 text-muted-foreground rounded-tl-sm border border-border/20"
					}`}
				>
					<div className="flex items-center gap-2 text-[13px] italic opacity-80">
						<Trash2 className="h-3.5 w-3.5 opacity-60" />
						<span>
							{message.deleteScope === "everyone"
								? "Esta mensagem foi apagada para todos"
								: "Esta mensagem foi apagada"}
						</span>
					</div>
					<div className="text-[10px] mt-1 text-muted-foreground/60 text-right">
						{time}
					</div>
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
				{renderMessageContent(message)}
				{(canEdit || canDelete) && (
					<div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="secondary"
									size="icon"
									className="h-7 w-7 rounded-full shadow-sm"
								>
									<MoreVertical className="h-3.5 w-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{canEdit && (
									<DropdownMenuItem onClick={() => onEdit?.(message)}>
										<Edit3 className="h-4 w-4 mr-2" />
										Editar mensagem
									</DropdownMenuItem>
								)}
								{canDelete && (
									<DropdownMenuItem onClick={() => onDelete?.(message, "local")}>
										<Trash2 className="h-4 w-4 mr-2" />
										Apagar no FisioFlow
									</DropdownMenuItem>
								)}
								{canDeleteForEveryone && (
									<DropdownMenuItem
										onClick={() => onDelete?.(message, "everyone")}
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Apagar para todos
									</DropdownMenuItem>
								)}
								{deleteForEveryoneExpired && (
									<DropdownMenuItem disabled>
										Prazo para todos expirado
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
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
						{message.editedAt ? " · editada" : ""}
					</span>
					{isOutbound && message.status && (
						<span
							className={`text-[10px] flex items-center ${
								message.status === "failed"
									? "text-red-200 font-semibold"
									: message.status === "read"
										? "text-blue-300"
										: "text-primary-foreground/70"
							}`}
						>
							{message.status === "failed"
								? "Falha"
								: message.status === "read"
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
	onPriorityChange,
	onSnooze,
}: {
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
}) {
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

function ChatPanel({
	selectedId,
	onAddNote,
	quickReplyText,
	onQuickReplyUsed,
	onMessageSent,
	onConversationDeleted,
	}: {
		selectedId: string | null;
		onAddNote: (content: string) => Promise<void> | void;
		quickReplyText: string | null;
		onQuickReplyUsed: () => void;
		onMessageSent?: () => Promise<void> | void;
		onConversationDeleted?: () => Promise<void> | void;
}) {
	const {
		conversation,
		messages,
		loading,
		sendMessage,
		updateMessage,
		deleteMessage,
		deleteConversation,
		refetch,
	} =
		useWhatsAppConversation(selectedId);
	const { data: templates = [] } = useWhatsAppTemplates();
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [showNoteDialog, setShowNoteDialog] = useState(false);
	const [noteContent, setNoteContent] = useState("");
	const [editingMessage, setEditingMessage] = useState<Message | null>(null);
	const [editContent, setEditContent] = useState("");
	const [savingEdit, setSavingEdit] = useState(false);
	const [attachment, setAttachment] = useState<{
		file: File;
		preview: string;
	} | null>(null);
	const [uploading, setUploading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const is24hWindowOpen = useMemo(() => {
		if (!messages || messages.length === 0) return false;
		const lastInboundMsg = [...messages]
			.reverse()
			.find((m) => m.direction === "inbound");
		if (!lastInboundMsg) return false;
		const diff = new Date().getTime() - new Date(lastInboundMsg.timestamp).getTime();
		return diff <= 24 * 60 * 60 * 1000;
	}, [messages]);

	const handleSendTemplate = async (templateName: string, templateLanguage: string = "pt_BR") => {
		if (sending) return;
		setSending(true);
		try {
			await sendMessage(`[Template: ${templateName}]`, {
				type: "template",
				templateName,
				templateLanguage,
			});
			toast.success("Template enviado com sucesso");
			await onMessageSent?.();
		} catch (error) {
			toast.error("Erro ao enviar template");
		} finally {
			setSending(false);
		}
	};

	// Slash command state
	const [slashQuery, setSlashQuery] = useState("");
	const [showSlashMenu, setShowSlashMenu] = useState(false);
	const [slashIndex, setSlashIndex] = useState(0);
	const [allQuickReplies, setAllQuickReplies] = useState<QuickReply[]>([]);

	useEffect(() => {
		fetchQuickReplies()
			.then(setAllQuickReplies)
			.catch(() => {});
	}, []);

	const slashFiltered = slashQuery
		? allQuickReplies
				.filter(
					(qr) =>
						accentIncludes(qr.name, slashQuery) ||
						accentIncludes(qr.content, slashQuery),
				)
				.slice(0, 5)
		: allQuickReplies.slice(0, 5);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

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

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const preview = file.type.startsWith("image/")
			? URL.createObjectURL(file)
			: file.name;

		setAttachment({ file, preview });
		e.target.value = "";
	};

	const handleSend = async () => {
		if ((!input.trim() && !attachment) || sending) return;
		setSending(true);
		try {
			if (attachment) {
				setUploading(true);
				const upload = await uploadFile(attachment.file, {
					folder: "whatsapp-attachments",
				});
				await sendMessage(input.trim(), {
					type: attachment.file.type.startsWith("image/")
						? "image"
						: "document",
					attachmentUrl: upload.url,
				});
				setUploading(false);
			} else {
				await sendMessage(input.trim());
			}
			setInput("");
			setAttachment(null);
			await onMessageSent?.();
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Erro desconhecido";
			console.error("[WhatsAppInbox] Failed to send message from chat panel", {
				conversationId: selectedId,
				hasAttachment: Boolean(attachment),
				messageLength: input.trim().length,
				error,
			});
			toast.error("Mensagem não enviada", {
				description: errorMessage,
			});
			setUploading(false);
			void refetch();
		} finally {
			setSending(false);
		}
	};

	const handleNote = async () => {
		if (!noteContent.trim()) return;
		try {
			await onAddNote(noteContent.trim());
			setNoteContent("");
			setShowNoteDialog(false);
			toast.success("Nota interna adicionada");
			void refetch();
		} catch (error) {
			toast.error("Não foi possível adicionar a nota", {
				description: error instanceof Error ? error.message : undefined,
			});
		}
	};

	const openEditMessage = (messageToEdit: Message) => {
		const currentContent =
			typeof messageToEdit.content === "string"
				? messageToEdit.content
				: JSON.stringify(messageToEdit.content);
		setEditingMessage(messageToEdit);
		setEditContent(currentContent);
	};

	const handleSaveMessageEdit = async () => {
		if (!editingMessage || !editContent.trim() || savingEdit) return;
		setSavingEdit(true);
		try {
			await updateMessage(editingMessage.id, editContent.trim());
			setEditingMessage(null);
			setEditContent("");
			toast.success("Mensagem editada");
			await onMessageSent?.();
		} catch (error) {
			toast.error("Não foi possível editar a mensagem", {
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setSavingEdit(false);
		}
	};

	const handleDeleteMessage = async (
		messageToDelete: Message,
		scope: "local" | "everyone",
	) => {
		const confirmText =
			scope === "everyone"
				? "Apagar esta mensagem para todos no atendimento? O WhatsApp permite essa ação apenas dentro do prazo padrão."
				: "Apagar esta mensagem no FisioFlow?";
		if (!window.confirm(confirmText)) return;

		try {
			await deleteMessage(messageToDelete.id, { scope });
			toast.success(
				scope === "everyone"
					? "Mensagem marcada como apagada para todos"
					: "Mensagem apagada",
			);
			await onMessageSent?.();
		} catch (error) {
			toast.error("Não foi possível apagar a mensagem", {
				description: error instanceof Error ? error.message : undefined,
			});
		}
	};

	const handleDeleteConversation = async () => {
		if (
			!window.confirm(
				"Excluir esta conversa da inbox? O histórico será preservado para auditoria.",
			)
		) {
			return;
		}

		try {
			await deleteConversation("Excluida pela inbox");
			toast.success("Conversa excluída da inbox");
			await onConversationDeleted?.();
		} catch (error) {
			toast.error("Não foi possível excluir a conversa", {
				description: error instanceof Error ? error.message : undefined,
			});
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setInput(val);
		const lastSegment = val.split(/[\s\n]/).pop() ?? "";
		if (lastSegment.startsWith("/")) {
			setSlashQuery(lastSegment.slice(1));
			setShowSlashMenu(true);
			setSlashIndex(0);
		} else {
			setShowSlashMenu(false);
			setSlashQuery("");
		}
	};

	const applySlashReply = (content: string) => {
		const lastIdx = Math.max(input.lastIndexOf(" "), input.lastIndexOf("\n"));
		const newInput =
			lastIdx >= 0 ? input.slice(0, lastIdx + 1) + content : content;
		setInput(newInput);
		setShowSlashMenu(false);
		setSlashQuery("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (showSlashMenu) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSlashIndex((i) => Math.min(i + 1, slashFiltered.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSlashIndex((i) => Math.max(i - 1, 0));
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (slashFiltered[slashIndex])
					applySlashReply(slashFiltered[slashIndex].content);
			} else if (e.key === "Escape") {
				setShowSlashMenu(false);
			}
			return;
		}
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
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
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground"
							>
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleDeleteConversation}>
								<Trash2 className="h-4 w-4 mr-2" />
								Excluir conversa
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
										<MessageBubble
											message={msg}
											onEdit={openEditMessage}
											onDelete={handleDeleteMessage}
										/>
									</div>
								);
							})}
						</div>
					)}
					<div ref={messagesEndRef} className="h-2" />
				</div>
			</ScrollArea>

			<div className="p-4 bg-background border-t z-10 shrink-0">
				{attachment && (
					<div className="mb-3 flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
						{attachment.file.type.startsWith("image/") ? (
							<img
								src={attachment.preview}
								alt="Attachment preview"
								className="h-12 w-12 object-cover rounded"
							/>
						) : (
							<div className="h-12 w-12 bg-primary/10 rounded flex items-center justify-center">
								<Paperclip className="h-5 w-5 text-primary" />
							</div>
						)}
						<span className="text-sm truncate flex-1">
							{attachment.file.name}
						</span>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={() => setAttachment(null)}
						>
							<XCircle className="h-4 w-4" />
						</Button>
					</div>
				)}
				<div className="flex items-end gap-3 max-w-5xl mx-auto">
					<div className="flex gap-1.5 pb-1">
						<input
							type="file"
							ref={fileInputRef}
							className="hidden"
							accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
							onChange={handleFileSelect}
						/>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
							onClick={() => fileInputRef.current?.click()}
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
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
									title="Enviar Template"
								>
									<LayoutTemplate className="h-5 w-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-80 mb-2">
								<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
									Templates Aprovados
								</div>
								{templates.filter((t: any) => (t?.status || "").toString().toUpperCase() === "APPROVED").length === 0 ? (
									<DropdownMenuItem disabled>Nenhum template aprovado</DropdownMenuItem>
								) : (
									templates
										.filter(
											(t: any) => (t?.status || "").toString().toUpperCase() === "APPROVED",
										)
										.map((t: any) => (
										<DropdownMenuItem key={t.id} onClick={() => handleSendTemplate(t.name, t.language)}>
											<div className="flex flex-col gap-1 w-full">
												<span className="font-medium">{t.name}</span>
												<span className="text-[10px] text-muted-foreground truncate w-full block">
													{Array.isArray(t.components) ? t.components.find((c: any) => c.type === 'BODY')?.text : (t.content || '...')}
												</span>
											</div>
										</DropdownMenuItem>
									))
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="flex-1 relative">
						{showSlashMenu && slashFiltered.length > 0 && (
							<div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
								<div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
									Respostas rápidas —{" "}
									<kbd className="bg-border px-1 rounded">↑↓</kbd> navegar ·{" "}
									<kbd className="bg-border px-1 rounded">Enter</kbd> inserir
								</div>
								{slashFiltered.map((qr, i) => (
									<button
										key={qr.id}
										type="button"
										className={`w-full text-left px-3 py-2.5 transition-colors ${i === slashIndex ? "bg-primary/10" : "hover:bg-muted/50"}`}
										onClick={() => applySlashReply(qr.content)}
										onMouseEnter={() => setSlashIndex(i)}
									>
										<div className="font-medium text-xs">/{qr.name}</div>
										<div className="text-xs text-muted-foreground truncate">
											{qr.content}
										</div>
									</button>
								))}
							</div>
						)}
						
						{!is24hWindowOpen ? (
							<div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-500 flex flex-col gap-2">
								<div className="flex items-center gap-2 font-semibold">
									<AlertTriangle className="h-4 w-4" />
									Janela de 24h Fechada
								</div>
								<p className="text-xs opacity-90">
									O paciente não interagiu nas últimas 24h. Para retomar o contato, você precisa enviar um modelo aprovado pela Meta.
								</p>
							</div>
						) : (
							<div className="bg-muted/60 dark:bg-muted/40 rounded-3xl border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-colors flex items-end min-h-[44px]">
								<Textarea
									placeholder="Digite uma mensagem... (/ para respostas rápidas)"
									value={input}
									onChange={handleInputChange}
									onKeyDown={handleKeyDown}
									className="min-h-[44px] max-h-[120px] bg-transparent border-none resize-none py-3 px-4 shadow-none focus-visible:ring-0 text-[15px]"
									rows={1}
								/>
							</div>
						)}
					</div>
					<Button
						size="icon"
						className={`h-11 w-11 rounded-full shrink-0 shadow-md transition-all ${
							input.trim() || attachment
								? "bg-primary text-primary-foreground hover:bg-primary/90"
								: "bg-muted text-muted-foreground"
						}`}
						onClick={handleSend}
						disabled={(!is24hWindowOpen) || sending || (!input.trim() && !attachment) || uploading}
					>
						{sending || uploading ? (
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
						<DialogDescription>
							Registre uma observação privada para a equipe nesta conversa.
						</DialogDescription>
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

			<Dialog
				open={Boolean(editingMessage)}
				onOpenChange={(open) => {
					if (!open && !savingEdit) {
						setEditingMessage(null);
						setEditContent("");
					}
				}}
			>
				<DialogContent className="sm:max-w-[480px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Edit3 className="h-5 w-5" />
							Editar mensagem
						</DialogTitle>
						<DialogDescription>
							A edição será salva no histórico da mensagem para auditoria.
						</DialogDescription>
					</DialogHeader>
					<div className="py-3">
						<Textarea
							placeholder="Digite o novo conteúdo da mensagem..."
							value={editContent}
							onChange={(e) => setEditContent(e.target.value)}
							rows={5}
							className="resize-none"
						/>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => {
								setEditingMessage(null);
								setEditContent("");
							}}
							disabled={savingEdit}
						>
							Cancelar
						</Button>
						<Button
							onClick={handleSaveMessageEdit}
							disabled={!editContent.trim() || savingEdit}
						>
							{savingEdit ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : null}
							Salvar edição
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function WhatsAppInboxPage() {
	const [statusFilter, setStatusFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
	const [tagFilter, setTagFilter] = useState<string | undefined>();
	const [availableTags, setAvailableTags] = useState<TagType[]>([]);
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [bulkMode, setBulkMode] = useState(false);
	const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(
		new Set(),
	);
	const [bulkAssigning, setBulkAssigning] = useState(false);
	const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
	const [showNewConversationDialog, setShowNewConversationDialog] =
		useState(false);
	const [contactSearch, setContactSearch] = useState("");
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [contactsLoading, setContactsLoading] = useState(false);
	const [creatingConversationId, setCreatingConversationId] = useState<
		string | null
	>(null);
	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [showTransferDialog, setShowTransferDialog] = useState(false);
	const [quickReplyText, setQuickReplyText] = useState<string | null>(null);
	const [teamMembers, setTeamMembers] = useState<any[]>([]);
	const [memberSearch, setMemberSearch] = useState("");
	const [agentsWorkload, setAgentsWorkload] = useState<any[]>([]);
	const [assigning, setAssigning] = useState(false);
	const [showBroadcastModal, setShowBroadcastModal] = useState(false);
	const [showConfirmationsModal, setShowConfirmationsModal] = useState(false);
	const [metrics, setMetrics] = useState<Metrics | null>(null);

	const [showAddNumberDialog, setShowAddNumberDialog] = useState(false);
	const [selectedPatientForNumber, setSelectedPatientForNumber] =
		useState<Contact | null>(null);
	const [newPhoneNumber, setNewPhoneNumber] = useState("");
	const [showAttachToPatientDialog, setShowAttachToPatientDialog] =
		useState(false);
	const [manualPhoneNumber, setManualPhoneNumber] = useState("");

	useEffect(() => {
		fetchMetrics()
			.then((m) => setMetrics(m as Metrics))
			.catch(() => {});
		fetchTags()
			.then((tags) => setAvailableTags(tags as TagType[]))
			.catch(() => {});
	}, []);

		const inboxFilters = useMemo(
			() => ({
				status:
					statusFilter === "all"
						? undefined
						: statusFilter === "mine"
							? undefined
							: statusFilter,
				assignedTo: statusFilter === "mine" ? "me" : undefined,
				priority: priorityFilter,
				search: search || undefined,
				tagId: tagFilter,
		}),
		[statusFilter, priorityFilter, search, tagFilter],
	);

		const { conversations, loading, pagination, refetch } =
			useWhatsAppInbox(inboxFilters);

		const {
			conversation,
			addNote,
			assign,
			transfer,
			updateStatus,
			refetch: refetchConversation,
		} = useWhatsAppConversation(selectedId);

		const filteredConversations = conversations;

	useEffect(() => {
		if (!showNewConversationDialog) return;

		let active = true;
		const timeoutId = window.setTimeout(async () => {
			setContactsLoading(true);
			try {
				const result = await fetchContacts({
					search: contactSearch || undefined,
					limit: 20,
				});
				if (active) {
					setContacts(result.data);
				}
			} catch (error) {
				console.error("Failed to load WhatsApp contacts:", error);
				if (active) {
					setContacts([]);
				}
			} finally {
				if (active) {
					setContactsLoading(false);
				}
			}
		}, 200);

		return () => {
			active = false;
			window.clearTimeout(timeoutId);
		};
	}, [showNewConversationDialog, contactSearch]);

	useEffect(() => {
		if (showAssignDialog || showTransferDialog) {
			organizationMembersApi
				.list({ limit: 100 })
				.then((res) => {
					setTeamMembers(res.data || []);
				})
				.catch(() => setTeamMembers([]));
			fetchAgentsWorkload()
				.then(setAgentsWorkload)
				.catch(() => {});
		}
	}, [showAssignDialog, showTransferDialog]);

		const handleAssign = async (userId: string) => {
			if (!selectedId || assigning) return;
			setAssigning(true);
			try {
				await assign(userId);
				setShowAssignDialog(false);
				await Promise.all([refetch(), refetchConversation()]);
				toast.success("Conversa atribuída");
			} catch (e) {
				console.error("Assign failed:", e);
				toast.error("Não foi possível atribuir a conversa");
			} finally {
				setAssigning(false);
			}
	};

	const handleTransfer = async (userId: string) => {
		if (!selectedId || assigning) return;
			setAssigning(true);
			try {
				await transfer(userId);
				setShowTransferDialog(false);
				await Promise.all([refetch(), refetchConversation()]);
				toast.success("Conversa transferida");
			} catch (e) {
				console.error("Transfer failed:", e);
				toast.error("Não foi possível transferir a conversa");
			} finally {
				setAssigning(false);
			}
	};

	const handleCreateConversation = async (contact: Contact) => {
		if (creatingConversationId) return;

		// Se o paciente não tiver o número cadastrado, abre um modal para cadastrar
		if (!contact.phone && contact.patientId) {
			setSelectedPatientForNumber(contact);
			setNewPhoneNumber("");
			setShowAddNumberDialog(true);
			return;
		}

		setCreatingConversationId(contact.id);
		try {
			let contactId = contact.id;

			// Se for um paciente sem registro de contato no WhatsApp (isPatientOnly), resolve primeiro
			if ((contact as any).isPatientOnly) {
				const resolved = await resolveContact({
					patientId: contact.patientId,
					phone: contact.phone,
					displayName: contact.name,
				});
				contactId = resolved.id;
			}

			const openedConversation = await findOrCreateConversation(contactId);
			const shouldRefetchManually = statusFilter === "all";
			setStatusFilter("all");
			setSelectedId(openedConversation.id);
			setShowNewConversationDialog(false);
			setContactSearch("");
			setContacts([]);
			if (shouldRefetchManually) {
				await refetch();
			}
		} catch (error) {
			console.error("Failed to open WhatsApp conversation:", error);
		} finally {
			setCreatingConversationId(null);
		}
	};

	const handleCreateWithNumber = async (
		phoneNumber: string,
		patientId?: string,
	) => {
		if (creatingConversationId) return;

		setCreatingConversationId("manual");
		try {
			const resolved = await resolveContact({
				phone: phoneNumber,
				patientId,
			});

			const openedConversation = await findOrCreateConversation(resolved.id);
			setStatusFilter("all");
			setSelectedId(openedConversation.id);
			setShowNewConversationDialog(false);
			setShowAttachToPatientDialog(false);
			setContactSearch("");
			setContacts([]);
			await refetch();
		} catch (error) {
			console.error("Failed to open WhatsApp conversation with number:", error);
		} finally {
			setCreatingConversationId(null);
		}
	};

		const filteredMembers = teamMembers.filter(
			(m) =>
				accentIncludes(getMemberName(m), memberSearch) ||
				accentIncludes(getMemberEmail(m), memberSearch),
		);

		const handlePriorityChange = async (
			priority: "low" | "medium" | "high" | "urgent",
		) => {
			if (!selectedId) return;
			try {
				await updatePriority(selectedId, priority);
				await Promise.all([refetch(), refetchConversation()]);
				toast.success("Prioridade atualizada");
			} catch {
				toast.error("Não foi possível atualizar a prioridade");
			}
		};

	const toggleBulkSelect = (id: string) => {
		setSelectedConvIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleBulkAction = async (action: "resolve" | "close") => {
		if (!selectedConvIds.size) return;
		setBulkAssigning(true);
		try {
			await bulkAction([...selectedConvIds], action);
			setSelectedConvIds(new Set());
			setBulkMode(false);
			await refetch();
		} finally {
			setBulkAssigning(false);
		}
	};

	const SNOOZE_OPTIONS = [
		{ label: "1 hora", hours: 1 },
		{ label: "4 horas", hours: 4 },
		{ label: "Amanhã (8h)", hours: 24 },
		{ label: "Próxima semana", hours: 168 },
	];

	const handleSnoozeOption = async (hours: number) => {
		if (!selectedId) return;
		const until = new Date(Date.now() + hours * 3600000).toISOString();
		try {
			await snoozeConversation(selectedId, until);
			setShowSnoozeDialog(false);
			await refetch();
		} catch {
			// ignore
		}
	};

	const handleSendConfirmation = async (
		phone: string,
		patientName: string,
		date: string,
		time: string,
	) => {
		const msg = `Olá ${patientName}! 👋\n\nLembramos que você tem uma consulta agendada:\n📅 ${date ? new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : date}\n⏰ ${time}\n\nPor favor, confirme sua presença respondendo SIM ou CONFIRMAR. Caso precise remarcar, entre em contato conosco. 🙏`;
		try {
			const resolved = await resolveContact({ phone });
			const conv = await findOrCreateConversation(resolved.id);
			await apiSendMessage(conv.id, msg);
		} catch {
			// ignore
		}
	};

	return (
		<MainLayout fullWidth noPadding>
			<div className="flex h-[calc(100vh-4rem)] bg-background">
				<div className="w-[340px] border-r flex flex-col shrink-0 bg-background/50 z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
					<div className="p-4 border-b bg-background">
						<div className="mb-3 flex items-center justify-between gap-2">
							<h2 className="text-xl font-bold flex items-center gap-2 min-w-0">
								<MessageCircle className="h-6 w-6 text-primary shrink-0" />
								<span className="truncate">Inbox</span>
							</h2>
							<div className="flex items-center gap-1.5 shrink-0">
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8 text-muted-foreground hover:text-foreground"
									title="Confirmar consultas"
									onClick={() => setShowConfirmationsModal(true)}
								>
									<CalendarCheck className="h-4 w-4" />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8 text-muted-foreground hover:text-foreground"
									title="Campanha"
									onClick={() => setShowBroadcastModal(true)}
								>
									<Megaphone className="h-4 w-4" />
								</Button>
								<Button
									variant={bulkMode ? "secondary" : "ghost"}
									size="icon"
									className="h-8 w-8"
									onClick={() => {
										setBulkMode((b) => !b);
										setSelectedConvIds(new Set());
									}}
									title={bulkMode ? "Cancelar seleção" : "Selecionar em lote"}
								>
									<ListChecks className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									className="h-8 rounded-full px-3 shadow-sm"
									onClick={() => setShowNewConversationDialog(true)}
								>
									<Plus className="h-4 w-4 mr-1" />
									Nova
								</Button>
							</div>
						</div>
						<div className="relative">
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar conversas, pacientes..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:border-primary/50 focus-visible:bg-background rounded-full text-sm pr-10"
							/>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className={`absolute right-1 top-0.5 h-8 w-8 rounded-full ${priorityFilter ? "text-primary" : "text-muted-foreground"}`}
										title="Filtrar por prioridade"
									>
										<Target className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-40">
									<DropdownMenuItem
										className="text-xs"
										onClick={() => setPriorityFilter(undefined)}
									>
										Todas as prioridades
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									{(["urgent", "high", "medium", "low"] as const).map((p) => (
										<DropdownMenuItem
											key={p}
											className={`text-xs ${PRIORITY_COLORS[p]}`}
											onClick={() => setPriorityFilter(p)}
										>
											{PRIORITY_LABELS[p]}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						{availableTags.length > 0 && (
							<div className="mt-2 flex items-center gap-1.5">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className={`h-7 text-xs gap-1 rounded-full px-2.5 ${tagFilter ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
										>
											<Tag className="h-3 w-3" />
											{tagFilter
												? (availableTags.find((t) => t.id === tagFilter)
														?.name ?? "Tag")
												: "Tag"}
											<ChevronDown className="h-3 w-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" className="w-44">
										<DropdownMenuItem
											className="text-xs"
											onClick={() => setTagFilter(undefined)}
										>
											Todas as tags
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										{availableTags.map((tag) => (
											<DropdownMenuItem
												key={tag.id}
												className="text-xs"
												onClick={() => setTagFilter(tag.id)}
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
							</div>
						)}
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

					<MetricsStrip metrics={metrics} />

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
										onClick={() => {
											if (bulkMode) {
												toggleBulkSelect(conv.id);
											} else {
												setSelectedId(conv.id);
											}
										}}
										bulkMode={bulkMode}
										isSelectedBulk={selectedConvIds.has(conv.id)}
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
					{bulkMode && selectedConvIds.size > 0 && (
						<div className="p-3 border-t bg-primary/5 flex items-center gap-2">
							<span className="text-xs font-medium flex-1">
								{selectedConvIds.size} selecionadas
							</span>
							{bulkAssigning && (
								<Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
							)}
							<Button
								size="sm"
								variant="outline"
								className="h-7 text-xs"
								onClick={() => handleBulkAction("resolve")}
								disabled={bulkAssigning}
							>
								<CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 text-xs text-destructive"
								onClick={() => handleBulkAction("close")}
								disabled={bulkAssigning}
							>
								<XCircle className="h-3 w-3 mr-1" /> Fechar
							</Button>
						</div>
					)}
				</div>

				<ChatPanel
						selectedId={selectedId}
						onAddNote={async (content) => {
							await addNote(content);
							await Promise.all([refetch(), refetchConversation()]);
						}}
					quickReplyText={quickReplyText}
					onQuickReplyUsed={() => setQuickReplyText(null)}
					onMessageSent={refetch}
					onConversationDeleted={async () => {
						setSelectedId(null);
						await refetch();
					}}
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
									try {
										await updateStatus("resolved");
										await Promise.all([refetch(), refetchConversation()]);
									} catch {
										toast.error("Não foi possível resolver a conversa");
									}
								}}
								onClose={async () => {
									try {
										await updateStatus("closed");
										await Promise.all([refetch(), refetchConversation()]);
									} catch {
										toast.error("Não foi possível fechar a conversa");
									}
								}}
								onAddTag={async (tagId) => {
									try {
										await addTags(conversation.id, [tagId]);
										await Promise.all([refetch(), refetchConversation()]);
										toast.success("Categoria adicionada");
									} catch {
										toast.error("Não foi possível adicionar a categoria");
									}
								}}
								onRemoveTag={async (tagId) => {
									try {
										await apiRemoveTag(conversation.id, tagId);
										await Promise.all([refetch(), refetchConversation()]);
										toast.success("Categoria removida");
									} catch {
										toast.error("Não foi possível remover a categoria");
									}
								}}
							onQuickReply={(content) => setQuickReplyText(content)}
							onPriorityChange={handlePriorityChange}
							onSnooze={() => setShowSnoozeDialog(true)}
						/>
					)}
				</div>
			</div>

			<Dialog
				open={showNewConversationDialog}
				onOpenChange={(open) => {
					setShowNewConversationDialog(open);
					if (!open) {
						setContactSearch("");
						setContacts([]);
					}
				}}
			>
				<DialogContent className="sm:max-w-[440px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<MessageSquare className="h-5 w-5 text-primary" />
							Nova conversa
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<Input
							placeholder="Buscar por nome ou telefone..."
							value={contactSearch}
							onChange={(e) => setContactSearch(e.target.value)}
							className="rounded-full bg-muted/50"
						/>
						<ScrollArea className="h-[320px] rounded-2xl border bg-muted/10 px-2 py-2">
							{contactsLoading ? (
								<div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
									<Loader2 className="h-5 w-5 animate-spin text-primary" />
									<span className="text-sm">Buscando contatos...</span>
								</div>
							) : contacts.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full text-center px-6 text-muted-foreground">
									<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
										<User className="h-5 w-5 opacity-60" />
									</div>
									<p className="text-sm font-medium text-foreground">
										Nenhum contato encontrado
									</p>
									{/^\d+$/.test(contactSearch.replace(/\D/g, "")) &&
									contactSearch.length >= 8 ? (
										<Button
											variant="outline"
											className="mt-4 rounded-full border-primary text-primary hover:bg-primary/5"
											onClick={() => {
												setManualPhoneNumber(contactSearch);
												setShowAttachToPatientDialog(true);
											}}
										>
											<MessageSquare className="h-4 w-4 mr-2" />
											Iniciar com {contactSearch}
										</Button>
									) : (
										<p className="text-xs mt-1">
											Tente buscar pelo nome ou número do WhatsApp.
										</p>
									)}
								</div>
							) : (
								<div className="space-y-1.5">
									{contacts.map((contact) => (
										<button
											key={contact.id}
											type="button"
											className="w-full flex items-center gap-3 rounded-xl border border-transparent bg-background px-3 py-3 text-left transition-colors hover:bg-muted/60 hover:border-border disabled:opacity-60"
											onClick={() => handleCreateConversation(contact)}
											disabled={creatingConversationId !== null}
										>
											<Avatar className="h-10 w-10 border">
												<AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
													{contact.name.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-foreground truncate">
													{contact.name}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{contact.phone || "Sem número cadastrado"}
												</p>
												{contact.patientName && (
													<p className="text-[11px] text-primary truncate mt-0.5">
														Paciente: {contact.patientName}
													</p>
												)}
												{(contact as any).isPatientOnly && (
													<span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mt-1">
														Novo contato
													</span>
												)}
											</div>
											{creatingConversationId === contact.id ? (
												<Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
											) : (
												<Plus className="h-4 w-4 text-muted-foreground shrink-0" />
											)}
										</button>
									))}
								</div>
							)}
						</ScrollArea>
						<p className="text-xs text-muted-foreground">
							Selecione um contato para abrir uma nova conversa ou retomar uma
							conversa já existente.
						</p>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Cancelar</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showAddNumberDialog} onOpenChange={setShowAddNumberDialog}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Adicionar Telefone</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<p className="text-sm text-muted-foreground">
							O paciente <strong>{selectedPatientForNumber?.name}</strong> não
							possui número cadastrado. Informe o número do WhatsApp:
						</p>
						<Input
							placeholder="Ex: 11999999999"
							value={newPhoneNumber}
							onChange={(e) => setNewPhoneNumber(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setShowAddNumberDialog(false)}
						>
							Cancelar
						</Button>
						<Button
							onClick={() => {
								if (selectedPatientForNumber) {
									handleCreateWithNumber(
										newPhoneNumber,
										selectedPatientForNumber.patientId,
									);
									setShowAddNumberDialog(false);
								}
							}}
							disabled={!newPhoneNumber || newPhoneNumber.length < 8}
						>
							Confirmar e Iniciar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={showAttachToPatientDialog}
				onOpenChange={setShowAttachToPatientDialog}
			>
				<DialogContent className="sm:max-w-[440px]">
					<DialogHeader>
						<DialogTitle>Nova conversa com {manualPhoneNumber}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<p className="text-sm text-muted-foreground">
							Deseja vincular este número a um paciente existente ou iniciar sem
							nome por enquanto?
						</p>
					</div>
					<DialogFooter className="flex-col sm:flex-row gap-2">
						<Button
							variant="outline"
							className="w-full sm:w-auto"
							onClick={() => handleCreateWithNumber(manualPhoneNumber)}
						>
							Manter sem nome
						</Button>
						<Button
							className="w-full sm:w-auto"
							onClick={() => {
								// Reabre a busca original para o usuário selecionar o paciente
								setShowAttachToPatientDialog(false);
								setShowNewConversationDialog(true);
								setContactSearch(manualPhoneNumber);
							}}
						>
							Vincular a Paciente
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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
							value={memberSearch}
							onChange={(e) => setMemberSearch(e.target.value)}
							className="rounded-full bg-muted/50"
						/>
						<ScrollArea className="h-[200px]">
							{filteredMembers.length === 0 ? (
								<div className="text-sm text-muted-foreground text-center py-6">
									Nenhum membro encontrado
								</div>
							) : (
									<div className="space-y-1">
										{filteredMembers.map((member) => {
											const memberName = getMemberName(member);
											const memberUserId = getMemberUserId(member);
											const wl = agentsWorkload.find(
												(w) => w.agentId === memberUserId,
											);
											return (
												<button
													key={member.id}
													type="button"
													className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors text-left"
													onClick={() => handleAssign(memberUserId)}
												>
													<Avatar className="h-8 w-8">
														<AvatarFallback className="text-xs">
															{memberName.slice(0, 2).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="flex-1">
														<p className="text-sm font-medium">
															{memberName}
														</p>
														<p className="text-xs text-muted-foreground">
															{member.role || getMemberEmail(member) || "Equipe"}
														</p>
													</div>
												{wl && (
													<div className="text-right shrink-0">
														<span
															className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
																wl.openConversations > 10
																	? "bg-red-50 text-red-600"
																	: wl.openConversations > 5
																		? "bg-orange-50 text-orange-600"
																		: "bg-green-50 text-green-600"
															}`}
														>
															{wl.openConversations} ativas
														</span>
													</div>
												)}
											</button>
										);
									})}
								</div>
							)}
						</ScrollArea>
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
							value={memberSearch}
							onChange={(e) => setMemberSearch(e.target.value)}
							className="rounded-full bg-muted/50"
						/>
						<ScrollArea className="h-[200px]">
							{filteredMembers.length === 0 ? (
								<div className="text-sm text-muted-foreground text-center py-6">
									Nenhum membro encontrado
								</div>
								) : (
									<div className="space-y-1">
										{filteredMembers.map((member) => {
											const memberName = getMemberName(member);
											const memberUserId = getMemberUserId(member);
											return (
												<button
													key={member.id}
													type="button"
													className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors text-left"
													onClick={() => handleTransfer(memberUserId)}
												>
													<Avatar className="h-8 w-8">
														<AvatarFallback className="text-xs">
															{memberName.slice(0, 2).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="flex-1">
														<p className="text-sm font-medium">
															{memberName}
														</p>
														<p className="text-xs text-muted-foreground">
															{member.role || getMemberEmail(member) || "Equipe"}
														</p>
													</div>
												</button>
											);
										})}
									</div>
								)}
						</ScrollArea>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Cancelar</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={showSnoozeDialog} onOpenChange={setShowSnoozeDialog}>
				<DialogContent className="sm:max-w-[340px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<AlarmClock className="h-5 w-5 text-primary" />
							Snooze da conversa
						</DialogTitle>
					</DialogHeader>
					<div className="py-3 space-y-2">
						<p className="text-sm text-muted-foreground">
							Selecione por quanto tempo adiar esta conversa:
						</p>
						{SNOOZE_OPTIONS.map((opt) => (
							<Button
								key={opt.hours}
								variant="outline"
								className="w-full justify-start text-sm"
								onClick={() => handleSnoozeOption(opt.hours)}
							>
								<AlarmClock className="h-4 w-4 mr-2 text-muted-foreground" />
								{opt.label}
							</Button>
						))}
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Cancelar</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<BroadcastModal
				open={showBroadcastModal}
				onClose={() => setShowBroadcastModal(false)}
			/>

			<ConfirmationsModal
				open={showConfirmationsModal}
				onClose={() => setShowConfirmationsModal(false)}
				onSendConfirmation={handleSendConfirmation}
			/>
		</MainLayout>
	);
}
