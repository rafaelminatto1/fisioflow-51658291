import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Calendar as CalendarIcon,
	CreditCard,
	DollarSign,
	Plus,
	Edit2,
	Trash2,
	X,
	Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { parseResponseDate } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import { useFinancial, Transaction } from "@/hooks/useFinancial";
import { toast } from "sonner";

interface PatientFinancialTabProps {
	patientId: string;
	appointments: any[];
}

type TransactionFormData = {
	descricao: string;
	valor: string;
	tipo: "receita" | "despesa";
	status: "pago" | "pendente" | "cancelado";
	data: string;
	categoria: string;
	forma_pagamento: string;
	observacoes: string;
};

const initialFormData: TransactionFormData = {
	descricao: "",
	valor: "",
	tipo: "receita",
	status: "pendente",
	data: new Date().toISOString().split("T")[0],
	categoria: "sessao",
	forma_pagamento: "dinheiro",
	observacoes: "",
};

const categoryLabels: Record<string, string> = {
	sessao: "Sessão",
	pacote: "Pacote de Sessões",
	produto: "Produto",
	servico: "Serviço",
	exame: "Exame",
	laudo: "Laudo",
	outro: "Outro",
};

const paymentMethodLabels: Record<string, string> = {
	dinheiro: "Dinheiro",
	pix: "PIX",
	credito: "Cartão de Crédito",
	debito: "Cartão de Débito",
	transferencia: "Transferência",
	boleto: "Boleto",
	convenio: "Convênio",
};

export function PatientFinancialTab({
	patientId,
	appointments,
}: PatientFinancialTabProps) {
	const {
		transactions: allTransactions,
		createTransaction,
		updateTransaction,
		deleteTransaction,
		loading,
	} = useFinancial();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTransaction, setEditingTransaction] =
		useState<Transaction | null>(null);
	const [formData, setFormData] =
		useState<TransactionFormData>(initialFormData);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const patientTransactions = useMemo(() => {
		const apptIds = new Set(appointments.map((a) => a.id));
		const fromAppointments = appointments.map((tx) => ({
			id: tx.id,
			descricao: `Sessão ${format(parseResponseDate(tx.appointment_date), "dd/MM/yyyy")}`,
			valor: tx.payment_amount || 0,
			tipo: "receita" as const,
			status:
				tx.payment_status === "paid_single" ||
				tx.payment_status === "paid_package"
					? ("pago" as const)
					: ("pendente" as const),
			created_at: tx.appointment_date,
			forma_pagamento: tx.payment_method || "",
			observacoes: tx.type || "",
		}));

		const fromFinancial = allTransactions.filter(
			(t: Transaction) => (t as any).patient_id === patientId,
		);

		return [...fromAppointments, ...fromFinancial].sort(
			(a, b) =>
				new Date(b.created_at || 0).getTime() -
				new Date(a.created_at || 0).getTime(),
		);
	}, [allTransactions, appointments, patientId]);

	const totalPaid = useMemo(
		() =>
			patientTransactions
				.filter((t) => t.status === "pago")
				.reduce((sum, t) => sum + Number(t.valor || 0), 0),
		[patientTransactions],
	);

	const totalPending = useMemo(
		() =>
			patientTransactions
				.filter((t) => t.status === "pendente")
				.reduce((sum, t) => sum + Number(t.valor || 0), 0),
		[patientTransactions],
	);

	const openCreateDialog = () => {
		setEditingTransaction(null);
		setFormData(initialFormData);
		setDialogOpen(true);
	};

	const openEditDialog = (transaction: Transaction) => {
		setEditingTransaction(transaction);
		setFormData({
			descricao: transaction.descricao || "",
			valor: String(transaction.valor || ""),
			tipo: transaction.tipo || "receita",
			status: transaction.status || "pendente",
			data: transaction.data || new Date().toISOString().split("T")[0],
			categoria: transaction.categoria || "sessao",
			forma_pagamento: transaction.forma_pagamento || "dinheiro",
			observacoes: transaction.observacoes || "",
		});
		setDialogOpen(true);
	};

	const handleSubmit = async () => {
		if (!formData.descricao || !formData.valor) {
			toast.error("Preencha a descrição e o valor");
			return;
		}

		setIsSubmitting(true);
		try {
			const data = {
				descricao: formData.descricao,
				valor: parseFloat(formData.valor),
				tipo: formData.tipo,
				status: formData.status,
				data: formData.data,
				categoria: formData.categoria,
				forma_pagamento: formData.forma_pagamento,
				observacoes: formData.observacoes,
				patient_id: patientId,
			};

			if (editingTransaction) {
				await updateTransaction({ id: editingTransaction.id, ...data });
			} else {
				await createTransaction(data);
			}

			setDialogOpen(false);
			setFormData(initialFormData);
			setEditingTransaction(null);
		} catch (error) {
			toast.error("Erro ao salvar transação");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (confirm("Tem certeza que deseja excluir esta transação?")) {
			try {
				await deleteTransaction(id);
			} catch {
				toast.error("Erro ao excluir transação");
			}
		}
	};

	const handleStatusChange = async (
		transaction: Transaction,
		newStatus: string,
	) => {
		try {
			await updateTransaction({ id: transaction.id, status: newStatus as any });
		} catch {
			toast.error("Erro ao atualizar status");
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Button onClick={openCreateDialog} className="gap-2">
					<Plus className="h-4 w-4" />
					Novo Lançamento
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="bg-white border-emerald-100 shadow-sm rounded-xl overflow-hidden">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
							<DollarSign className="h-6 w-6 text-emerald-600" />
						</div>
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
								Total Pago
							</span>
							<p className="text-2xl font-bold text-slate-900">
								R$ {totalPaid.toFixed(2)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white border-amber-100 shadow-sm rounded-xl overflow-hidden">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
							<CreditCard className="h-6 w-6 text-amber-600" />
						</div>
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
								Pendente
							</span>
							<p className="text-2xl font-bold text-slate-900">
								R$ {totalPending.toFixed(2)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white border-blue-100 shadow-sm rounded-xl overflow-hidden">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
							<CalendarIcon className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
								Saldo
							</span>
							<p className="text-2xl font-bold text-slate-900">
								R$ {(totalPaid - totalPending).toFixed(2)}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="bg-white border-blue-100 shadow-sm rounded-xl">
				<CardHeader className="pb-3 border-b border-blue-50">
					<CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
						<DollarSign className="w-4 h-4 text-blue-600" />
						Histórico de Lançamentos
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-4">
					{loading ? (
						<div className="text-center py-8 text-muted-foreground">
							Carregando...
						</div>
					) : patientTransactions.length === 0 ? (
						<div className="text-center py-8">
							<CreditCard className="h-10 w-10 mx-auto mb-3 text-slate-200" />
							<p className="text-sm font-medium text-slate-500">
								Nenhum lançamento registrado
							</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-4"
								onClick={openCreateDialog}
							>
								<Plus className="h-4 w-4 mr-2" />
								Adicionar primeiro lançamento
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{patientTransactions.map((tx) => (
								<div
									key={tx.id}
									className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/10 transition-colors group"
								>
									<div className="flex items-center gap-4">
										<div
											className={cn(
												"h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
												tx.status === "pago"
													? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
													: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
											)}
										>
											{tx.tipo === "despesa" ? (
												<CreditCard className="h-5 w-5 rotate-180" />
											) : (
												<DollarSign className="h-5 w-5" />
											)}
										</div>
										<div>
											<p className="font-semibold text-sm text-slate-800">
												{tx.descricao}
											</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												{tx.forma_pagamento
													? paymentMethodLabels[tx.forma_pagamento] ||
														tx.forma_pagamento
													: "Pendente"}
												{tx.categoria &&
													` • ${categoryLabels[tx.categoria] || tx.categoria}`}
											</p>
											{tx.created_at && (
												<p className="text-xs text-slate-400 mt-0.5">
													{format(
														new Date(tx.created_at),
														"dd 'de' MMM, yyyy",
														{ locale: ptBR },
													)}
												</p>
											)}
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<p className="font-bold text-slate-900">
												R$ {Number(tx.valor || 0).toFixed(2)}
											</p>
											<div className="flex items-center gap-1 mt-1">
												{tx.status !== "cancelado" && (
													<Select
														value={tx.status}
														onValueChange={(value) =>
															handleStatusChange(tx, value)
														}
													>
														<SelectTrigger className="h-6 text-[10px] px-2 py-0">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="pago">Pago</SelectItem>
															<SelectItem value="pendente">Pendente</SelectItem>
															<SelectItem value="cancelado">
																Cancelado
															</SelectItem>
														</SelectContent>
													</Select>
												)}
											</div>
										</div>
										<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0"
												onClick={() => openEditDialog(tx)}
											>
												<Edit2 className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
												onClick={() => handleDelete(tx.id)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Descrição</Label>
							<Input
								value={formData.descricao}
								onChange={(e) =>
									setFormData({ ...formData, descricao: e.target.value })
								}
								placeholder="Ex: Sessão de fisioterapia"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Valor (R$)</Label>
								<Input
									type="number"
									step="0.01"
									value={formData.valor}
									onChange={(e) =>
										setFormData({ ...formData, valor: e.target.value })
									}
									placeholder="0,00"
								/>
							</div>
							<div>
								<Label>Data</Label>
								<Input
									type="date"
									value={formData.data}
									onChange={(e) =>
										setFormData({ ...formData, data: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Tipo</Label>
								<Select
									value={formData.tipo}
									onValueChange={(value) =>
										setFormData({ ...formData, tipo: value as any })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="receita">Receita</SelectItem>
										<SelectItem value="despesa">Despesa</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Status</Label>
								<Select
									value={formData.status}
									onValueChange={(value) =>
										setFormData({ ...formData, status: value as any })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pago">Pago</SelectItem>
										<SelectItem value="pendente">Pendente</SelectItem>
										<SelectItem value="cancelado">Cancelado</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Categoria</Label>
								<Select
									value={formData.categoria}
									onValueChange={(value) =>
										setFormData({ ...formData, categoria: value })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(categoryLabels).map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Forma Pagamento</Label>
								<Select
									value={formData.forma_pagamento}
									onValueChange={(value) =>
										setFormData({ ...formData, forma_pagamento: value })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(paymentMethodLabels).map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div>
							<Label>Observações</Label>
							<Input
								value={formData.observacoes}
								onChange={(e) =>
									setFormData({ ...formData, observacoes: e.target.value })
								}
								placeholder="Observações adicionais..."
							/>
						</div>
						<div className="flex gap-2 justify-end pt-4">
							<Button variant="outline" onClick={() => setDialogOpen(false)}>
								Cancelar
							</Button>
							<Button onClick={handleSubmit} disabled={isSubmitting}>
								{isSubmitting
									? "Salvando..."
									: editingTransaction
										? "Atualizar"
										: "Criar"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
