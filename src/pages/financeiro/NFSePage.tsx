/**
 * NFSe Page Content - Refactored for Hub Integration
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	FileText,
	Plus,
	Download,
	Eye,
	Printer,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { financialApi, type NFSeRecord } from "@/api/v2";
import { MainLayout } from "@/components/layout/MainLayout";

export interface NFSe extends NFSeRecord {
	destinatario: {
		nome: string;
		cnpj_cpf: string;
		endereco?: string;
	};
	prestador: {
		nome: string;
		cnpj: string;
		inscricao_municipal?: string;
	};
	servico: {
		descricao: string;
		codigo_cnae: string;
		codigo_tributario: string;
		aliquota: number;
		valor_iss: number;
	};
}

function normalizeNFSe(row: NFSeRecord): NFSe {
	return {
		...row,
		destinatario: {
			nome: String(
				(row.destinatario as Record<string, unknown> | undefined)?.nome ?? "",
			),
			cnpj_cpf: String(
				(row.destinatario as Record<string, unknown> | undefined)?.cnpj_cpf ??
					"",
			),
			endereco:
				((row.destinatario as Record<string, unknown> | undefined)?.endereco as
					| string
					| undefined) ?? undefined,
		},
		prestador: {
			nome: String(
				(row.prestador as Record<string, unknown> | undefined)?.nome ?? "",
			),
			cnpj: String(
				(row.prestador as Record<string, unknown> | undefined)?.cnpj ?? "",
			),
			inscricao_municipal:
				((row.prestador as Record<string, unknown> | undefined)
					?.inscricao_municipal as string | undefined) ?? undefined,
		},
		servico: {
			descricao: String(
				(row.servico as Record<string, unknown> | undefined)?.descricao ?? "",
			),
			codigo_cnae: String(
				(row.servico as Record<string, unknown> | undefined)?.codigo_cnae ?? "",
			),
			codigo_tributario: String(
				(row.servico as Record<string, unknown> | undefined)
					?.codigo_tributario ?? "",
			),
			aliquota: Number(
				(row.servico as Record<string, unknown> | undefined)?.aliquota ?? 0,
			),
			valor_iss: Number(
				(row.servico as Record<string, unknown> | undefined)?.valor_iss ?? 0,
			),
		},
	};
}

export function NFSePreview({
	nfse,
	onEdit: _onEdit,
}: {
	nfse: NFSe;
	onEdit?: () => void;
}) {
	return (
		<div className="border rounded-2xl p-8 bg-white dark:bg-slate-900 max-w-3xl mx-auto shadow-lg">
			<div className="text-center border-b-2 border-slate-100 dark:border-slate-800 pb-4 mb-6">
				<h1 className="text-xl font-black tracking-tighter">NFSe ELETRÔNICA</h1>
				<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
					Nº {nfse.numero} | Série {nfse.serie}
				</p>
			</div>

			<div className="space-y-6 text-sm">
				<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
					<p className="font-bold text-slate-900 dark:text-white mb-2 uppercase text-[10px] tracking-widest opacity-50">
						Tomador do Serviço
					</p>
					<p className="font-bold">{nfse.destinatario.nome}</p>
					<p className="text-slate-500 font-mono text-xs">
						{nfse.destinatario.cnpj_cpf}
					</p>
				</div>

				<div className="border rounded-xl p-4 space-y-2">
					<div className="flex justify-between items-center">
						<span className="text-slate-500">Valor Bruto:</span>
						<span className="font-bold">
							R$ {nfse.valor.toLocaleString("pt-BR")}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-slate-500">
							ISS ({nfse.servico.aliquota}%):
						</span>
						<span className="text-red-500">
							- R$ {nfse.servico.valor_iss.toLocaleString("pt-BR")}
						</span>
					</div>
					<div className="flex justify-between items-center pt-2 border-t font-black text-lg">
						<span>Valor Líquido:</span>
						<span className="text-emerald-600">
							R$ {(nfse.valor - nfse.servico.valor_iss).toLocaleString("pt-BR")}
						</span>
					</div>
				</div>
			</div>

			<div className="flex justify-center gap-3 mt-8">
				<Button variant="outline" className="rounded-xl">
					<Printer className="h-4 w-4 mr-2" />
					Imprimir
				</Button>
				<Button className="rounded-xl bg-slate-900 text-white">
					<Download className="h-4 w-4 mr-2" />
					Baixar PDF
				</Button>
			</div>
		</div>
	);
}

export function NFSeContent() {
	const { user } = useAuth();
	const { currentOrganization: orgData } = useOrganizations();
	
	const organizationId = orgData?.id;
	const queryClient = useQueryClient();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"lista" | "config">("lista");
	const [_searchTerm, _setSearchTerm] = useState("");
	const [_statusFilter, _setStatusFilter] = useState<string>("todos");

	const [formData] = useState({
		tipo: "entrada" as "entrada" | "saida",
		valor: "",
		data_prestacao: new Date().toISOString().split("T")[0],
		destinatario_nome: "",
		destinatario_cpf_cnpj: "",
		destinatario_endereco: "",
		servico_descricao: "",
		codigo_cnae: "8711500",
		codigo_tributario: "010700",
	});

	const { data: nfses = [], isLoading } = useQuery({
		queryKey: ["nfse-list", organizationId],
		queryFn: async () => {
			if (!organizationId) return [];
			const response = await financialApi.nfse.list();
			return (response.data ?? [])
				.map((row) => normalizeNFSe(row as NFSeRecord))
				.sort((a, b) => b.data_emissao.localeCompare(a.data_emissao));
		},
		enabled: !!organizationId,
	});

	

	const createNFSe = useMutation({
		mutationFn: async (data: typeof formData) => {
			if (!user || !organizationId) throw new Error("Auth fail");
			const nfse = {
				numero: Math.floor(Math.random() * 100000)
					.toString()
					.padStart(10, "0"),
				serie: "1",
				valor: parseFloat(data.valor),
				data_emissao: new Date().toISOString(),
				status: "emitida",
			} as any;
			const response = await financialApi.nfse.create(nfse);
			return normalizeNFSe(response.data as NFSeRecord);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["nfse-list", organizationId],
			});
			toast.success("NFSe emitida!");
			setIsDialogOpen(false);
		},
	});

	const getStatusBadge = (status: string) => {
		const variants: any = {
			rascunho: "secondary",
			emitida: "default",
			cancelada: "destructive",
		};
		return (
			<Badge
				variant={variants[status] || "outline"}
				className="rounded-lg uppercase text-[10px] font-black tracking-widest"
			>
				{status}
			</Badge>
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<FileText className="h-6 w-6 text-primary" />
						Notas Fiscais (NFSe)
					</h2>
					<p className="text-muted-foreground mt-1">
						Gestão fiscal e emissão eletrônica municipal
					</p>
				</div>
				<Button
					onClick={() => setIsDialogOpen(true)}
					className="rounded-xl shadow-lg gap-2"
				>
					<Plus className="h-4 w-4" />
					Emitir Nota
				</Button>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(v: any) => setActiveTab(v)}
				className="w-full"
			>
				<TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
					<TabsTrigger
						value="lista"
						className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider"
					>
						Histórico
					</TabsTrigger>
					<TabsTrigger
						value="config"
						className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider"
					>
						Configurações
					</TabsTrigger>
				</TabsList>

				<TabsContent value="lista" className="mt-6">
					<Card className="rounded-2xl border-none shadow-sm overflow-hidden">
						<Table>
							<TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
								<TableRow className="border-none">
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
										Nº Nota
									</TableHead>
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
										Destinatário
									</TableHead>
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
										Valor
									</TableHead>
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
										Status
									</TableHead>
									<TableHead className="px-6 py-4 text-right font-black text-[10px] uppercase tracking-widest">
										Ações
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center py-10">
											Carregando...
										</TableCell>
									</TableRow>
								) : (
									nfses.map((nfse) => (
										<TableRow
											key={nfse.id}
											className="border-slate-50 dark:border-slate-800/50"
										>
											<TableCell className="px-6 py-4 font-mono font-bold text-xs">
												{nfse.numero}
											</TableCell>
											<TableCell className="px-6 py-4 font-bold">
												{nfse.destinatario.nome}
											</TableCell>
											<TableCell className="px-6 py-4 font-black">
												R$ {nfse.valor.toLocaleString("pt-BR")}
											</TableCell>
											<TableCell className="px-6 py-4">
												{getStatusBadge(nfse.status)}
											</TableCell>
											<TableCell className="px-6 py-4 text-right">
												<Button
													variant="ghost"
													size="icon"
													className="rounded-lg"
												>
													<Eye className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</Card>
				</TabsContent>

				<TabsContent value="config">
					<Card className="rounded-2xl p-8">
						<p className="text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
							Configurações fiscais da organização
						</p>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Basic Dialog for emission */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="rounded-2xl">
					<DialogHeader>
						<DialogTitle className="text-xl font-black tracking-tighter">
							Emissão de NFSe
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase text-slate-400">
								Nome do Tomador
							</Label>
							<Input
								className="rounded-xl h-11"
								placeholder="Nome completo ou Razão Social"
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase text-slate-400">
								CPF/CNPJ
							</Label>
							<Input className="rounded-xl h-11" placeholder="000.000.000-00" />
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase text-slate-400">
								Valor do Serviço (R$)
							</Label>
							<Input
								type="number"
								className="rounded-xl h-11 font-black"
								placeholder="0,00"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							className="rounded-xl h-11"
							onClick={() => setIsDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							className="rounded-xl h-11 bg-slate-900 text-white"
							onClick={() => createNFSe.mutate({} as any)}
						>
							Emitir Nota Fiscal
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function NFSePage() {
	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto">
				<NFSeContent />
			</div>
		</MainLayout>
	);
}
