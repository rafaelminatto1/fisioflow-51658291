import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { CalendarRange, Globe } from "lucide-react";

interface BookingWindowState {
	minAdvanceHours: number;
	maxAdvanceDays: number;
	allowSameDay: boolean;
	sameDayCutoff: string;
	allowOnlineBooking: boolean;
}

const STORAGE_KEY = "fisioflow-booking-window";

function loadState(): BookingWindowState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore parse errors, use defaults
	}
	return {
		minAdvanceHours: 24,
		maxAdvanceDays: 60,
		allowSameDay: true,
		sameDayCutoff: "14:00",
		allowOnlineBooking: true,
	};
}

function persist(state: BookingWindowState) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatHours(h: number): string {
	if (h < 24) return `${h} hora${h !== 1 ? "s" : ""}`;
	const d = Math.floor(h / 24);
	const rem = h % 24;
	return rem > 0 ? `${d}d${rem}h` : `${d} dia${d !== 1 ? "s" : ""}`;
}

export function BookingWindowSettings() {
	const [state, setState] = useState<BookingWindowState>(loadState);

	useEffect(() => {
		persist(state);
	}, [state]);

	const update = <K extends keyof BookingWindowState>(
		key: K,
		value: BookingWindowState[K],
	) => {
		setState((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<SettingsSectionCard
			icon={<CalendarRange className="h-4 w-4" />}
			iconBg="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
			title="Janela de Agendamento"
			description="Controle quando os pacientes podem agendar"
		>
			<div className="space-y-6">
				<div>
					<div className="flex justify-between items-end mb-2">
						<Label className="text-sm font-medium">
							Agendamento mínimo antecipado
						</Label>
						<span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
							{formatHours(state.minAdvanceHours)}
						</span>
					</div>
					<input
						type="range"
						min={0}
						max={72}
						step={1}
						value={state.minAdvanceHours}
						onChange={(e) =>
							update("minAdvanceHours", parseInt(e.target.value, 10))
						}
						className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500"
					/>
					<div className="flex justify-between mt-1 px-1">
						<span className="text-[11px] text-muted-foreground">0h</span>
						<span className="text-[11px] text-muted-foreground">72h</span>
					</div>
				</div>

				<div>
					<div className="flex justify-between items-end mb-2">
						<Label className="text-sm font-medium">
							Agendamento máximo antecipado
						</Label>
						<span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
							{state.maxAdvanceDays} dias
						</span>
					</div>
					<input
						type="range"
						min={7}
						max={180}
						step={1}
						value={state.maxAdvanceDays}
						onChange={(e) =>
							update("maxAdvanceDays", parseInt(e.target.value, 10))
						}
						className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500"
					/>
					<div className="flex justify-between mt-1 px-1">
						<span className="text-[11px] text-muted-foreground">7 dias</span>
						<span className="text-[11px] text-muted-foreground">180 dias</span>
					</div>
				</div>

				<div className="space-y-3 pt-4 border-t">
					<div className="flex items-start justify-between gap-3">
						<div>
							<Label className="text-sm font-medium">
								Permitir agendamento do mesmo dia
							</Label>
							{state.allowSameDay && (
								<p className="text-xs text-muted-foreground mt-0.5">
									até {state.sameDayCutoff}
								</p>
							)}
						</div>
						<Switch
							checked={state.allowSameDay}
							onCheckedChange={(v) => update("allowSameDay", v)}
						/>
					</div>

					{state.allowSameDay && (
						<div className="ml-0">
							<Label className="text-xs text-muted-foreground">Corte horário</Label>
							<input
								type="time"
								value={state.sameDayCutoff}
								onChange={(e) => update("sameDayCutoff", e.target.value)}
								className="ml-2 h-8 px-2 rounded-lg border bg-background text-sm font-mono"
							/>
						</div>
					)}

					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Globe className="h-4 w-4 text-muted-foreground" />
							<Label className="text-sm font-medium">
								Permitir agendamento online
							</Label>
						</div>
						<Switch
							checked={state.allowOnlineBooking}
							onCheckedChange={(v) => update("allowOnlineBooking", v)}
						/>
					</div>
				</div>
			</div>
		</SettingsSectionCard>
	);
}
