import React from "react";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/v2";
import { Calendar, Users, Filter } from "lucide-react";

export function AnalyticsFilters() {
	const { filters, setDateRange, setProfessionalId, applyPreset } =
		useAnalyticsFilters();

	const { data: professionals = [] } = useQuery({
		queryKey: ["therapists-list"],
		queryFn: async () => {
			const res = await profileApi.listTherapists();
			return res?.data ?? [];
		},
	});

	const presets = [
		{ label: "7d", days: 7 },
		{ label: "15d", days: 15 },
		{ label: "30d", days: 30 },
		{ label: "60d", days: 60 },
		{ label: "90d", days: 90 },
	];

	return (
		<div className="p-4 sm:p-6 bg-card rounded-2xl border shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.02] animate-in fade-in slide-in-from-top-4 duration-500">
			<div className="flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Filter className="h-4 w-4 text-primary" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-foreground tracking-tight">
								Parâmetros de Análise
							</h3>
							<p className="text-[11px] text-muted-foreground font-medium">
								Configure o intervalo e escopo dos dados
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* Período */}
					<div className="lg:col-span-7 space-y-3">
						<div className="flex items-center justify-between">
							<label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80 flex items-center gap-1.5">
								<Calendar className="h-3 w-3" />
								Intervalo de Tempo
							</label>
							<div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg border border-border/50">
								{presets.map((preset) => (
									<Button
										key={preset.days}
										variant="ghost"
										size="sm"
										onClick={() => applyPreset(preset.days)}
										className="h-6 px-2 text-[10px] font-bold hover:bg-background hover:shadow-sm transition-all rounded-md"
									>
										{preset.label}
									</Button>
								))}
							</div>
						</div>
						<div className="relative">
							<DateRangePicker
								date={filters.dateRange}
								setDate={setDateRange}
								className="w-full bg-background/50 hover:bg-background transition-colors border-muted-foreground/20 rounded-xl"
							/>
						</div>
					</div>

					{/* Profissional */}
					<div className="lg:col-span-5 space-y-3">
						<label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80 flex items-center gap-1.5">
							<Users className="h-3 w-3" />
							Escopo de Profissional
						</label>
						<Select
							value={filters.professionalId}
							onValueChange={setProfessionalId}
						>
							<SelectTrigger className="w-full h-10 bg-background/50 hover:bg-background transition-colors border-muted-foreground/20 rounded-xl focus:ring-primary/20">
								<div className="flex items-center gap-2">
									<SelectValue placeholder="Todos os profissionais" />
								</div>
							</SelectTrigger>
							<SelectContent className="rounded-xl border-border/50">
								<SelectItem value="all" className="rounded-lg">
									Todos os profissionais (Geral)
								</SelectItem>
								{professionals.map((p) => (
									<SelectItem key={p.id} value={p.id} className="rounded-lg">
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</div>
	);
}
