import { useMemo } from "react";
import {
	differenceInCalendarDays,
	format,
	isAfter,
	startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Activity,
	Calendar,
	CheckCircle2,
	Clock3,
	MessageSquare,
	ShieldCheck,
	TrendingUp,
} from "lucide-react";
import { useRealtime } from "@/hooks/useRealtimeContext";
import { Profile } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartWidget } from "./ChartWidget";
import { cn } from "@/lib/utils";

interface PatientDashboardProps {
	_lastUpdate: Date;
	profile: Profile;
}

interface SummaryCardProps {
	icon: React.ElementType;
	label: string;
	value: string | number;
	description: string;
	tone?: "primary" | "emerald" | "amber";
}

const toneStyles = {
	primary: "bg-primary/10 text-primary",
	emerald: "bg-emerald-500/10 text-emerald-600",
	amber: "bg-amber-500/10 text-amber-600",
};

function normalizeName(name?: string | null) {
	return (name || "").trim().toLocaleLowerCase("pt-BR");
}

function SummaryCard({
	icon: Icon,
	label,
	value,
	description,
	tone = "primary",
}: SummaryCardProps) {
	return (
		<Card className="rounded-[1.75rem] border-border/60 bg-background/85 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
			<CardHeader className="space-y-3 pb-2">
				<div
					className={cn(
						"flex h-10 w-10 items-center justify-center rounded-2xl",
						toneStyles[tone],
					)}
				>
					<Icon className="h-4 w-4" />
				</div>
				<CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="text-3xl font-bold tracking-tight text-foreground">
					{value}
				</div>
				<p className="mt-2 text-xs leading-5 text-muted-foreground">
					{description}
				</p>
			</CardContent>
		</Card>
	);
}

export function PatientDashboard({ profile }: PatientDashboardProps) {
	const { appointments, lastUpdate, isSubscribed } = useRealtime();

	const dashboardData = useMemo(() => {
		const today = startOfDay(new Date());
		const patientName = normalizeName(profile.full_name);
		const patientAppointments = appointments
			.filter(
				(appointment) =>
					normalizeName(appointment.patient_name) === patientName,
			)
			.sort(
				(a, b) =>
					new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
			);

		const upcomingAppointments = patientAppointments.filter(
			(appointment) =>
				appointment.status !== "cancelled" &&
				isAfter(new Date(appointment.start_time), today),
		);
		const pastAppointments = patientAppointments.filter(
			(appointment) =>
				appointment.status !== "cancelled" &&
				!isAfter(new Date(appointment.start_time), today),
		);

		const confirmationRate =
			patientAppointments.length > 0
				? Math.round(
						(patientAppointments.filter(
							(appointment) => appointment.status === "confirmed",
						).length /
							patientAppointments.length) *
							100,
					)
				: 0;

		const nextAppointment = upcomingAppointments[0] || null;
		const daysUntilNext = nextAppointment
			? Math.max(
					differenceInCalendarDays(new Date(nextAppointment.start_time), today),
					0,
				)
			: null;

		const cadenceData = patientAppointments
			.slice(-6)
			.map((appointment, index) => ({
				name: format(new Date(appointment.start_time), "dd/MM"),
				value: index + 1,
			}));

		return {
			patientAppointments,
			upcomingAppointments,
			pastAppointments,
			confirmationRate,
			nextAppointment,
			daysUntilNext,
			cadenceData,
		};
	}, [appointments, profile.full_name]);

	const {
		patientAppointments,
		upcomingAppointments,
		pastAppointments,
		confirmationRate,
		nextAppointment,
		daysUntilNext,
		cadenceData,
	} = dashboardData;

	const careStatus =
		upcomingAppointments.length > 0
			? "Plano ativo"
			: patientAppointments.length > 0
				? "Sem nova sessao marcada"
				: "Sem agenda vinculada";

	return (
		<div className="space-y-6">
			<Card className="rounded-[2rem] border-border/60 bg-background/75 shadow-sm backdrop-blur-xl">
				<CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
							Minha jornada
						</p>
						<h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
							{profile.full_name?.split(" ")[0]}, acompanhe seu cuidado
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							Sessões, próximos passos e sinais de acompanhamento em uma leitura
							só.
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
						<div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
							<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								Status do cuidado
							</p>
							<p className="mt-2 text-sm font-semibold text-foreground">
								{careStatus}
							</p>
						</div>
						<div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
							<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								Última atualização
							</p>
							<p className="mt-2 text-sm font-semibold text-foreground">
								{format(new Date(lastUpdate), "HH:mm", { locale: ptBR })}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-3" data-testid="stats-cards">
				<SummaryCard
					icon={Calendar}
					label="Próxima sessão"
					value={
						nextAppointment
							? daysUntilNext === 0
								? "Hoje"
								: `${daysUntilNext}d`
							: "Sem data"
					}
					description={
						nextAppointment
							? format(
									new Date(nextAppointment.start_time),
									"EEEE, d 'de' MMM",
									{ locale: ptBR },
								)
							: "Nenhuma sessão futura confirmada"
					}
				/>
				<SummaryCard
					icon={CheckCircle2}
					label="Sessões realizadas"
					value={pastAppointments.length}
					description="Atendimentos não cancelados já concluídos no seu histórico"
					tone="emerald"
				/>
				<SummaryCard
					icon={ShieldCheck}
					label="Confirmação"
					value={`${confirmationRate}%`}
					description="Sessões confirmadas em relação ao total localizado"
					tone="amber"
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-12">
				<Card
					className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl lg:col-span-7"
					data-testid="today-schedule"
				>
					<CardHeader className="border-b border-border/60 pb-4">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
								<Clock3 className="h-4 w-4" />
							</div>
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
									Próximos passos
								</p>
								<h3 className="text-lg font-semibold tracking-tight text-foreground">
									Agenda do tratamento
								</h3>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-3 p-5">
						{upcomingAppointments.length > 0 ? (
							upcomingAppointments.slice(0, 4).map((appointment) => (
								<div
									key={appointment.id}
									className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between"
								>
									<div>
										<p className="text-sm font-semibold text-foreground">
											{format(
												new Date(appointment.start_time),
												"EEEE, d 'de' MMMM",
												{ locale: ptBR },
											)}
										</p>
										<p className="mt-1 text-sm text-muted-foreground">
											{format(new Date(appointment.start_time), "HH:mm", {
												locale: ptBR,
											})}
											{appointment.type ? ` • ${appointment.type}` : ""}
										</p>
									</div>
									<div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
										<span className="h-2 w-2 rounded-full bg-primary" />
										{appointment.status === "confirmed"
											? "Confirmada"
											: "Pendente"}
									</div>
								</div>
							))
						) : (
							<div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
								<p className="text-sm font-semibold text-foreground">
									Nenhuma sessão futura encontrada.
								</p>
								<p className="mt-2 text-sm text-muted-foreground">
									Quando uma nova sessão for agendada, ela aparecerá aqui.
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				<div className="space-y-6 lg:col-span-5">
					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
									<TrendingUp className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600/80">
										Evolução
									</p>
									<h3 className="text-lg font-semibold tracking-tight text-foreground">
										Ritmo recente
									</h3>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-5">
							<ChartWidget
								title="Linha de sessões"
								data={cadenceData}
								height={220}
							/>
						</CardContent>
					</Card>

					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
									<MessageSquare className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600/80">
										Orientações
									</p>
									<h3 className="text-lg font-semibold tracking-tight text-foreground">
										Leitura rápida
									</h3>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
							<div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
								<div className="flex items-center gap-2 font-semibold text-foreground">
									<Activity className="h-4 w-4 text-primary" />
									Histórico localizado
								</div>
								<p className="mt-2">
									{patientAppointments.length} sessão(ões) encontradas para o
									seu cadastro.
								</p>
							</div>

							<div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
								<div className="flex items-center gap-2 font-semibold text-foreground">
									<Calendar className="h-4 w-4 text-primary" />
									Próxima ação
								</div>
								<p className="mt-2">
									{nextAppointment
										? `Sua próxima sessão está prevista para ${format(new Date(nextAppointment.start_time), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}.`
										: "No momento não há uma nova sessão agendada."}
								</p>
							</div>

							<div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
								<div className="flex items-center gap-2 font-semibold text-foreground">
									<ShieldCheck className="h-4 w-4 text-emerald-600" />
									Conexão
								</div>
								<p className="mt-2">
									{isSubscribed
										? "Sincronização ativa com a agenda em tempo quase real."
										: "Sincronização temporariamente indisponível."}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
