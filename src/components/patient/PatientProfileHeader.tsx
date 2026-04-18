import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	ClipboardList,
	Edit,
	FileText,
	Mail,
	MapPin,
	Phone,
	Sparkles,
} from "lucide-react";
import { format } from "date-fns";

interface PatientProfileHeaderProps {
	patient: Patient;
	patientName: string;
	initials: string;
	onBack: () => void;
	onOpenReport: () => void;
	onOpenPremiumReport?: () => void;
	onOpenProntuario?: () => void;
	onEdit: () => void;
	onEvaluate: () => void;
	onSchedule: () => void;
}

function getPatientAge(birthDate: string): number {
	return Math.floor(
		(new Date().getTime() - new Date(birthDate).getTime()) /
			(365.25 * 24 * 60 * 60 * 1000),
	);
}

export function PatientProfileHeader({
	patient,
	patientName,
	initials,
	onBack,
	onOpenReport,
	onOpenPremiumReport,
	onOpenProntuario,
	onEdit,
	onEvaluate,
	onSchedule,
}: PatientProfileHeaderProps) {
	const status = (patient as any).status;
	const isActiveStatus =
		status === "active" || status === "Em Tratamento";

	return (
		<>
			<div className="flex items-center gap-2 text-muted-foreground mb-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onBack}
					className="-ml-2 hover:bg-transparent hover:text-primary"
				>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<span
					className="text-sm font-medium hover:text-primary cursor-pointer"
					onClick={onBack}
				>
					Voltar para Pacientes
				</span>
			</div>

			<div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100 space-y-6 relative overflow-hidden">
				<div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
					<div className="flex items-center gap-5">
						<div className="relative">
							<Avatar className="h-20 w-20 border-2 border-blue-50 shadow-sm">
								<AvatarImage
									src={(patient as any).photo_url}
									className="object-cover"
								/>
								<AvatarFallback className="text-xl bg-blue-50 text-blue-600 font-bold">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div
								className={cn(
									"absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
									isActiveStatus ? "bg-emerald-500" : "bg-slate-300",
								)}
							/>
						</div>

						<div className="space-y-1">
							<h1 className="text-2xl font-bold tracking-tight text-slate-900">
								{patientName}
							</h1>
							<div className="flex flex-wrap items-center gap-2">
								<Badge
									variant="outline"
									className={cn(
										"px-2 py-0 text-[10px] font-bold uppercase tracking-wider",
										isActiveStatus
											? "border-emerald-100 bg-emerald-50 text-emerald-700"
											: "border-slate-100 bg-slate-50 text-slate-600",
									)}
								>
									{status || "Status desconhecido"}
								</Badge>
								{(patient as any).birth_date && (
									<span className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
										<CalendarIcon className="h-3 w-3 text-blue-500" />
										{format(new Date((patient as any).birth_date), "dd/MM/yyyy")}
										<span className="text-slate-300">|</span>
										{getPatientAge((patient as any).birth_date)} anos
									</span>
								)}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2 w-full md:w-auto">
						<Button
							onClick={onOpenPremiumReport}
							variant="default"
							size="sm"
							className="flex-1 md:flex-none gap-2 bg-primary text-white hover:bg-primary-hover transition-all shadow-premium-md font-bold"
						>
							<Sparkles className="h-4 w-4" />
							Relatório Premium (IA)
						</Button>
						<Button
							onClick={onOpenReport}
							variant="outline"
							size="sm"
							className="flex-1 md:flex-none gap-2 border-blue-100 text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition-colors shadow-sm font-medium"
						>
							<FileText className="h-4 w-4" />
							Relatório
						</Button>
						{onOpenProntuario && (
							<Button
								onClick={onOpenProntuario}
								variant="outline"
								size="sm"
								className="flex-1 md:flex-none gap-2 border-violet-100 text-violet-700 hover:bg-violet-50 hover:text-violet-800 transition-colors shadow-sm font-medium"
							>
								<ClipboardList className="h-4 w-4" />
								Prontuário
							</Button>
						)}
						<Button
							onClick={onEdit}
							variant="outline"
							size="sm"
							className="flex-1 md:flex-none gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm font-medium"
						>
							<Edit className="h-4 w-4" />
							Editar
						</Button>
						<Button
							onClick={onEvaluate}
							size="sm"
							className="flex-1 md:flex-none gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all font-medium"
						>
							<ClipboardList className="h-4 w-4" />
							Avaliar
						</Button>
						<Button
							onClick={onSchedule}
							size="sm"
							className="flex-1 md:flex-none gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-medium"
						>
							<CalendarIcon className="h-4 w-4" />
							Agendar
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-blue-50">
					<div className="flex items-center gap-3 text-sm">
						<div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
							<Phone className="h-4 w-4" />
						</div>
						<div className="overflow-hidden">
							<p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
								Telefone
							</p>
							<p className="font-semibold text-slate-700 truncate">
								{(patient as any).phone || "Não informado"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 text-sm">
						<div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
							<Mail className="h-4 w-4" />
						</div>
						<div className="overflow-hidden">
							<p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
								Email
							</p>
							<p
								className="font-semibold text-slate-700 truncate"
								title={(patient as any).email}
							>
								{(patient as any).email || "Não informado"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 text-sm">
						<div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
							<MapPin className="h-4 w-4" />
						</div>
						<div className="overflow-hidden">
							<p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
								Localização
							</p>
							<p className="font-semibold text-slate-700 truncate">
								{(patient as any).city
									? `${(patient as any).city}/${(patient as any).state || ""}`
									: "Não informado"}
							</p>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
