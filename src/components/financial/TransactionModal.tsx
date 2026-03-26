import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/useFinancial";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	DollarSign,
	Save,
	Loader2,
	ArrowUpCircle,
	ArrowDownCircle,
	Clock,
	CheckCircle2,
	XCircle,
} from "lucide-react";

const transactionSchema = z.object({
	tipo: z.enum(["receita", "despesa", "pagamento", "recebimento"]),
	descricao: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
	valor: z.number().positive("Valor deve ser positivo"),
	status: z.enum(["pendente", "concluido", "cancelado"]).default("pendente"),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (
		data: Omit<Transaction, "id" | "created_at" | "updated_at">,
	) => void;
	transaction?: Transaction;
	isLoading?: boolean;
}

export function TransactionModal({
	open,
	onOpenChange,
	onSubmit,
	transaction,
	isLoading,
}: TransactionModalProps) {
	const isMobile = useIsMobile();
	const form = useForm<TransactionFormData>({
		resolver: zodResolver(transactionSchema),
		defaultValues: {
			tipo: (transaction?.tipo ?? "receita") as TransactionFormData["tipo"],
			descricao: transaction?.descricao || "",
			valor: transaction?.valor ? Number(transaction.valor) : undefined,
			status: (transaction?.status ??
				"pendente") as TransactionFormData["status"],
			metadata: transaction?.metadata || undefined,
		},
	});

	const handleSubmit = (data: TransactionFormData) => {
		onSubmit(data as Omit<Transaction, "id" | "created_at" | "updated_at">);
		if (!transaction) {
			form.reset();
		}
		onOpenChange(false);
	};

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-lg"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<CustomModalTitle className="flex items-center gap-2">
					<DollarSign className="h-5 w-5 text-primary" />
					{transaction ? "Editar Transação" : "Nova Transação Financeira"}
				</CustomModalTitle>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<div className="px-6 py-4">
					<Form {...form}>
						<form
							id="transaction-form"
							onSubmit={form.handleSubmit(handleSubmit)}
							className="space-y-5"
						>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="tipo"
									render={({ field }) => (
										<FormItem>
											<FormLabel
												className="font-bold text-xs"
												htmlFor="transaction-tipo"
											>
												Tipo de Lançamento
											</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
												name="tipo"
											>
												<FormControl>
													<SelectTrigger
														id="transaction-tipo"
														className="rounded-xl border-slate-200"
													>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="receita">
														<div className="flex items-center gap-2">
															<ArrowUpCircle className="h-4 w-4 text-emerald-500" />
															Receita
														</div>
													</SelectItem>
													<SelectItem value="despesa">
														<div className="flex items-center gap-2">
															<ArrowDownCircle className="h-4 w-4 text-rose-500" />
															Despesa
														</div>
													</SelectItem>
													<SelectItem value="pagamento">Pagamento</SelectItem>
													<SelectItem value="recebimento">
														Recebimento
													</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage className="text-[10px]" />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="status"
									render={({ field }) => (
										<FormItem>
											<FormLabel
												className="font-bold text-xs"
												htmlFor="transaction-status"
											>
												Status Atual
											</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
												name="status"
											>
												<FormControl>
													<SelectTrigger
														id="transaction-status"
														className="rounded-xl border-slate-200"
													>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="pendente">
														<div className="flex items-center gap-2">
															<Clock className="h-4 w-4 text-amber-500" />
															Pendente
														</div>
													</SelectItem>
													<SelectItem value="concluido">
														<div className="flex items-center gap-2">
															<CheckCircle2 className="h-4 w-4 text-emerald-500" />
															Concluído
														</div>
													</SelectItem>
													<SelectItem value="cancelado">
														<div className="flex items-center gap-2">
															<XCircle className="h-4 w-4 text-slate-400" />
															Cancelado
														</div>
													</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage className="text-[10px]" />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="valor"
								render={({ field }) => (
									<FormItem>
										<FormLabel
											className="font-bold text-xs"
											htmlFor="transaction-valor"
										>
											Valor (R$)*
										</FormLabel>
										<FormControl>
											<div className="relative">
												<span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">
													R$
												</span>
												<Input
													id="transaction-valor"
													name="valor"
													type="number"
													step="0.01"
													placeholder="0,00"
													className="pl-9 rounded-xl border-slate-200 h-11 text-lg font-bold"
													{...field}
													onChange={(e) =>
														field.onChange(parseFloat(e.target.value))
													}
													value={field.value || ""}
												/>
											</div>
										</FormControl>
										<FormMessage className="text-[10px]" />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="descricao"
								render={({ field }) => (
									<FormItem>
										<FormLabel
											className="font-bold text-xs"
											htmlFor="transaction-descricao"
										>
											Descrição / Identificação*
										</FormLabel>
										<FormControl>
											<Textarea
												id="transaction-descricao"
												name="descricao"
												{...field}
												placeholder="Ex: Aluguel da sala, Compra de materiais..."
												rows={3}
												className="rounded-xl border-slate-200 resize-none"
											/>
										</FormControl>
										<FormMessage className="text-[10px]" />
									</FormItem>
								)}
							/>
						</form>
					</Form>
				</div>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					type="button"
					variant="ghost"
					className="rounded-xl h-11 px-6 font-bold text-slate-500"
					onClick={() => onOpenChange(false)}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					form="transaction-form"
					disabled={isLoading}
					className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider"
				>
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Save className="h-4 w-4" />
					)}
					{transaction ? "Atualizar Transação" : "Salvar Lançamento"}
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
}
