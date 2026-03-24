import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Calendar, CheckCircle2, Clock } from "lucide-react";
import type React from "react";
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
import type { Appointment } from "@/types/appointment";

interface RescheduleConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appointment: Appointment | null;
	newDate: Date | null;
	newTime: string | null;
	onConfirm: () => void;
	isPending?: boolean;
}

export const RescheduleConfirmDialog: React.FC<
	RescheduleConfirmDialogProps
> = ({
	open,
	onOpenChange,
	appointment,
	newDate,
	newTime,
	onConfirm,
	isPending = false,
}) => {
	if (!appointment || !newDate || !newTime) return null;

	const parseDate = (date: Date | string): Date => {
		if (date instanceof Date) return date;
		const dateStr = String(date);
		if (!dateStr || dateStr === "Invalid Date") return new Date();
		// Handle ISO format (e.g. "2026-02-04T10:00:00.000Z") - use only YYYY-MM-DD part
		const dateOnly = dateStr.indexOf("T") >= 0 ? dateStr.slice(0, 10) : dateStr;
		if (dateOnly.length < 10) return new Date();
		const [y, m, d] = dateOnly.split("-").map(Number);
		const parsed = new Date(y, m - 1, d, 12, 0, 0);
		return Number.isFinite(parsed.getTime()) ? parsed : new Date();
	};

	const oldDate = parseDate(appointment.date);

	const safeFormat = (d: Date, fmt: string): string => {
		if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
		return format(d, fmt, { locale: ptBR });
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-xl p-0 gap-0 border-none shadow-premium-xl rounded-[2rem] overflow-hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
				<AlertDialogHeader className="px-8 py-8 relative overflow-hidden">
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary" />
					<div className="flex items-center gap-4 relative z-10">
						<div className="p-3.5 bg-primary/10 rounded-2xl shadow-premium-sm ring-1 ring-primary/20 animate-in zoom-in-50 duration-500">
							<Calendar className="h-6 w-6 text-primary" />
						</div>
						<div className="space-y-1">
							<AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
								Confirmar Reagendamento
							</AlertDialogTitle>
							<p className="text-sm font-bold text-primary/60 uppercase tracking-[0.2em] leading-none">
								{appointment.patientName}
							</p>
						</div>
					</div>
				</AlertDialogHeader>

				<AlertDialogDescription className="sr-only">
					Confirmação de reagendamento: nova data e horário para{" "}
					{appointment.patientName}.
				</AlertDialogDescription>

				<div className="px-8 py-2">
					<div className="flex flex-col sm:flex-row items-center gap-6 py-6 relative">
						{/* Card DE - Horário atual */}
						<div className="flex-1 w-full space-y-3 group">
							<div className="flex items-center gap-2 px-1">
								<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
									De
								</span>
								<div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
							</div>
							<div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-800/60 transition-all duration-500 group-hover:bg-white dark:group-hover:bg-slate-900 group-hover:shadow-premium-md group-hover:border-slate-200">
								<div className="flex items-center gap-3 mb-3">
									<div className="p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
										<Calendar className="h-4 w-4 text-slate-500" />
									</div>
									<div className="flex flex-col">
										<span className="font-black text-slate-900 dark:text-white text-sm">
											{safeFormat(oldDate, "dd 'de' MMMM")}
										</span>
										<span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
											{safeFormat(oldDate, "yyyy")}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<div className="p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
										<Clock className="h-4 w-4 text-slate-500" />
									</div>
									<span className="font-black text-slate-700 dark:text-slate-300 text-sm">
										{appointment.time}
									</span>
								</div>
							</div>
						</div>

						{/* Fluxo Visual / Seta */}
						<div className="relative flex items-center justify-center sm:pt-6">
							<div className="absolute inset-0 flex items-center justify-center sm:hidden">
								<div className="w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
							</div>
							<div className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-premium-lg border border-primary/10 relative z-10 group cursor-default">
								<div className="bg-primary rounded-full p-2 text-white shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-500">
									<ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
								</div>
							</div>
						</div>

						{/* Card PARA - Novo horário */}
						<div className="flex-1 w-full space-y-3 group">
							<div className="flex items-center gap-2 px-1">
								<span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
									Para
								</span>
								<div className="h-px flex-1 bg-primary/10" />
							</div>
							<div className="bg-primary/[0.03] dark:bg-primary/[0.02] rounded-3xl p-5 border border-primary/20 transition-all duration-500 group-hover:bg-primary/[0.05] group-hover:shadow-premium-md group-hover:border-primary/30">
								<div className="flex items-center gap-3 mb-3">
									<div className="p-2 bg-primary/10 rounded-xl">
										<Calendar className="h-4 w-4 text-primary" />
									</div>
									<div className="flex flex-col">
										<span className="font-black text-primary text-sm">
											{safeFormat(newDate, "dd 'de' MMMM")}
										</span>
										<span className="text-primary/50 text-[10px] font-bold uppercase tracking-wider">
											{safeFormat(newDate, "yyyy")}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-xl">
										<Clock className="h-4 w-4 text-primary" />
									</div>
									<span className="font-black text-primary text-sm">
										{newTime}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<AlertDialogFooter className="px-8 py-8 gap-4 sm:gap-2">
					<AlertDialogCancel
						disabled={isPending}
						onClick={() => onOpenChange(false)}
						className="flex-1 sm:flex-none h-14 rounded-2xl border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300"
					>
						Cancelar Operação
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isPending}
						className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-[0.15em] text-[10px] shadow-premium-lg hover:translate-y-[-2px] active:translate-y-0 transition-all duration-300 disabled:opacity-50"
					>
						{isPending ? (
							<span className="flex items-center gap-3">
								<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
								Processando...
							</span>
						) : (
							<span className="flex items-center gap-3">
								<CheckCircle2 className="h-4 w-4" />
								Confirmar Alteração
							</span>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
