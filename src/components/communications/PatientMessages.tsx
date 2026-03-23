import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
	Mail,
	MessageSquare,
	Phone,
	Send,
	Search,
	CheckCircle,
	AlertCircle,
	RefreshCw,
	MoreVertical,
	Clock,
	Trash2,
	Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useActivePatients } from "@/hooks/usePatients";
import {
	useCommunications,
	useCommunicationStats,
	useSendCommunication,
	useDeleteCommunication,
	useResendCommunication,
	getStatusLabel,
	getTypeLabel,
} from "@/hooks/useCommunications";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PatientHelpers } from "@/types";
import {
	MessageTemplates,
	type MessageTemplate,
} from "@/components/communications/MessageTemplates";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const PatientMessages = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedChannel, setSelectedChannel] = useState<string>("all");
	const [deleteId, setDeleteId] = useState<string | null>(null);

	// Form state
	const [sendChannel, setSendChannel] = useState<"email" | "whatsapp" | "sms">(
		"email",
	);
	const [selectedPatient, setSelectedPatient] = useState<{
		id: string;
		name: string;
		email?: string | null;
		phone?: string | null;
	} | null>(null);
	const [patientSearch, setPatientSearch] = useState("");
	const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");

	const { data: patients = [] } = useActivePatients();
	const { data: communications = [], isLoading } = useCommunications({
		channel: selectedChannel,
	});
	const { data: stats } = useCommunicationStats();
	const sendCommunication = useSendCommunication();
	const deleteCommunication = useDeleteCommunication();
	const resendCommunication = useResendCommunication();

	const filteredPatients = useMemo(() => {
		if (!patientSearch) return patients.slice(0, 10);
		return patients
			.filter((p) =>
				(p.name || "").toLowerCase().includes(patientSearch.toLowerCase()),
			)
			.slice(0, 10);
	}, [patients, patientSearch]);

	const filteredCommunications = useMemo(() => {
		return communications.filter(
			(comm) =>
				!searchTerm ||
				comm.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(comm.recipient || "").toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [communications, searchTerm]);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "enviado":
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "entregue":
				return <CheckCircle className="w-4 h-4 text-blue-500" />;
			case "pendente":
				return <Clock className="w-4 h-4 text-yellow-500" />;
			case "falha":
				return <AlertCircle className="w-4 h-4 text-red-500" />;
			case "lido":
				return <CheckCircle className="w-4 h-4 text-primary" />;
			default:
				return <Clock className="w-4 h-4 text-muted-foreground" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "enviado":
				return "bg-green-500/10 text-green-700 dark:text-green-400";
			case "entregue":
				return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
			case "pendente":
				return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
			case "falha":
				return "bg-red-500/10 text-red-700 dark:text-red-400";
			case "lido":
				return "bg-primary/10 text-primary";
			default:
				return "bg-muted text-muted-foreground";
		}
	};

	const getChannelIcon = (type: string) => {
		switch (type) {
			case "email":
				return <Mail className="w-4 h-4" />;
			case "whatsapp":
				return <MessageSquare className="w-4 h-4" />;
			case "sms":
				return <Phone className="w-4 h-4" />;
			default:
				return <Mail className="w-4 h-4" />;
		}
	};

	const handleSendCommunication = async () => {
		if (!selectedPatient) return;

		const recipient =
			sendChannel === "email"
				? selectedPatient.email || ""
				: selectedPatient.phone || "";

		await sendCommunication.mutateAsync({
			type: sendChannel,
			patient_id: selectedPatient.id,
			recipient,
			subject: subject || undefined,
			body: message,
		});

		setSelectedPatient(null);
		setSubject("");
		setMessage("");
	};

	const handleDelete = async () => {
		if (deleteId) {
			await deleteCommunication.mutateAsync(deleteId);
			setDeleteId(null);
		}
	};

	return (
		<>
			<div className="space-y-4 sm:space-y-6 pb-20 md:pb-0">
				{/* Compact header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
							<MessageSquare className="h-4 w-4 text-primary" />
						</div>
						<div className="min-w-0">
							<h1 className="text-base sm:text-lg font-semibold leading-tight">
								Comunicações
							</h1>
							<div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
								<span>
									<span className="font-medium text-foreground">
										{stats?.total || 0}
									</span>{" "}
									total
								</span>
								<span className="text-border">·</span>
								<span>
									<span className="font-medium text-green-600">
										{stats?.sent || 0}
									</span>{" "}
									enviadas
								</span>
								<span className="text-border hidden sm:inline">·</span>
								<span className="hidden sm:inline">
									<span className="font-medium text-blue-600">
										{stats?.delivered || 0}
									</span>{" "}
									entregues
								</span>
								{(stats?.failed || 0) > 0 && (
									<>
										<span className="text-border">·</span>
										<span className="font-medium text-red-600">
											{stats?.failed}
										</span>{" "}
										falhas
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Filtros */}
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
						<Input
							placeholder="Buscar comunicações..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
						{["all", "email", "whatsapp", "sms"].map((channel) => (
							<Button
								key={channel}
								variant={selectedChannel === channel ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedChannel(channel)}
								className="whitespace-nowrap"
							>
								{channel === "all" && "Todos"}
								{channel === "email" && (
									<>
										<Mail className="w-4 h-4 mr-1" />
										Email
									</>
								)}
								{channel === "whatsapp" && (
									<>
										<MessageSquare className="w-4 h-4 mr-1" />
										WhatsApp
									</>
								)}
								{channel === "sms" && (
									<>
										<Phone className="w-4 h-4 mr-1" />
										SMS
									</>
								)}
							</Button>
						))}
					</div>
				</div>

				{/* Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
					{/* Lista */}
					<div className="lg:col-span-2">
						<Card>
							<CardHeader className="border-b">
								<CardTitle>Histórico de Comunicações</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								{isLoading ? (
									<div className="p-4 space-y-3">
										{[1, 2, 3, 4, 5].map((i) => (
											<Skeleton key={i} className="h-20 w-full" />
										))}
									</div>
								) : filteredCommunications.length === 0 ? (
									<div className="p-6">
										<EmptyState
											icon={MessageSquare}
											title="Nenhuma comunicação"
											description="Envie sua primeira mensagem aos pacientes."
										/>
									</div>
								) : (
									<div className="divide-y">
										{filteredCommunications.map((comm) => (
											<div
												key={comm.id}
												className="p-4 hover:bg-accent/50 transition-colors"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="flex items-start gap-3 flex-1 min-w-0">
														<div className="mt-1 p-2 rounded-lg bg-muted">
															{getChannelIcon(comm.type)}
														</div>
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 flex-wrap">
																<p className="font-medium truncate">
																	{comm.patient?.name || comm.recipient}
																</p>
																<Badge
																	className={cn(
																		"text-xs",
																		getStatusColor(comm.status),
																	)}
																>
																	{getStatusLabel(comm.status)}
																</Badge>
															</div>
															{comm.subject && (
																<p className="text-sm text-muted-foreground truncate mt-0.5">
																	{comm.subject}
																</p>
															)}
															<p className="text-sm text-muted-foreground line-clamp-1 mt-1">
																{comm.body}
															</p>
															<div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
																<span>{getTypeLabel(comm.type)}</span>
																<span>
																	{format(
																		new Date(comm.created_at),
																		"dd/MM/yyyy HH:mm",
																		{ locale: ptBR },
																	)}
																</span>
															</div>
														</div>
													</div>
													<div className="flex items-center gap-2">
														{getStatusIcon(comm.status)}
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																>
																	<MoreVertical className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																{comm.status === "falha" && (
																	<DropdownMenuItem
																		onClick={() =>
																			resendCommunication.mutate(comm.id)
																		}
																	>
																		<RefreshCw className="h-4 w-4 mr-2" />
																		Reenviar
																	</DropdownMenuItem>
																)}
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	className="text-destructive focus:text-destructive"
																	onClick={() => setDeleteId(comm.id)}
																>
																	<Trash2 className="h-4 w-4 mr-2" />
																	Excluir
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Painel de envio */}
					<div>
						<Card>
							<CardHeader className="border-b">
								<CardTitle>Enviar Comunicação</CardTitle>
							</CardHeader>
							<CardContent className="p-4 space-y-4">
								<div>
									<label className="text-sm font-medium mb-2 block">
										Canal
									</label>
									<div className="grid grid-cols-3 gap-2">
										{(["email", "whatsapp", "sms"] as const).map((channel) => (
											<Button
												key={channel}
												variant={
													sendChannel === channel ? "default" : "outline"
												}
												size="sm"
												className="flex-col p-3 h-auto"
												onClick={() => setSendChannel(channel)}
											>
												{channel === "email" && (
													<Mail className="w-4 h-4 mb-1" />
												)}
												{channel === "whatsapp" && (
													<MessageSquare className="w-4 h-4 mb-1" />
												)}
												{channel === "sms" && (
													<Phone className="w-4 h-4 mb-1" />
												)}
												<span className="text-xs capitalize">{channel}</span>
											</Button>
										))}
									</div>
								</div>

								<div>
									<label className="text-sm font-medium mb-2 block">
										Destinatário
									</label>
									<Popover
										open={patientPopoverOpen}
										onOpenChange={setPatientPopoverOpen}
									>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className="w-full justify-start font-normal"
											>
												{selectedPatient
													? selectedPatient.name
													: "Buscar paciente..."}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[300px] p-0" align="start">
											<Command>
												<CommandInput
													placeholder="Digite o nome..."
													value={patientSearch}
													onValueChange={setPatientSearch}
												/>
												<CommandList>
													<CommandEmpty>
														Nenhum paciente encontrado.
													</CommandEmpty>
													<CommandGroup>
														{filteredPatients.map((patient) => {
															const patientName =
																PatientHelpers.getName(patient);
															return (
																<CommandItem
																	key={patient.id}
																	value={patientName}
																	onSelect={() => {
																		setSelectedPatient({
																			id: patient.id,
																			name: patientName,
																			email: patient.email,
																			phone: patient.phone,
																		});
																		setPatientPopoverOpen(false);
																		setPatientSearch("");
																	}}
																>
																	{patientName}
																</CommandItem>
															);
														})}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								{sendChannel === "email" && (
									<div>
										<label className="text-sm font-medium mb-2 block">
											Assunto
										</label>
										<Input
											placeholder="Assunto da mensagem..."
											value={subject}
											onChange={(e) => setSubject(e.target.value)}
										/>
									</div>
								)}

								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="text-sm font-medium">Mensagem</label>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-7 text-xs gap-1"
												>
													<Sparkles className="w-3 h-3 text-primary" />
													Templates
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[400px] p-0" align="end">
												<div className="p-3 border-b bg-muted/50">
													<h4 className="font-semibold text-sm">
														Templates de Mensagem
													</h4>
													<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
														Selecione para preencher automaticamente
													</p>
												</div>
												<ScrollArea className="h-[350px] p-4">
													<MessageTemplates
														onSelectTemplate={(template) => {
															let body = template.body;
															if (selectedPatient) {
																body = body.replace(
																	/{nome}/g,
																	selectedPatient.name,
																);
															}
															setMessage(body);
															if (template.subject)
																setSubject(template.subject);
														}}
													/>
												</ScrollArea>
											</PopoverContent>
										</Popover>
									</div>
									<Textarea
										placeholder="Digite sua mensagem..."
										rows={4}
										className="resize-none"
										value={message}
										onChange={(e) => setMessage(e.target.value)}
									/>
									{selectedPatient && message.includes("{nome}") && (
										<p className="text-[10px] text-primary font-medium mt-1">
											Dica: O marcador {"{nome}"} será substituído por{" "}
											{selectedPatient.name}
										</p>
									)}
								</div>

								<Button
									className="w-full"
									onClick={handleSendCommunication}
									disabled={
										sendCommunication.isPending || !selectedPatient || !message
									}
								>
									{sendCommunication.isPending ? (
										"Enviando..."
									) : (
										<>
											<Send className="w-4 h-4 mr-2" />
											Enviar
										</>
									)}
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir Comunicação</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir esta comunicação? Esta ação não
							pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive hover:bg-destructive/90"
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
