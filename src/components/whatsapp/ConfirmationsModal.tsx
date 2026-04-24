import { useEffect, useState } from "react";
import { CalendarCheck, Loader2, Calendar, CheckCircle2, BellRing } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchPendingConfirmations } from "@/services/whatsapp-api";

interface ConfirmationsModalProps {
	open: boolean;
	onClose: () => void;
	onSendConfirmation: (
		phone: string,
		patientName: string,
		date: string,
		time: string,
	) => Promise<void>;
}

export function ConfirmationsModal({
	open,
	onClose,
	onSendConfirmation,
}: ConfirmationsModalProps) {
	const [confirmations, setConfirmations] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState<string | null>(null);
	const [sent, setSent] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		fetchPendingConfirmations(50)
			.then(setConfirmations)
			.catch(() => setConfirmations([]))
			.finally(() => setLoading(false));
	}, [open]);

	const handleSend = async (appt: any) => {
		const phone = appt.patient?.phone;
		if (!phone || sending) return;
		setSending(appt.appointment_id);
		try {
			await onSendConfirmation(
				phone,
				appt.patient?.name || "Paciente",
				appt.appointment_date || "",
				appt.appointment_time || "",
			);
			setSent((prev) => new Set([...prev, appt.appointment_id]));
		} finally {
			setSending(null);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) {
					setSent(new Set());
					onClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-primary">
						<CalendarCheck className="h-5 w-5" />
						Confirmar Consultas
					</DialogTitle>
				</DialogHeader>
				<div className="py-2">
					{loading ? (
						<div className="flex justify-center py-10">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : confirmations.length === 0 ? (
						<div className="text-center py-10 text-muted-foreground">
							<CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p className="text-sm font-medium text-foreground">
								Nenhuma consulta pendente
							</p>
							<p className="text-xs mt-1">
								Não há consultas aguardando confirmação.
							</p>
						</div>
					) : (
						<ScrollArea className="h-[360px]">
							<div className="space-y-2 pr-2">
								{confirmations.map((appt) => {
									const isAlreadySent = sent.has(appt.appointment_id);
									const isSending = sending === appt.appointment_id;
									const hasPhone = !!appt.patient?.phone;
									return (
										<div
											key={appt.appointment_id}
											className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
										>
											<div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
												<Calendar className="h-4 w-4 text-primary" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{appt.patient?.name || "Paciente desconhecido"}
												</p>
												<p className="text-xs text-muted-foreground">
													{appt.appointment_date
														? new Date(
																appt.appointment_date + "T00:00:00",
															).toLocaleDateString("pt-BR", {
																weekday: "short",
																day: "numeric",
																month: "short",
															})
														: "—"}{" "}
													às {appt.appointment_time || "—"}
												</p>
												{!hasPhone && (
													<p className="text-[11px] text-orange-500 mt-0.5">
														Sem número cadastrado
													</p>
												)}
											</div>
											<Button
												size="sm"
												variant={isAlreadySent ? "ghost" : "outline"}
												className={`h-8 text-xs shrink-0 ${isAlreadySent ? "text-green-600 dark:text-green-400" : ""}`}
												disabled={!hasPhone || isSending || isAlreadySent}
												onClick={() => handleSend(appt)}
											>
												{isSending ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : isAlreadySent ? (
													<>
														<CheckCircle2 className="h-3 w-3 mr-1" /> Enviado
													</>
												) : (
													<>
														<BellRing className="h-3 w-3 mr-1" /> Confirmar
													</>
												)}
											</Button>
										</div>
									);
								})}
							</div>
						</ScrollArea>
					)}
				</div>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => {
							setSent(new Set());
							onClose();
						}}
					>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
