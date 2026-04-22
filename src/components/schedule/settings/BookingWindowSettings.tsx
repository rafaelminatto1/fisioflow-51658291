import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { CalendarRange, Globe } from "lucide-react";
import { useBookingWindow } from "@/hooks/useBookingWindow";

interface BookingWindowLocalState {
	minAdvanceHours: number;
	maxAdvanceDays: number;
	allowSameDay: boolean;
	sameDayCutoff: string;
	allowOnlineBooking: boolean;
}

function formatHours(h: number): string {
	if (h < 24) return `${h} hora${h !== 1 ? "s" : ""}`;
	const d = Math.floor(h / 24);
	const rem = h % 24;
	return rem > 0 ? `${d}d${rem}h` : `${d} dia${d !== 1 ? "s" : ""}`;
}

export function BookingWindowSettings() {
	const { data: remote, save, isSaving } = useBookingWindow();

	const [state, setState] = useState<BookingWindowLocalState>({
		minAdvanceHours: remote.minAdvanceDays * 24,
		maxAdvanceDays: remote.maxAdvanceDays,
		allowSameDay: remote.allowSameDay,
		sameDayCutoff: "14:00",
		allowOnlineBooking: remote.allowOnlineBooking,
	});

	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		if (!dirty) {
			setState({
				minAdvanceHours: remote.minAdvanceDays * 24,
				maxAdvanceDays: remote.maxAdvanceDays,
				allowSameDay: remote.allowSameDay,
				sameDayCutoff: "14:00",
				allowOnlineBooking: remote.allowOnlineBooking,
			});
		}
	}, [remote, dirty]);

	const update = useCallback(
		<K extends keyof BookingWindowLocalState>(
			key: K,
			value: BookingWindowLocalState[K],
		) => {
			setState((prev) => ({ ...prev, [key]: value }));
			setDirty(true);
		},
		[],
	);

	const handleSave = useCallback(() => {
		save({
			minAdvanceDays: Math.round(state.minAdvanceHours / 24),
			maxAdvanceDays: state.maxAdvanceDays,
			allowSameDay: state.allowSameDay,
			allowOnlineBooking: state.allowOnlineBooking,
		});
		setDirty(false);
	}, [state, save]);

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

				{dirty && (
					<div className="flex justify-end pt-2">
						<button
							type="button"
							onClick={handleSave}
							disabled={isSaving}
							className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
						>
							{isSaving ? "Salvando..." : "Salvar alterações"}
						</button>
					</div>
				)}
			</div>
		</SettingsSectionCard>
	);
}
