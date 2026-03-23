import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	useConversations,
	useConversationMessages,
	useSendMessage,
	useMarkAsRead,
} from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { ApiConversation } from "@/api/v2/messaging";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search, Check, CheckCheck, Plus, User, MessageSquare as MessageSquareIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TeamSelector } from "./TeamSelector";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export const InternalChat = () => {
	const { user } = useAuth();
	const [selectedParticipantId, setSelectedParticipantId] = useState<
		string | null
	>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [messageText, setMessageText] = useState("");
	const [newChatPopoverOpen, setNewChatPopoverOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const { data: conversations = [], isLoading: isLoadingConversations } =
		useConversations();
	const { data: messages = [], isLoading: isLoadingMessages } =
		useConversationMessages(selectedParticipantId);
	const sendMessage = useSendMessage();
	const markAsRead = useMarkAsRead();

	const filteredConversations = conversations.filter((c) =>
		c.participantName.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	useEffect(() => {
		if (selectedParticipantId) {
			markAsRead.mutate(selectedParticipantId);
		}
	}, [selectedParticipantId, messages]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSend = async () => {
		if (!messageText.trim() || !selectedParticipantId) return;

		await sendMessage.mutateAsync({
			participantId: selectedParticipantId,
			content: messageText.trim(),
		});
		setMessageText("");
	};

	const handleSelectFromTeam = (userId: string, name: string) => {
		setSelectedParticipantId(userId);
		setNewChatPopoverOpen(false);
	};

	const selectedConversation = conversations.find(
		(c) => c.participantId === selectedParticipantId,
	);

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)] min-h-[600px]">
			{/* Left Panel: Conversation List */}
			<Card className="flex flex-col overflow-hidden col-span-1 border-r md:border-r-0 rounded-r-none md:rounded-r-xl bg-background/50 backdrop-blur-sm">
				<div className="p-4 border-b space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
							Conversas
						</h3>
						<Popover
							open={newChatPopoverOpen}
							onOpenChange={setNewChatPopoverOpen}
						>
							<PopoverTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[300px] p-0" align="start">
								<TeamSelector
									onSelect={handleSelectFromTeam}
									excludeIds={user?.uid ? [user.uid] : []}
								/>
							</PopoverContent>
						</Popover>
					</div>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
						<Input
							placeholder="Buscar colega..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-9 h-10 rounded-2xl border-border/40 focus:ring-primary/20"
						/>
					</div>
				</div>
				<ScrollArea className="flex-1">
					{isLoadingConversations ? (
						<div className="p-4 space-y-4">
							{[1, 2, 3].map((i) => (
								<div key={i} className="flex items-center gap-3">
									<Skeleton className="w-10 h-10 rounded-full" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-[150px]" />
										<Skeleton className="h-3 w-[100px]" />
									</div>
								</div>
							))}
						</div>
					) : filteredConversations.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
							<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
								<User className="w-6 h-6 text-muted-foreground/40" />
							</div>
							<div className="space-y-1">
								<p className="text-sm font-bold">Nenhuma conversa</p>
								<p className="text-xs text-muted-foreground">
									Inicie um papo com sua equipe.
								</p>
							</div>
							<Button
								size="sm"
								variant="outline"
								className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
								onClick={() => setNewChatPopoverOpen(true)}
							>
								Novo Chat
							</Button>
						</div>
					) : (
						<div className="flex flex-col p-2 gap-1">
							{filteredConversations.map((conv) => (
								<button
									key={conv.id}
									onClick={() => setSelectedParticipantId(conv.participantId)}
									className={cn(
										"flex items-center gap-3 p-3 text-left transition-all rounded-2xl",
										selectedParticipantId === conv.participantId
											? "bg-primary text-primary-foreground shadow-md"
											: "hover:bg-accent",
									)}
								>
									<Avatar className="h-10 w-10 ring-2 ring-background">
										<AvatarFallback
											className={cn(
												"text-xs font-bold",
												selectedParticipantId === conv.participantId
													? "bg-primary-foreground text-primary"
													: "bg-primary/10 text-primary",
											)}
										>
											{conv.participantName.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<div className="flex justify-between items-baseline mb-0.5">
											<span className="font-bold truncate text-sm">
												{conv.participantName}
											</span>
											<span
												className={cn(
													"text-[10px] whitespace-nowrap opacity-70",
													selectedParticipantId === conv.participantId
														? "text-primary-foreground"
														: "text-muted-foreground",
												)}
											>
												{format(new Date(conv.lastMessageAt), "HH:mm")}
											</span>
										</div>
										<div className="flex justify-between items-center gap-2">
											<span
												className={cn(
													"text-xs truncate",
													selectedParticipantId === conv.participantId
														? "text-primary-foreground/90"
														: "text-muted-foreground",
												)}
											>
												{conv.lastMessage || "Nova conversa"}
											</span>
											{conv.unreadCount > 0 &&
												selectedParticipantId !== conv.participantId && (
													<span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-background animate-pulse">
														{conv.unreadCount}
													</span>
												)}
										</div>
									</div>
								</button>
							))}
						</div>
					)}
				</ScrollArea>
			</Card>

			{/* Right Panel: Active Chat */}
			<Card className="flex flex-col overflow-hidden col-span-1 md:col-span-2 rounded-l-none md:rounded-l-xl border-l-0 shadow-premium-sm bg-white/80 dark:bg-slate-950/50 backdrop-blur-md">
				{selectedParticipantId ? (
					<>
						{/* Chat Header */}
						<div className="p-4 border-b flex items-center justify-between bg-card/30 backdrop-blur-sm sticky top-0 z-10">
							<div className="flex items-center gap-3">
								<Avatar className="h-10 w-10 ring-2 ring-primary/10">
									<AvatarFallback className="bg-primary/10 text-primary font-bold">
										{selectedConversation?.participantName
											.charAt(0)
											.toUpperCase() || "?"}
									</AvatarFallback>
								</Avatar>
								<div>
									<h3 className="font-bold text-sm tracking-tight">
										{selectedConversation?.participantName || "Usuário"}
									</h3>
									<div className="flex items-center gap-1.5">
										<div className="w-1.5 h-1.5 rounded-full bg-green-500" />
										<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
											Equipe Interna
										</p>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								{/* Placeholder for actions like Video Call, Files, etc */}
							</div>
						</div>

						{/* Chat Messages */}
						<div
							className="flex-1 p-6 overflow-y-auto space-y-6"
							ref={scrollRef}
						>
							{isLoadingMessages ? (
								<div className="space-y-6">
									<Skeleton className="h-12 w-[60%] rounded-2xl rounded-tl-none" />
									<Skeleton className="h-12 w-[70%] rounded-2xl rounded-tr-none ml-auto" />
									<Skeleton className="h-10 w-[50%] rounded-2xl rounded-tl-none" />
								</div>
							) : messages.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center space-y-4">
									<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center opacity-40">
										<Send className="w-8 h-8" />
									</div>
									<div className="space-y-1">
										<p className="text-sm font-bold">Sem mensagens ainda</p>
										<p className="text-xs text-muted-foreground">
											Envie uma mensagem para iniciar a conversa.
										</p>
									</div>
								</div>
							) : (
								<div className="space-y-6">
									{messages.map((msg, idx) => {
										const isOwn = msg.senderId === user?.uid;
										const prevMsg = idx > 0 ? messages[idx - 1] : null;
										const isSameSender = prevMsg?.senderId === msg.senderId;

										return (
											<div
												key={msg.id}
												className={cn(
													"flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-300",
													isOwn ? "items-end" : "items-start",
													isSameSender ? "-mt-4" : "mt-2",
												)}
											>
												<div
													className={cn(
														"max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md",
														isOwn
															? "bg-primary text-primary-foreground rounded-tr-none"
															: "bg-white dark:bg-slate-800 text-foreground border border-border/40 rounded-tl-none",
													)}
												>
													<p className="text-sm leading-relaxed whitespace-pre-wrap">
														{msg.content}
													</p>
													<div
														className={cn(
															"flex items-center gap-1.5 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity",
															isOwn
																? "text-primary-foreground/80"
																: "text-muted-foreground",
														)}
													>
														<span className="text-[9px] font-bold">
															{format(new Date(msg.createdAt), "HH:mm")}
														</span>
														{isOwn &&
															(msg.readAt ? (
																<CheckCheck className="w-3 h-3" />
															) : (
																<Check className="w-3 h-3" />
															))}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						{/* Chat Input */}
						<div className="p-4 border-t bg-card/20 backdrop-blur-md">
							<div className="flex gap-3 bg-background/50 p-2 rounded-2xl border border-border/40 shadow-inner focus-within:border-primary/50 transition-all">
								<Input
									placeholder="Digite sua mensagem..."
									value={messageText}
									onChange={(e) => setMessageText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSend();
										}
									}}
									className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none h-10"
								/>
								<Button
									onClick={handleSend}
									disabled={!messageText.trim() || sendMessage.isPending}
									className="rounded-xl h-10 w-10 p-0 shadow-premium-sm hover:scale-[1.05] active:scale-95 transition-all"
								>
									<Send className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-muted-foreground p-12">
						<div className="text-center max-w-xs space-y-4">
							<div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto shadow-inner rotate-3 transition-transform hover:rotate-0 duration-500">
								<MessageSquareIcon className="w-10 h-10 text-primary/40" />
							</div>
							<div className="space-y-2">
								<p className="text-lg font-black tracking-tight text-foreground uppercase">
									Seu Hub Interno
								</p>
								<p className="text-xs font-medium leading-relaxed uppercase tracking-widest opacity-60">
									Selecione um colega de equipe para alinhar tratamentos,
									agendamentos ou trocar informações clínicas.
								</p>
							</div>
							<Button
								variant="outline"
								className="mt-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] px-8 border-border/60"
								onClick={() => setNewChatPopoverOpen(true)}
							>
								Nova Conversa
							</Button>
						</div>
					</div>
				)}
			</Card>
		</div>
	);
};
