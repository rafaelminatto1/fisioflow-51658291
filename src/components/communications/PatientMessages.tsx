import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
	Mail,
	MessageSquare as MessageSquareIcon,
	Phone,
	Send,
	Search,
	CheckCircle,
	RefreshCw,
	MoreVertical,
	Trash2,
	Sparkles,
	FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useActivePatients } from "@/hooks/patients/usePatients";
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
} from "@/components/communications/MessageTemplates";
import { useSuggestReply } from "@/hooks/ai";
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
	const [selectedPatients, setSelectedPatients] = useState<
		Array<{
			id: string;
			name: string;
			email?: string | null;
			phone?: string | null;
		}>
	>([]);
	const [patientSearch, setPatientSearch] = useState("");
	const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [isBulkMode, setIsBulkMode] = useState(false);

	const { data: patients = [] } = useActivePatients();
	const { data: communications = [], isLoading } = useCommunications({
		channel: selectedChannel,
	});
	const { data: stats } = useCommunicationStats();
	const sendCommunication = useSendCommunication();
	const deleteCommunication = useDeleteCommunication();
	const resendCommunication = useResendCommunication();
	const suggestReply = useSuggestReply();

	const filteredPatients = useMemo(() => {
		const search = patientSearch.toLowerCase();
		return patients
			.filter((p) => (p.name || "").toLowerCase().includes(search))
			.slice(0, 20);
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

	const togglePatientSelection = (patient: any) => {
		const patientName = PatientHelpers.getName(patient);
		const patientData = {
			id: patient.id,
			name: patientName,
			email: patient.email,
			phone: patient.phone,
		};

		if (isBulkMode) {
			setSelectedPatients((prev) => {
				const isSelected = prev.some((p) => p.id === patient.id);
				if (isSelected) {
					return prev.filter((p) => p.id !== patient.id);
				}
				return [...prev, patientData];
			});
		} else {
			setSelectedPatients([patientData]);
			setPatientPopoverOpen(false);
		}
	};

	const handleSendCommunication = async () => {
		if (selectedPatients.length === 0) return;

		const data: any = {
			type: sendChannel,
			subject: subject || undefined,
			body: message,
		};

		if (isBulkMode) {
			data.patient_ids = selectedPatients.map((p) => p.id);
			data.recipients = selectedPatients.map((p) =>
				sendChannel === "email" ? p.email || "" : p.phone || "",
			);
		} else {
			const p = selectedPatients[0];
			data.patient_id = p.id;
			data.recipient = sendChannel === "email" ? p.email || "" : p.phone || "";
		}

		await sendCommunication.mutateAsync(data);

		setSelectedPatients([]);
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
							<MessageSquareIcon className="h-4 w-4 text-primary" />
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
					<div className="flex items-center gap-2">
						<label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 cursor-pointer bg-muted/50 px-3 py-2 rounded-xl border border-border/40 transition-all hover:bg-muted">
							<input
								type="checkbox"
								className="rounded border-border/40 text-primary focus:ring-primary/20"
								checked={isBulkMode}
								onChange={(e) => {
									setIsBulkMode(e.target.checked);
									if (!e.target.checked && selectedPatients.length > 1) {
										setSelectedPatients(selectedPatients.slice(0, 1));
									}
								}}
							/>
							Envio em Massa
						</label>
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
							className="pl-10 h-11 rounded-2xl border-border/40 shadow-premium-sm"
						/>
					</div>
					<div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
						{["all", "email", "whatsapp", "sms"].map((channel) => (
							<Button
								key={channel}
								variant={selectedChannel === channel ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedChannel(channel)}
								className="whitespace-nowrap h-11 px-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest"
							>
								{channel === "all" && "Todos"}
								{channel === "email" && (
									<>
										<Mail className="w-4 h-4 mr-2" />
										Email
									</>
								)}
								{channel === "whatsapp" && (
									<>
										<MessageSquareIcon className="w-4 h-4 mr-2" />
										WhatsApp
									</>
								)}
								{channel === "sms" && (
									<>
										<Phone className="w-4 h-4 mr-2" />
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
						<Card className="rounded-3xl border-border/40 shadow-premium-sm overflow-hidden h-full">
							<CardHeader className="border-b bg-muted/10">
								<CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
									Histórico de Comunicações
								</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								{isLoading ? (
									<div className="p-4 space-y-3">
										{[1, 2, 3, 4, 5].map((i) => (
											<Skeleton key={i} className="h-20 w-full rounded-2xl" />
										))}
									</div>
								) : filteredCommunications.length === 0 ? (
									<div className="p-12">
										<EmptyState
											icon={MessageSquareIcon}
											title="Nenhuma comunicação"
											description="Envie sua primeira mensagem aos pacientes."
										/>
									</div>
								) : (
									<ScrollArea className="h-[600px]">
										<div className="divide-y divide-border/40">
											{filteredCommunications.map((comm) => (
												<div
													key={comm.id}
													className="p-4 hover:bg-accent/30 transition-all group"
												>
													<div className="flex items-start justify-between gap-3">
														<div className="flex items-start gap-4 flex-1 min-w-0">
															<div className="mt-1 p-2.5 rounded-xl bg-background border border-border/40 shadow-sm group-hover:scale-110 transition-transform">
																{getChannelIcon(comm.type)}
															</div>
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 flex-wrap mb-1">
																	<p className="font-bold text-sm truncate tracking-tight">
																		{comm.patient?.name || comm.recipient}
																	</p>
																	<Badge
																		className={cn(
																			"text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
																			getStatusColor(comm.status),
																		)}
																	>
																		{getStatusLabel(comm.status)}
																	</Badge>
																</div>
																{comm.subject && (
																	<p className="text-xs font-bold text-foreground/80 truncate">
																		{comm.subject}
																	</p>
																)}
																<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
																	{comm.body}
																</p>
																<div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
																	<span className="flex items-center gap-1">
																		<div className="w-1 h-1 rounded-full bg-border" />
																		{getTypeLabel(comm.type)}
																	</span>
																	<span className="flex items-center gap-1">
																		<div className="w-1 h-1 rounded-full bg-border" />
																		{format(
																			new Date(comm.created_at),
																			"dd MMM yyyy · HH:mm",
																			{ locale: ptBR },
																		)}
																	</span>
																</div>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<div className="opacity-0 group-hover:opacity-100 transition-opacity">
																{getStatusIcon(comm.status)}
															</div>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 rounded-full"
																	>
																		<MoreVertical className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent
																	align="end"
																	className="rounded-2xl border-border/40 shadow-premium-lg"
																>
																	{comm.status === "falha" && (
																		<DropdownMenuItem
																			className="rounded-xl font-bold text-xs"
																			onClick={() =>
																				resendCommunication.mutate(comm.id)
																			}
																		>
																			<RefreshCw className="h-3.5 w-3.5 mr-2" />
																			Reenviar
																		</DropdownMenuItem>
																	)}
																	<DropdownMenuSeparator />
																	<DropdownMenuItem
																		className="text-destructive focus:text-destructive rounded-xl font-bold text-xs"
																		onClick={() => setDeleteId(comm.id)}
																	>
																		<Trash2 className="h-3.5 w-3.5 mr-2" />
																		Excluir Registro
																	</DropdownMenuItem>
																</DropdownMenuContent>
															</DropdownMenu>
														</div>
													</div>
												</div>
											))}
										</div>
									</ScrollArea>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Painel de envio */}
					<div className="h-full">
						<Card className="rounded-3xl border-border/40 shadow-premium-sm sticky top-6">
							<CardHeader className="border-b bg-muted/10">
								<CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
									Enviar Comunicação
								</CardTitle>
							</CardHeader>
							<CardContent className="p-5 space-y-5">
								<div>
									<label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
										Canal de Envio
									</label>
									<div className="grid grid-cols-3 gap-2">
										{(["email", "whatsapp", "sms"] as const).map((channel) => (
											<Button
												key={channel}
												variant={
													sendChannel === channel ? "default" : "outline"
												}
												size="sm"
												className={cn(
													"flex-col p-3 h-auto rounded-2xl transition-all",
													sendChannel === channel
														? "shadow-md scale-105"
														: "hover:bg-accent/50",
												)}
												onClick={() => setSendChannel(channel)}
											>
												{channel === "email" && (
													<Mail className="w-4 h-4 mb-1.5" />
												)}
												{channel === "whatsapp" && (
													<MessageSquareIcon className="w-4 h-4 mb-1.5" />
												)}
												{channel === "sms" && (
													<Phone className="w-4 h-4 mb-1.5" />
												)}
												<span className="text-[9px] font-black uppercase tracking-widest">
													{channel}
												</span>
											</Button>
										))}
									</div>
								</div>

								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
											{isBulkMode
												? `Destinatários (${selectedPatients.length})`
												: "Destinatário"}
										</label>
										{selectedPatients.length > 0 && (
											<Button
												variant="ghost"
												size="sm"
												className="h-6 text-[9px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 px-2 rounded-lg"
												onClick={() => setSelectedPatients([])}
											>
												Limpar
											</Button>
										)}
									</div>
									<Popover
										open={patientPopoverOpen}
										onOpenChange={setPatientPopoverOpen}
									>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className="w-full justify-start font-bold text-xs h-11 rounded-2xl border-border/40 shadow-inner bg-background/50"
											>
												{selectedPatients.length > 0
													? isBulkMode
														? `${selectedPatients.length} pacientes selecionados`
														: selectedPatients[0].name
													: "Clique para buscar..."}
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[320px] p-0 rounded-2xl border-border/40 shadow-premium-lg"
											align="start"
										>
											<Command className="rounded-2xl">
												<CommandInput
													placeholder="Nome do paciente..."
													value={patientSearch}
													onValueChange={setPatientSearch}
													className="h-11 border-0 focus:ring-0"
												/>
												<CommandList className="max-h-[300px]">
													<CommandEmpty className="p-4 text-center text-xs font-bold text-muted-foreground uppercase">
														Nenhum paciente encontrado.
													</CommandEmpty>
													<CommandGroup>
														{filteredPatients.map((patient) => {
															const patientName =
																PatientHelpers.getName(patient);
															const isSelected = selectedPatients.some(
																(p) => p.id === patient.id,
															);
															return (
																<CommandItem
																	key={patient.id}
																	value={patientName}
																	onSelect={() =>
																		togglePatientSelection(patient)
																	}
																	className="rounded-xl mx-1 my-0.5 cursor-pointer"
																>
																	<div className="flex items-center justify-between w-full">
																		<span
																			className={cn(
																				"text-xs font-bold transition-colors",
																				isSelected
																					? "text-primary"
																					: "text-foreground",
																			)}
																		>
																			{patientName}
																		</span>
																		{isSelected && (
																			<CheckCircle className="h-3.5 w-3.5 text-primary animate-in zoom-in-50 duration-200" />
																		)}
																	</div>
																</CommandItem>
															);
														})}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									{isBulkMode && selectedPatients.length > 0 && (
										<div className="flex flex-wrap gap-1.5 mt-3">
											{selectedPatients.map((p) => (
												<Badge
													key={p.id}
													variant="secondary"
													className="text-[9px] font-black uppercase tracking-tighter rounded-lg pl-2 pr-1 py-0.5 bg-primary/5 text-primary/80 border-primary/10"
												>
													{p.name}
													<button
														onClick={(e) => {
															e.stopPropagation();
															setSelectedPatients((prev) =>
																prev.filter((x) => x.id !== p.id),
															);
														}}
														className="ml-1.5 hover:text-destructive transition-colors"
													>
														<Trash2 className="h-2.5 w-2.5" />
													</button>
												</Badge>
											))}
										</div>
									)}
								</div>

								{sendChannel === "email" && (
									<div>
										<label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
											Assunto
										</label>
										<Input
											placeholder="Ex: Confirmação de Agendamento..."
											value={subject}
											onChange={(e) => setSubject(e.target.value)}
											className="h-11 rounded-2xl border-border/40 focus:ring-primary/20 font-bold text-xs"
										/>
									</div>
								)}

								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
											Corpo da Mensagem
										</label>
										<div className="flex gap-1.5">
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-xl hover:bg-primary/5 text-primary transition-all border border-primary/10"
												onClick={async () => {
													if (selectedPatients.length === 0) {
														toast.error("Selecione um paciente primeiro");
														return;
													}
													const suggestion = await suggestReply.mutateAsync({
														patientName: selectedPatients[0].name,
														context:
															"Acompanhamento clínico e engajamento no tratamento.",
													});
													setMessage(suggestion);
												}}
												disabled={
													suggestReply.isPending ||
													selectedPatients.length === 0
												}
											>
												{suggestReply.isPending ? (
													<RefreshCw className="w-3.5 h-3.5 animate-spin" />
												) : (
													<Sparkles className="w-3.5 h-3.5" />
												)}
												IA Sugerir
											</Button>
											<Popover>
												<PopoverTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														className="h-7 text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-xl hover:bg-primary/5 text-primary transition-all"
													>
														<FileText className="w-3.5 h-3.5" />
														Templates
													</Button>
												</PopoverTrigger>
												<PopoverContent
													className="w-[400px] p-0 rounded-3xl border-border/40 shadow-premium-lg"
													align="end"
												>
													<div className="p-4 border-b bg-muted/20">
														<h4 className="font-black text-xs uppercase tracking-[0.1em]">
															Templates Inteligentes
														</h4>
														<p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
															Escolha um padrão para agilizar o envio
														</p>
													</div>
													<ScrollArea className="h-[400px] p-4">
														<MessageTemplates
															onSelectTemplate={(template) => {
																let body = template.body;
																if (selectedPatients.length > 0) {
																	const firstPatient = selectedPatients[0];
																	body = body.replace(
																		/{nome}/g,
																		firstPatient.name,
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
									</div>
									<Textarea
										placeholder="Escreva sua mensagem aqui. Use {nome} para personalizar..."
										rows={6}
										className="resize-none rounded-2xl border-border/40 focus:ring-primary/20 text-xs font-medium leading-relaxed"
										value={message}
										onChange={(e) => setMessage(e.target.value)}
									/>
									{selectedPatients.length > 0 &&
										message.includes("{nome}") && (
											<p className="text-[10px] font-bold text-primary/80 flex items-center gap-1.5 bg-primary/5 p-2 rounded-xl border border-primary/10">
												<Sparkles className="h-3 w-3" />O marcador {"{nome}"}{" "}
												será personalizado automaticamente.
											</p>
										)}
								</div>

								<Button
									className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-[0.15em] shadow-premium-md hover:scale-[1.02] active:scale-95 transition-all"
									onClick={handleSendCommunication}
									disabled={
										sendCommunication.isPending ||
										selectedPatients.length === 0 ||
										!message
									}
								>
									{sendCommunication.isPending ? (
										<RefreshCw className="h-4 w-4 animate-spin" />
									) : (
										<>
											<Send className="w-4 h-4 mr-2" />
											{isBulkMode
												? `Enviar para ${selectedPatients.length}`
												: "Enviar Mensagem"}
										</>
									)}
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent className="rounded-3xl border-border/40">
					<AlertDialogHeader>
						<AlertDialogTitle className="font-black text-lg tracking-tight">
							Excluir Comunicação?
						</AlertDialogTitle>
						<AlertDialogDescription className="font-medium text-xs uppercase tracking-widest text-muted-foreground/60 leading-relaxed">
							Esta ação removerá o registro histórico. O paciente não será
							afetado, mas você não verá mais esta mensagem aqui.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mt-4">
						<AlertDialogCancel className="rounded-2xl font-bold uppercase text-[10px] tracking-widest">
							Manter
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest border-0"
						>
							Sim, Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
