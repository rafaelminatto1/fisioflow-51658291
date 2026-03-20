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
import { profileApi } from "@/lib/api/workers-client";
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
		<div className="flex flex-col space-y-4 p-4 bg-card rounded-xl border shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
			<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
				<Filter className="h-4 w-4" />
				Filtros de Análise
			</div>

			<div className="flex flex-wrap gap-4 items-end">
				<div className="flex-1 min-w-[300px] space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
							<Calendar className="h-3 w-3" />
							Período
						</label>
						<div className="flex gap-1">
							{presets.map((preset) => (
								<Button
									key={preset.days}
									variant="ghost"
									size="sm"
									onClick={() => applyPreset(preset.days)}
									className="h-7 px-2 text-[10px] font-bold hover:bg-primary/10 hover:text-primary transition-colors"
								>
									{preset.label}
								</Button>
							))}
						</div>
					</div>
					<DateRangePicker
						date={filters.dateRange}
						setDate={setDateRange}
						className="w-full"
					/>
				</div>

				<div className="w-full md:w-[250px] space-y-2">
					<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
						<Users className="h-3 w-3" />
						Profissional
					</label>
					<Select
						value={filters.professionalId}
						onValueChange={setProfessionalId}
					>
						<SelectTrigger className="w-full bg-background border-muted-foreground/20 focus:ring-primary/20">
							<SelectValue placeholder="Todos os profissionais" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos os profissionais</SelectItem>
							{professionals.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
