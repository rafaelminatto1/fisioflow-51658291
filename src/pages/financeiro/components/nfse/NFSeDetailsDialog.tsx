import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Activity, Printer, Download } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type NFSe, statusConfig } from "./types";

interface NFSeDetailsDialogProps {
	selectedNFSe: NFSe | null;
	onClose: () => void;
	onCancel: (id: string) => void;
	isCancelling: boolean;
}

export function NFSeDetailsDialog({
	selectedNFSe,
	onClose,
	onCancel,
	isCancelling,
}: NFSeDetailsDialogProps) {
	return (
		<Dialog open={!!selectedNFSe} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="rounded-[3rem] max-w-lg p-0 overflow-hidden border-none shadow-2xl">
				{selectedNFSe && (
					<div className="flex flex-col h-full bg-white dark:bg-slate-900">
						<div className="bg-slate-50 dark:bg-slate-800/50 p-12 text-center relative">
							<div className="absolute top-6 left-1/2 -translate-x-1/2">
								<div
									className={cn(
										"inline-flex items-center gap-2 px-5 py-1.5 rounded-full shadow-sm font-black uppercase tracking-[0.2em] text-[10px]",
										statusConfig[selectedNFSe.status]?.bg,
										statusConfig[selectedNFSe.status]?.color,
									)}
								>
									{statusConfig[selectedNFSe.status]?.label}
								</div>
							</div>

							<div className="mt-4 space-y-2">
								<p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
									Nota Fiscal Eletrônica
								</p>
								<h3 className="text-5xl font-black tracking-tighter italic text-slate-900 dark:text-white">
									Nº {selectedNFSe.numero}
								</h3>
							</div>

							{selectedNFSe.status === "falhou" && selectedNFSe.ultimo_erro && (
								<motion.div
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									className="mt-6 p-5 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/50 text-[11px] font-bold leading-relaxed"
								>
									<p className="uppercase tracking-widest text-[9px] mb-2 opacity-50 flex items-center justify-center gap-1">
										<AlertCircle className="h-3 w-3" /> Erro na Transmissão
									</p>
									{selectedNFSe.ultimo_erro}
								</motion.div>
							)}
						</div>

						<div className="p-10 space-y-8 flex-1">
							<div className="grid grid-cols-2 gap-10">
								<div className="space-y-1">
									<p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
										Data de Emissão
									</p>
									<p className="font-bold text-slate-700 dark:text-slate-200">
										{new Date(selectedNFSe.data_emissao).toLocaleString(
											"pt-BR",
										)}
									</p>
								</div>
								<div className="space-y-1 text-right">
									<p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
										Cód. Verificação
									</p>
									<p className="font-mono font-bold text-slate-900 dark:text-white uppercase">
										{selectedNFSe.codigo_verificacao || "Pendente"}
									</p>
								</div>
							</div>

							<div className="space-y-5">
								<div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
									<p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
										Tomador
									</p>
									<p className="font-black text-slate-900 dark:text-white text-lg tracking-tight">
										{selectedNFSe.destinatario.nome}
									</p>
									<p className="text-xs font-mono font-medium text-slate-500 mt-0.5">
										{selectedNFSe.destinatario.cnpj_cpf}
									</p>
								</div>

								<div className="p-8 rounded-[2rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
									<div className="absolute top-0 right-0 p-4 opacity-10">
										<Activity className="h-20 w-20" />
									</div>
									<div className="space-y-4 relative z-10">
										<div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
											<span>Valor dos Serviços</span>
											<span className="text-white">
												R${" "}
												{selectedNFSe.valor.toLocaleString("pt-BR", {
													minimumFractionDigits: 2,
												})}
											</span>
										</div>
										<div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
											<span>Impostos Detidos</span>
											<span className="text-white">Isento / Simples</span>
										</div>
										<div className="pt-6 border-t border-white/10 flex justify-between items-end">
											<span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
												Total Líquido
											</span>
											<span className="text-4xl font-black tracking-tighter italic leading-none">
												R${" "}
												{selectedNFSe.valor.toLocaleString("pt-BR", {
													minimumFractionDigits: 2,
												})}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="p-10 pt-0 grid grid-cols-2 gap-4">
							<Button
								variant="outline"
								className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] border-slate-100 dark:border-slate-800"
								onClick={() =>
									selectedNFSe.link_nfse &&
									window.open(selectedNFSe.link_nfse, "_blank")
								}
							>
								<Printer className="mr-2 h-4 w-4" />
								Imprimir
							</Button>
							{selectedNFSe.status !== "cancelado" &&
							selectedNFSe.status !== "rascunho" &&
							selectedNFSe.status !== "falhou" ? (
								<Button
									variant="destructive"
									className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] bg-red-50 text-red-600 border-none hover:bg-red-100 shadow-none"
									onClick={() => {
										if (
											confirm(
												"Tem certeza que deseja cancelar esta nota fiscal? Esta ação notificará a contabilidade automaticamente.",
											)
										) {
											onCancel(selectedNFSe.id);
										}
									}}
									disabled={isCancelling}
								>
									{isCancelling ? "Cancelando..." : "Cancelar Nota"}
								</Button>
							) : (
								<Button
									className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] bg-slate-900 text-white"
									onClick={() =>
										selectedNFSe.link_danfse &&
										window.open(selectedNFSe.link_danfse, "_blank")
									}
									disabled={!selectedNFSe.link_danfse}
								>
									<Download className="mr-2 h-4 w-4" />
									PDF Original
								</Button>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
