import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ArrowLeft,
	ArrowUpRight,
	CalendarCheck,
	CalendarOff,
	Clock,
	Palette,
	Shield,
	Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { ScheduleCapacityHoursTab } from "@/components/schedule/settings/tabs/ScheduleCapacityHoursTab";
import { SchedulePoliciesTab } from "@/components/schedule/settings/tabs/SchedulePoliciesTab";
import { ScheduleBlockedTab } from "@/components/schedule/settings/tabs/ScheduleBlockedTab";
import { ScheduleVisualTab } from "@/components/schedule/settings/tabs/ScheduleVisualTab";
import { useState } from "react";

const scheduleSettingsTabs = [
	{
		value: "schedule",
		label: "Horários",
		description: "Capacidade e funcionamento",
		title: "Horários e capacidade",
		summary:
			"Defina dias úteis, faixas de atendimento e limite de pacientes por horário.",
		impact: [
			"Controla os horários disponíveis para novos agendamentos.",
			"Ajuda a evitar superlotação por dia ou por faixa de horário.",
			"Afeta a grade principal da agenda imediatamente após salvar.",
		],
		icon: Clock,
	},
	{
		value: "policies",
		label: "Políticas",
		description: "Cancelamentos e lembretes",
		title: "Regras e notificações",
		summary:
			"Ajuste antecedência de cancelamento, limites operacionais e mensagens automáticas.",
		impact: [
			"Define como cancelamentos e reagendamentos devem se comportar.",
			"Organiza lembretes e confirmações enviadas aos pacientes.",
			"Reduz ajustes manuais da equipe no dia a dia.",
		],
		icon: Shield,
	},
	{
		value: "blocked",
		label: "Bloqueios",
		description: "Ausências e indisponibilidades",
		title: "Bloqueios da agenda",
		summary:
			"Bloqueie períodos em que a clínica, equipe ou agenda não deve receber consultas.",
		impact: [
			"Remove períodos indisponíveis da grade de marcação.",
			"Evita conflitos com feriados, reuniões e ausências.",
			"Facilita conferir pausas diretamente na agenda.",
		],
		icon: CalendarOff,
	},
	{
		value: "visual",
		label: "Visual",
		description: "Cards, cores e acessibilidade",
		title: "Aparência e leitura",
		summary:
			"Personalize tamanho dos cards, altura dos slots, cores por status e recursos visuais.",
		impact: [
			"Muda como os atendimentos aparecem na visão da agenda.",
			"Ajuda a deixar a grade mais compacta ou mais confortável.",
			"Melhora leitura por status, contraste e tamanho de texto.",
		],
		icon: Palette,
	},
] as const;

type ScheduleSettingsTabValue = (typeof scheduleSettingsTabs)[number]["value"];

export default function ScheduleSettings() {
	useScheduleSettings();
	useScheduleCapacity();
	const [activeTab, setActiveTab] =
		useState<ScheduleSettingsTabValue>("schedule");
	const activeSection =
		scheduleSettingsTabs.find((tab) => tab.value === activeTab) ??
		scheduleSettingsTabs[0];
	const ActiveIcon = activeSection.icon;

	return (
		<MainLayout>
			<div className="mx-auto max-w-7xl space-y-5">
				<div className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex items-start gap-4">
							<Link to="/agenda">
								<Button variant="ghost" size="icon" className="rounded-xl">
									<ArrowLeft className="h-5 w-5" />
								</Button>
							</Link>
							<div className="space-y-2">
								<Badge variant="outline" className="w-fit gap-1.5 rounded-full">
									<CalendarCheck className="h-3.5 w-3.5" />
									Agenda
								</Badge>
								<div>
									<h1 className="text-2xl font-bold tracking-tight">
										Configurações da Agenda
									</h1>
									<p className="max-w-2xl text-sm text-muted-foreground">
										Faça ajustes por área e confira rapidamente onde cada
										mudança aparece na agenda.
									</p>
								</div>
							</div>
						</div>

						<Button asChild variant="outline" className="gap-2 rounded-xl">
							<Link to="/agenda">
								Ver agenda
								<ArrowUpRight className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={(value) =>
						setActiveTab(value as ScheduleSettingsTabValue)
					}
					className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)_18rem] lg:items-start"
				>
					<TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-3xl border bg-background p-2 shadow-sm lg:sticky lg:top-4 lg:block lg:space-y-1.5">
						{scheduleSettingsTabs.map((tab) => {
							const Icon = tab.icon;

							return (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className="group h-auto min-h-16 w-full justify-start rounded-2xl border border-transparent px-3 py-3 text-left transition-colors data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none lg:min-h-[4.75rem]"
								>
									<div className="flex min-w-0 items-center gap-3">
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary">
											<Icon className="h-4 w-4" />
										</span>
										<span className="min-w-0 space-y-0.5">
											<span className="block text-sm font-medium leading-none">
												{tab.label}
											</span>
											<span className="mt-1 hidden text-xs font-normal leading-snug text-muted-foreground sm:block">
												{tab.description}
											</span>
										</span>
									</div>
								</TabsTrigger>
							);
						})}
					</TabsList>

					<div className="min-w-0 space-y-4">
						<div className="rounded-3xl border bg-background p-5 shadow-sm">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex items-start gap-3">
									<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
										<ActiveIcon className="h-5 w-5" />
									</span>
									<div>
										<h2 className="text-lg font-semibold">
											{activeSection.title}
										</h2>
										<p className="max-w-2xl text-sm text-muted-foreground">
											{activeSection.summary}
										</p>
									</div>
								</div>
								<Badge variant="secondary" className="w-fit rounded-full">
									Seção atual
								</Badge>
							</div>
						</div>

						<div className="rounded-3xl border bg-background p-4 shadow-sm sm:p-5">
							<div className="mb-4 flex items-center gap-2 border-b pb-3">
								<Sparkles className="h-4 w-4 text-primary" />
								<p className="text-sm font-medium">Ajustes disponíveis</p>
							</div>

							<TabsContent
								value="schedule"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleCapacityHoursTab />
							</TabsContent>

							<TabsContent
								value="policies"
								className="mt-0 focus-visible:outline-none"
							>
								<SchedulePoliciesTab />
							</TabsContent>

							<TabsContent
								value="blocked"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleBlockedTab />
							</TabsContent>

							<TabsContent
								value="visual"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleVisualTab />
							</TabsContent>
						</div>
					</div>

					<aside className="rounded-3xl border bg-background p-5 shadow-sm lg:sticky lg:top-4">
						<div className="space-y-4">
							<div>
								<p className="text-sm font-semibold">Como conferir</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Depois de alterar, volte para a agenda e veja o impacto na
									grade.
								</p>
							</div>

							<div className="space-y-3">
								{activeSection.impact.map((item) => (
									<div key={item} className="flex gap-2 text-sm">
										<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
										<span className="text-muted-foreground">{item}</span>
									</div>
								))}
							</div>

							<Button asChild className="w-full gap-2 rounded-xl">
								<Link to="/agenda">
									Abrir agenda
									<ArrowUpRight className="h-4 w-4" />
								</Link>
							</Button>
						</div>
					</aside>
				</Tabs>
			</div>
		</MainLayout>
	);
}
