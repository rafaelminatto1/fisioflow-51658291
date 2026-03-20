import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Clock } from "lucide-react";
import {
	useServicos,
	useCreateServico,
	useUpdateServico,
	useDeleteServico,
	Servico,
	ServicoFormData,
} from "@/hooks/useServicos";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

const tipoCobrancaLabels = {
	unitario: "Unitário",
	mensal: "Mensal",
	pacote: "Pacote",
};

const defaultColors = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#84cc16",
	"#f97316",
	"#6366f1",
];

export function ServicosContent() {
	const [searchQuery, setSearchQuery] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingServico, setEditingServico] = useState<Servico | null>(null);
	const [selectedColor, setSelectedColor] = useState("#3b82f6");

	const { data: servicos, isLoading } = useServicos();
	const createServico = useCreateServico();
	const updateServico = useUpdateServico();
	const deleteServico = useDeleteServico();

	const { register, handleSubmit, reset, setValue, watch } =
		useForm<ServicoFormData>({
			defaultValues: {
				nome: "",
				descricao: "",
				valor: 0,
				duracao_minutos: 60,
				tipo_cobranca: "unitario",
				cor: "#3b82f6",
				ativo: true,
			},
		});

	const onSubmit = async (data: ServicoFormData) => {
		try {
			if (editingServico) {
				await updateServico.mutateAsync({ id: editingServico.id, ...data });
			} else {
				await createServico.mutateAsync(data);
			}
			setIsModalOpen(false);
			reset();
			setEditingServico(null);
		} catch (error) {
			console.error("Erro ao salvar serviço:", error);
		}
	};

	const handleEdit = (servico: Servico) => {
		setEditingServico(servico);
		setSelectedColor(servico.cor || "#3b82f6");
		reset({
			nome: servico.nome,
			descricao: servico.descricao || "",
			valor: Number(servico.valor),
			duracao_minutos: servico.duracao_minutos,
			tipo_cobranca: servico.tipo_cobranca,
			cor: servico.cor || "#3b82f6",
			ativo: servico.ativo,
		});
		setIsModalOpen(true);
	};

	const filteredServicos = servicos?.filter(
		(s) =>
			s.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.descricao?.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Serviços e Procedimentos
					</h2>
					<p className="text-muted-foreground">
						Gerencie o catálogo de serviços oferecidos pela clínica
					</p>
				</div>
				<Button
					onClick={() => {
						setEditingServico(null);
						reset();
						setIsModalOpen(true);
					}}
				>
					<Plus className="h-4 w-4 mr-2" />
					Novo Serviço
				</Button>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Buscar serviços..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Serviço</TableHead>
								<TableHead>Cobrança</TableHead>
								<TableHead>Duração</TableHead>
								<TableHead>Valor</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-10">
										Carregando...
									</TableCell>
								</TableRow>
							) : filteredServicos?.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="text-center py-10 text-muted-foreground"
									>
										Nenhum serviço encontrado
									</TableCell>
								</TableRow>
							) : (
								filteredServicos?.map((servico) => (
									<TableRow key={servico.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<div
													className="w-3 h-3 rounded-full"
													style={{ backgroundColor: servico.cor || "#3b82f6" }}
												/>
												<div>
													<p className="font-medium">{servico.nome}</p>
													<p className="text-xs text-muted-foreground line-clamp-1">
														{servico.descricao}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{
													tipoCobrancaLabels[
														servico.tipo_cobranca as keyof typeof tipoCobrancaLabels
													]
												}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground">
											<Clock className="h-3 w-3 inline mr-1" />{" "}
											{servico.duracao_minutos} min
										</TableCell>
										<TableCell className="font-medium">
											R${" "}
											{Number(servico.valor).toLocaleString("pt-BR", {
												minimumFractionDigits: 2,
											})}
										</TableCell>
										<TableCell>
											<Badge variant={servico.ativo ? "default" : "secondary"}>
												{servico.ativo ? "Ativo" : "Inativo"}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEdit(servico)}
												>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive"
													onClick={() => deleteServico.mutate(servico.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingServico ? "Editar Serviço" : "Novo Serviço"}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="nome">Nome do Serviço</Label>
							<Input
								id="nome"
								{...register("nome", { required: true })}
								placeholder="Ex: Fisioterapia Ortopédica"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="descricao">Descrição</Label>
							<Textarea
								id="descricao"
								{...register("descricao")}
								placeholder="Breve descrição do procedimento..."
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="valor">Valor (R$)</Label>
								<Input
									id="valor"
									type="number"
									step="0.01"
									{...register("valor", { required: true })}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="duracao">Duração (min)</Label>
								<Input
									id="duracao"
									type="number"
									{...register("duracao_minutos", { required: true })}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>Tipo de Cobrança</Label>
								<Select
									defaultValue={watch("tipo_cobranca")}
									onValueChange={(v) => setValue("tipo_cobranca", v as any)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="unitario">Unitário</SelectItem>
										<SelectItem value="mensal">Mensal</SelectItem>
										<SelectItem value="pacote">Pacote</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label>Cor de Identificação</Label>
								<div className="flex flex-wrap gap-2">
									{defaultColors.map((color) => (
										<button
											key={color}
											type="button"
											className={cn(
												"w-6 h-6 rounded-full border-2 transition-all",
												selectedColor === color
													? "border-primary scale-110 shadow-sm"
													: "border-transparent",
											)}
											style={{ backgroundColor: color }}
											onClick={() => {
												setSelectedColor(color);
												setValue("cor", color);
											}}
										/>
									))}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Switch
								id="ativo"
								checked={watch("ativo")}
								onCheckedChange={(v) => setValue("ativo", v)}
							/>
							<Label htmlFor="ativo">Serviço Ativo</Label>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsModalOpen(false)}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={createServico.isPending || updateServico.isPending}
							>
								{editingServico ? "Salvar Alterações" : "Criar Serviço"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function ServicosPage() {
	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto">
				<ServicosContent />
			</div>
		</MainLayout>
	);
}
