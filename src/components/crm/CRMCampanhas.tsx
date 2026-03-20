import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Plus,
	Mail,
	MessageSquare,
	Smartphone,
	Send,
	Pause,
	Play,
	Trash2,
	Users,
	BarChart3,
	Loader2,
	Megaphone,
} from "lucide-react";
import {
	useCRMCampanhas,
	useCreateCampanha,
	useUpdateCampanha,
	useDeleteCampanha,
	CRMCampanha,
} from "@/hooks/useCRM";
import { useLeads } from "@/hooks/useLeads";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const TIPOS_CAMPANHA = [
	{
		value: "whatsapp",
		label: "WhatsApp",
		icon: MessageSquare,
		color: "bg-emerald-500",
	},
	{ value: "email", label: "Email", icon: Mail, color: "bg-blue-500" },
	{ value: "sms", label: "SMS", icon: Smartphone, color: "bg-purple-500" },
];

const STATUS_CAMPANHA = {
	rascunho: { label: "Rascunho", color: "bg-slate-500" },
	agendada: { label: "Agendada", color: "bg-amber-500" },
	enviando: { label: "Enviando", color: "bg-blue-500" },
	concluida: { label: "Concluída", color: "bg-emerald-500" },
	pausada: { label: "Pausada", color: "bg-rose-500" },
};

const ESTAGIOS = [
	{ value: "aguardando", label: "Aguardando" },
	{ value: "em_contato", label: "Em Contato" },
	{ value: "avaliacao_agendada", label: "Avaliação Agendada" },
	{ value: "avaliacao_realizada", label: "Avaliação Realizada" },
	{ value: "efetivado", label: "Efetivado" },
	{ value: "nao_efetivado", label: "Não Efetivado" },
];

type TipoCampanha = "whatsapp" | "email" | "sms";

interface FormDataCampanha {
	nome: string;
	descricao: string;
	tipo: TipoCampanha;
	assunto: string;
	conteudo: string;
	filtro_estagios: string[];
}

export function CRMCampanhas() {
	const isMobile = useIsMobile();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [formData, setFormData] = useState<FormDataCampanha>({
		nome: "",
		descricao: "",
		tipo: "whatsapp",
		assunto: "",
		conteudo: "",
		filtro_estagios: [],
	});

	const { data: campanhas = [] } = useCRMCampanhas();
	const { data: leads = [] } = useLeads();
	const createMutation = useCreateCampanha();
	const updateMutation = useUpdateCampanha();
	const deleteMutation = useDeleteCampanha();

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();

		// Calculate recipients
		const destinatarios = leads.filter((lead) => {
			if (formData.filtro_estagios.length === 0) return true;
			return formData.filtro_estagios.includes(lead.estagio);
		});

		await createMutation.mutateAsync({
			...formData,
			total_destinatarios: destinatarios.length,
			status: "rascunho",
		});

		setIsDialogOpen(false);
		resetForm();
	};

	const resetForm = () => {
		setFormData({
			nome: "",
			descricao: "",
			tipo: "whatsapp",
			assunto: "",
			conteudo: "",
			filtro_estagios: [],
		});
	};

	const handleEnviar = async (campanha: CRMCampanha) => {
		// Simulate sending - in production this would trigger an edge function
		await updateMutation.mutateAsync({ id: campanha.id, status: "enviando" });
		toast.success(
			"Campanha iniciada! Os envios serão processados em segundo plano.",
		);

		// Simulate completion after delay
		setTimeout(async () => {
			await updateMutation.mutateAsync({
				id: campanha.id,
				status: "concluida",
				total_enviados: campanha.total_destinatarios,
			});
		}, 3000);
	};

	const getTipoInfo = (tipo: string) =>
		TIPOS_CAMPANHA.find((t) => t.value === tipo) || TIPOS_CAMPANHA[0];

	const toggleEstagio = (estagio: string) => {
		setFormData((prev) => ({
			...prev,
			filtro_estagios: prev.filtro_estagios.includes(estagio)
				? prev.filtro_estagios.filter((e) => e !== estagio)
				: [...prev.filtro_estagios, estagio],
		}));
	};

	const countDestinatarios = () => {
		return leads.filter((lead) => {
			if (formData.filtro_estagios.length === 0) return true;
			return formData.filtro_estagios.includes(lead.estagio);
		}).length;
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-2">
						<Megaphone className="h-6 w-6 text-primary" />
						Campanhas de Marketing
					</h2>
					<p className="text-muted-foreground text-sm">
						Envie mensagens em massa para seus leads
					</p>
				</div>
				<Button
					onClick={() => setIsDialogOpen(true)}
					className="rounded-xl gap-2 shadow-lg"
				>
					<Plus className="h-4 w-4" />
					Nova Campanha
				</Button>
			</div>

			{/* Lista de Campanhas */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{campanhas.length === 0 ? (
					<Card className="col-span-full p-12 border-dashed border-2">
						<div className="text-center text-muted-foreground">
							<div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed">
								<Send className="h-8 w-8 text-slate-300" />
							</div>
							<p className="font-semibold text-slate-600">
								Nenhuma campanha criada
							</p>
							<p className="text-sm mt-1">
								Engaje seus leads com envios em massa via WhatsApp ou Email.
							</p>
							<Button
								variant="outline"
								onClick={() => setIsDialogOpen(true)}
								className="mt-6 rounded-xl"
							>
								Criar minha primeira campanha
							</Button>
						</div>
					</Card>
				) : (
					campanhas.map((campanha) => {
						const tipoInfo = getTipoInfo(campanha.tipo);
						const statusInfo =
							STATUS_CAMPANHA[campanha.status as keyof typeof STATUS_CAMPANHA];
						const TipoIcon = tipoInfo.icon;

						return (
							<Card
								key={campanha.id}
								className="hover:shadow-md transition-all border-slate-200 overflow-hidden"
							>
								<div className={cn("h-1", tipoInfo.color)} />
								<CardContent className="p-5">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div className={cn("p-2 rounded-lg", tipoInfo.color)}>
												<TipoIcon className="h-4 w-4 text-white" />
											</div>
											<div>
												<h3 className="font-bold text-slate-800 line-clamp-1">
													{campanha.nome}
												</h3>
												<div className="flex items-center gap-2 mt-1">
													<Badge
														className={cn("text-[10px] h-4", statusInfo.color)}
													>
														{statusInfo.label}
													</Badge>
													<span className="text-[10px] text-slate-400">
														{format(
															new Date(campanha.created_at),
															"dd MMM yyyy",
															{ locale: ptBR },
														)}
													</span>
												</div>
											</div>
										</div>

										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													className="h-8 w-8 text-slate-400 hover:text-destructive"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent className="rounded-2xl">
												<AlertDialogHeader>
													<AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
													<AlertDialogDescription>
														Esta ação removerá todos os dados de métricas desta
														campanha e não poderá ser desfeita.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel className="rounded-xl">
														Cancelar
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => deleteMutation.mutate(campanha.id)}
														className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
													>
														Excluir
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>

									{campanha.descricao && (
										<p className="text-xs text-slate-500 mt-3 line-clamp-2">
											{campanha.descricao}
										</p>
									)}

									<div className="grid grid-cols-2 gap-2 mt-4">
										<div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
											<p className="text-[10px] text-slate-400 font-bold uppercase">
												Destinatários
											</p>
											<div className="flex items-center gap-1 mt-1">
												<Users className="h-3 w-3 text-slate-400" />
												<span className="text-sm font-bold text-slate-700">
													{campanha.total_destinatarios}
												</span>
											</div>
										</div>
										<div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
											<p className="text-[10px] text-slate-400 font-bold uppercase">
												Enviados
											</p>
											<div className="flex items-center gap-1 mt-1">
												<BarChart3 className="h-3 w-3 text-slate-400" />
												<span className="text-sm font-bold text-slate-700">
													{campanha.total_enviados || 0}
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2 mt-4">
										{campanha.status === "rascunho" && (
											<Button
												size="sm"
												className="w-full rounded-lg gap-2 bg-slate-900"
												onClick={() => handleEnviar(campanha)}
											>
												<Play className="h-3.5 w-3.5" />
												Iniciar Disparo
											</Button>
										)}
										{campanha.status === "enviando" && (
											<Button
												size="sm"
												variant="outline"
												className="w-full rounded-lg gap-2 border-rose-200 text-rose-600"
												onClick={() =>
													updateMutation.mutate({
														id: campanha.id,
														status: "pausada",
													})
												}
											>
												<Pause className="h-3.5 w-3.5" />
												Pausar Envios
											</Button>
										)}
										{campanha.status === "pausada" && (
											<Button
												size="sm"
												variant="outline"
												className="w-full rounded-lg gap-2"
												onClick={() => handleEnviar(campanha)}
											>
												<Play className="h-3.5 w-3.5" />
												Retomar
											</Button>
										)}
										{campanha.status === "concluida" && (
											<Button
												size="sm"
												variant="ghost"
												className="w-full rounded-lg gap-2 text-emerald-600 bg-emerald-50 cursor-default hover:bg-emerald-50"
											>
												<BadgeCheck className="h-3.5 w-3.5" />
												Campanha Finalizada
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			{/* Dialog Nova Campanha */}
			<CustomModal
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				isMobile={isMobile}
				contentClassName="max-w-2xl"
			>
				<CustomModalHeader onClose={() => setIsDialogOpen(false)}>
					<CustomModalTitle className="flex items-center gap-2">
						<Plus className="h-5 w-5 text-primary" />
						Nova Campanha de Marketing
					</CustomModalTitle>
				</CustomModalHeader>

				<CustomModalBody className="p-0 sm:p-0">
					<div className="px-6 py-4 space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="font-semibold">Nome da Campanha *</Label>
								<Input
									value={formData.nome}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, nome: e.target.value }))
									}
									placeholder="Ex: Promoção de Verão"
									required
									className="rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label className="font-semibold text-xs text-muted-foreground">
									Canal de Comunicação
								</Label>
								<Select
									value={formData.tipo}
									onValueChange={(v) =>
										setFormData((prev) => ({
											...prev,
											tipo: v as TipoCampanha,
										}))
									}
								>
									<SelectTrigger className="rounded-xl">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TIPOS_CAMPANHA.map((t) => {
											const Icon = t.icon;
											return (
												<SelectItem key={t.value} value={t.value}>
													<span className="flex items-center gap-2">
														<Icon className="h-4 w-4" />
														{t.label}
													</span>
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="font-semibold text-xs">Descrição Interna</Label>
							<Input
								value={formData.descricao}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										descricao: e.target.value,
									}))
								}
								placeholder="Breve descrição para controle interno"
								className="rounded-xl"
							/>
						</div>

						{formData.tipo === "email" && (
							<div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
								<Label className="font-semibold">Assunto do Email</Label>
								<Input
									value={formData.assunto}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											assunto: e.target.value,
										}))
									}
									placeholder="O título que o destinatário verá"
									className="rounded-xl"
								/>
							</div>
						)}

						<div className="space-y-2">
							<Label className="font-semibold">Conteúdo da Mensagem *</Label>
							<Textarea
								value={formData.conteudo}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, conteudo: e.target.value }))
								}
								placeholder="Use {nome} para personalizar com o nome do lead..."
								rows={4}
								required
								className="rounded-xl resize-none"
							/>
							<div className="flex flex-wrap gap-2 mt-1">
								<p className="text-[10px] text-slate-400 font-bold uppercase">
									Variáveis:{" "}
								</p>
								<code className="text-[10px] bg-slate-100 px-1 rounded">
									{"{nome}"}
								</code>
								<code className="text-[10px] bg-slate-100 px-1 rounded">
									{"{telefone}"}
								</code>
								<code className="text-[10px] bg-slate-100 px-1 rounded">
									{"{email}"}
								</code>
							</div>
						</div>

						<div className="space-y-3 pt-2">
							<Label className="font-semibold">Público-alvo (Filtros)</Label>
							<div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
								{ESTAGIOS.map((estagio) => (
									<Badge
										key={estagio.value}
										variant={
											formData.filtro_estagios.includes(estagio.value)
												? "default"
												: "outline"
										}
										className={cn(
											"cursor-pointer hover:bg-slate-200 transition-colors rounded-lg h-7",
											formData.filtro_estagios.includes(estagio.value)
												? "bg-slate-900"
												: "bg-white",
										)}
										onClick={() => toggleEstagio(estagio.value)}
									>
										{estagio.label}
									</Badge>
								))}
							</div>
							<p className="text-[10px] text-slate-400 italic">
								{formData.filtro_estagios.length === 0
									? "Nenhum filtro selecionado: todos os leads ativos receberão."
									: `${formData.filtro_estagios.length} categorias de leads selecionadas.`}
							</p>
						</div>

						<div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-white rounded-lg shadow-sm">
									<Users className="h-5 w-5 text-primary" />
								</div>
								<div>
									<span className="text-lg font-bold text-slate-800">
										{countDestinatarios()}
									</span>
									<p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
										Destinatários Estimados
									</p>
								</div>
							</div>
							<Send className="h-5 w-5 text-primary/20" />
						</div>
					</div>
				</CustomModalBody>

				<CustomModalFooter isMobile={isMobile}>
					<Button
						variant="ghost"
						type="button"
						onClick={() => setIsDialogOpen(false)}
						className="rounded-xl"
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={() => handleSubmit()}
						disabled={
							createMutation.isPending || !formData.nome || !formData.conteudo
						}
						className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-lg"
					>
						{createMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						Criar Campanha
					</Button>
				</CustomModalFooter>
			</CustomModal>
		</div>
	);
}
