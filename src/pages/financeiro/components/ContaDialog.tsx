import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ContaFinanceira } from "@/hooks/useContasFinanceiras";

const CATEGORIAS = [
	"Consulta",
	"Pacote",
	"Aluguel",
	"Salário",
	"Material",
	"Equipamento",
	"Marketing",
	"Outros",
];

interface Props {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	editingConta: ContaFinanceira | null;
	formData:
		| {
				tipo: "receber" | "pagar";
				descricao: "";
				valor: "";
				data_vencimento: "";
				categoria: "";
				forma_pagamento: "";
				observacoes: "";
		  }
		| any;
	setFormData: (data: any) => void;
	handleSubmit: (e: React.FormEvent) => void;
	isPending: boolean;
}

export function ContaDialog({
	isOpen,
	onOpenChange,
	editingConta,
	formData,
	setFormData,
	handleSubmit,
	isPending,
}: Props) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-2xl">
				<DialogHeader>
					<DialogTitle className="text-xl font-black tracking-tighter">
						{editingConta ? "Editar Lançamento" : "Novo Lançamento"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
								Tipo
							</Label>
							<Select
								value={formData.tipo}
								onValueChange={(v) =>
									setFormData((prev: any) => ({
										...prev,
										tipo: v as "receber" | "pagar",
									}))
								}
							>
								<SelectTrigger className="rounded-xl h-11">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									<SelectItem value="receber">Entrada (A Receber)</SelectItem>
									<SelectItem value="pagar">Saída (A Pagar)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
								Valor (R$)
							</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.valor}
								onChange={(e) =>
									setFormData((prev: any) => ({
										...prev,
										valor: e.target.value,
									}))
								}
								className="rounded-xl h-11"
								required
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
							Descrição
						</Label>
						<Input
							value={formData.descricao}
							onChange={(e) =>
								setFormData((prev: any) => ({
									...prev,
									descricao: e.target.value,
								}))
							}
							className="rounded-xl h-11"
							placeholder="Ex: Aluguel da Sala"
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
								Vencimento
							</Label>
							<Input
								type="date"
								value={formData.data_vencimento}
								onChange={(e) =>
									setFormData((prev: any) => ({
										...prev,
										data_vencimento: e.target.value,
									}))
								}
								className="rounded-xl h-11"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
								Categoria
							</Label>
							<Select
								value={formData.categoria}
								onValueChange={(v) =>
									setFormData((prev: any) => ({ ...prev, categoria: v }))
								}
							>
								<SelectTrigger className="rounded-xl h-11">
									<SelectValue placeholder="Selecione" />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									{CATEGORIAS.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-2">
						<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
							Observações
						</Label>
						<Textarea
							value={formData.observacoes}
							onChange={(e) =>
								setFormData((prev: any) => ({
									...prev,
									observacoes: e.target.value,
								}))
							}
							className="rounded-xl min-h-[80px]"
						/>
					</div>
					<DialogFooter className="gap-2 pt-4">
						<Button
							variant="outline"
							type="button"
							onClick={() => onOpenChange(false)}
							className="rounded-xl h-11 font-bold text-xs uppercase tracking-wider border-slate-200"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={isPending}
							className="rounded-xl h-11 font-bold text-xs uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
						>
							{editingConta ? "Salvar Alterações" : "Confirmar Lançamento"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
