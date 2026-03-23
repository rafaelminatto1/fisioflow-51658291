import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TimelineEntry, usePatientTimeline } from "@/hooks/usePatientTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Calendar,
	Mail,
	MessageSquare,
	Phone,
	Stethoscope,
	CheckCircle2,
	Clock,
	AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientTimelineProps {
	patientId: string | undefined;
}

export function PatientTimeline({ patientId }: PatientTimelineProps) {
	const { data: entries = [], isLoading } = usePatientTimeline(patientId);

	const getEntryIcon = (entry: TimelineEntry) => {
		switch (entry.entry_type) {
			case "appointment":
				return <Calendar className="h-4 w-4" />;
			case "email":
				return <Mail className="h-4 w-4" />;
			case "whatsapp":
				return <MessageSquare className="h-4 w-4" />;
			case "sms":
				return <Phone className="h-4 w-4" />;
			case "evolution":
				return <Stethoscope className="h-4 w-4" />;
			default:
				return <Clock className="h-4 w-4" />;
		}
	};

	const getEntryColor = (entry: TimelineEntry) => {
		if (entry.category === "clinical")
			return "bg-blue-500/10 text-blue-600 border-blue-200";
		return "bg-purple-500/10 text-purple-600 border-purple-200";
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-24 w-full rounded-2xl" />
				))}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<div className="text-center p-12 bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
				<p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
					Sem atividades registradas
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/40 before:to-transparent">
			{entries.map((entry, idx) => (
				<div key={entry.id} className="relative flex items-start gap-6 group">
					{/* dot */}
					<div
						className={cn(
							"flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shadow-sm z-10 shrink-0 transition-transform group-hover:scale-110",
							getEntryColor(entry),
						)}
					>
						{getEntryIcon(entry)}
					</div>

					<div className="flex-1 pb-6 border-b border-border/40 last:border-0">
						<div className="flex items-center justify-between gap-4 mb-1">
							<div className="flex items-center gap-2">
								<h4 className="text-sm font-black uppercase tracking-tight">
									{entry.entry_type === "appointment"
										? "Agendamento"
										: entry.entry_type === "evolution"
											? "Evolução SOAP"
											: `Mensagem: ${entry.entry_type}`}
								</h4>
								<Badge
									variant="outline"
									className="text-[9px] font-black uppercase tracking-tighter h-4 px-1.5"
								>
									{entry.category}
								</Badge>
							</div>
							<time className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">
								{format(new Date(entry.created_at), "dd MMM · HH:mm", {
									locale: ptBR,
								})}
							</time>
						</div>

						<div className="bg-muted/30 rounded-2xl p-3 border border-border/20 transition-all hover:bg-muted/50 hover:shadow-premium-sm">
							{entry.subject && (
								<p className="text-xs font-bold mb-1 text-foreground/80">
									{entry.subject}
								</p>
							)}
							<p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
								{entry.body ||
									(entry.entry_type === "appointment"
										? `Sessão agendada para ${entry.start_time}`
										: "Sem detalhes")}
							</p>

							{entry.status && (
								<div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/20">
									<div
										className={cn(
											"w-1.5 h-1.5 rounded-full",
											entry.status === "enviado" || entry.status === "completed"
												? "bg-green-500"
												: "bg-amber-500",
										)}
									/>
									<span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
										Status: {entry.status}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
