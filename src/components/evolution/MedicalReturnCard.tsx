/**
 * Card de Retorno Médico na página de Evolução
 * Exibe e permite editar: data do retorno, médico, telefone; link para relatório médico
 */

import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Stethoscope,
	FileText,
	Plus,
	Edit2,
	Phone,
	CheckCircle2,
	AlertCircle,
	RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePatientMedicalReturns } from "@/hooks/usePatientEvolution";
import { MedicalReturnFormModal } from "@/components/evolution/MedicalReturnFormModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { fisioLogger as logger } from "@/lib/errors/logger";
import type { Patient } from "@/types";
import type { MedicalReturn } from "@/types/evolution";
import { cn } from "@/lib/utils";

interface MedicalReturnCardProps {
	patient: Patient | null | undefined;
	patientId: string | undefined;
	onPatientUpdated?: () => void;
	defaultCollapsed?: boolean;
}

export const MedicalReturnCard = memo(function MedicalReturnCard({
	patient,
	patientId,
	onPatientUpdated,
	defaultCollapsed = false,
}: MedicalReturnCardProps) {
	const navigate = useNavigate();
	const {
		data: medicalReturns = [],
		isLoading,
		error,
		refetch,
		isFetching,
	} = usePatientMedicalReturns(patientId || "");
	const [modalOpen, setModalOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
	const [editingReturn, setEditingReturn] = useState<MedicalReturn | null>(
		null,
	);
	const hasQueryError = !!error && medicalReturns.length === 0;

	// Colapsar automaticamente se não houver registros e não estiver carregando
	useEffect(() => {
		if (!isLoading && medicalReturns.length === 0) {
			setIsCollapsed(true);
		} else if (medicalReturns.length > 0) {
			setIsCollapsed(false);
		}
	}, [medicalReturns.length, isLoading]);

	const handleAdd = (e: React.MouseEvent) => {
		e.stopPropagation();
		setEditingReturn(null);
		setModalOpen(true);
	};

	const handleEdit = (r: MedicalReturn, e: React.MouseEvent) => {
		e.stopPropagation();
		setEditingReturn(r);
		setModalOpen(true);
	};

	const handleCloseModal = (open: boolean) => {
		setModalOpen(open);
		if (!open) setEditingReturn(null);
	};

	const goToRelatorio = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (patientId) {
			navigate(`/relatorios/medico?patientId=${patientId}`);
		}
	};

	const getPeriodLabel = (period?: string) => {
		switch (period) {
			case "manha":
				return "Manhã";
			case "tarde":
				return "Tarde";
			case "noite":
				return "Noite";
			default:
				return null;
		}
	};

	if (!patientId) return null;

	return (
		<>
			<Card
				className={cn(
					"border-primary/10 bg-white shadow-sm transition-all duration-300 flex flex-col hover:border-primary/30",
					isCollapsed && "cursor-pointer hover:bg-slate-50/50"
				)}
				onClick={() => isCollapsed && setIsCollapsed(false)}
			>
				<CardHeader className={cn(
					"pb-2 pt-3 px-4 flex flex-row items-center justify-between flex-shrink-0 select-none",
					isCollapsed && "pb-3"
				)}>
					<div
						className="flex items-center gap-2 flex-1 cursor-pointer"
						onClick={(e) => {
							if (!isCollapsed) {
								e.stopPropagation();
								setIsCollapsed(true);
							}
						}}
					>
						<Stethoscope className={cn("h-5 w-5 transition-colors", medicalReturns.length > 0 ? "text-primary" : "text-slate-400")} />
						<CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
							Retorno Médico
							{medicalReturns.length > 0 && (
								<Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 h-5 px-1.5 font-bold">
									{medicalReturns.length}
								</Badge>
							)}
						</CardTitle>
					</div>

					<div className="flex items-center gap-1">
						{!isCollapsed && (
							<Button
								variant="ghost"
								size="sm"
								onClick={goToRelatorio}
								className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider gap-1 hover:bg-primary/5 text-slate-500 hover:text-primary border border-transparent hover:border-primary/10"
							>
								<FileText className="h-3 w-3" />
								Relatório
							</Button>
						)}
						<Button
							variant="ghost"
							size="sm"
							onClick={handleAdd}
							className="h-7 w-7 p-0 hover:bg-primary/5 text-slate-400 hover:text-primary"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>

				{!isCollapsed && (
					<CardContent className="px-4 pb-3 flex-1 min-h-0 animate-in fade-in slide-in-from-top-1 duration-200">
						{isLoading ? (
							<div className="flex items-center justify-center py-4">
								<RefreshCw className="h-4 w-4 text-primary/40 animate-spin" />
							</div>
						) : hasQueryError ? (
							<div className="text-center py-4 space-y-2">
								<p className="text-xs text-slate-400">Erro ao carregar dados.</p>
								<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => refetch()}>
									Tentar novamente
								</Button>
							</div>
						) : medicalReturns.length === 0 ? (
							<div className="text-center py-4 border-t border-slate-50 mt-1">
								<p className="text-xs text-slate-400 italic">Nenhum registro</p>
							</div>
						) : (
							<ScrollArea className="max-h-[200px] pr-2">
								<ul className="space-y-2">
									{medicalReturns.map((r) => {
										const returnDate = r.return_date;
										const period = getPeriodLabel(r.return_period);
										const isUpcoming = returnDate ? new Date(returnDate) > new Date() : false;

										return (
											<li
												key={r.id}
												className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-50/50 border border-slate-100 hover:border-primary/20 hover:bg-white transition-all group relative"
											>
												<div className="flex items-start justify-between gap-2">
													<div className="min-w-0 flex-1">
														<p className="text-sm font-bold text-slate-700 leading-tight">
															{r.doctor_name}
														</p>
														<div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
															<span className={cn(isUpcoming && "text-primary font-bold")}>
																{returnDate ? format(new Date(returnDate), "dd/MM/yy", { locale: ptBR }) : "—"}
															</span>
															{period && <><span className="text-slate-300">•</span><span>{period}</span></>}
														</div>
													</div>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 opacity-0 group-hover:opacity-100 p-0 text-slate-400 hover:text-primary transition-all"
														onClick={(e) => handleEdit(r, e)}
													>
														<Edit2 className="h-3 w-3" />
													</Button>
												</div>

												<div className="flex gap-1.5">
													{r.report_done && (
														<Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] h-4.5 px-1.5">
															Relatório OK
														</Badge>
													)}
													{r.report_sent && (
														<Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] h-4.5 px-1.5">
															Enviado
														</Badge>
													)}
												</div>
											</li>
										);
									})}
								</ul>
							</ScrollArea>
						)}
					</CardContent>
				)}
			</Card>

			<MedicalReturnFormModal
				open={modalOpen}
				onOpenChange={handleCloseModal}
				patientId={patientId}
				medicalReturn={editingReturn}
				onSuccess={onPatientUpdated}
			/>
		</>
	);
});
