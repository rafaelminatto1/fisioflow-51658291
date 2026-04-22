import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { AlignHorizontalSpaceAround } from "lucide-react";

interface SlotAlignmentState {
	slotInterval: 15 | 30 | 60;
	roundToNextSlot: boolean;
}

const STORAGE_KEY = "fisioflow-slot-alignment";

function loadState(): SlotAlignmentState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore parse errors, use defaults
	}
	return { slotInterval: 15, roundToNextSlot: false };
}

function persist(state: SlotAlignmentState) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const SLOT_OPTIONS: { value: 15 | 30 | 60; label: string }[] = [
	{ value: 15, label: "A cada 15 minutos" },
	{ value: 30, label: "A cada 30 minutos" },
	{ value: 60, label: "A cada 1 hora" },
];

function MiniTimeline({ interval }: { interval: number }) {
	const slots: string[] = [];
	const startHour = 7;
	const count = Math.min(Math.floor(60 / interval) + 1, 5);
	for (let i = 0; i < count; i++) {
		const mins = startHour * 60 + i * interval;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
	}

	return (
		<div className="bg-muted/50 p-4 rounded-lg border border-border/30">
			<div className="flex items-center justify-between text-muted-foreground font-mono text-xs">
				{slots.map((s, i) => (
					<div key={s} className="flex items-center flex-1 last:flex-none">
						<div className="flex flex-col items-center gap-1">
							<div className="w-2 h-2 rounded-full bg-teal-500" />
							<span>{s}</span>
						</div>
						{i < slots.length - 1 && (
							<div className="h-px bg-border/50 flex-1 mx-2" />
						)}
					</div>
				))}
			</div>
		</div>
	);
}

export function SlotAlignmentSettings() {
	const [state, setState] = useState<SlotAlignmentState>(loadState);

	useEffect(() => {
		persist(state);
	}, [state]);

	return (
		<SettingsSectionCard
			icon={<AlignHorizontalSpaceAround className="h-4 w-4" />}
			iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
			title="Alinhamento de Slots"
			description="Como os horários são distribuídos"
		>
			<div className="space-y-5">
				<div className="space-y-3">
					{SLOT_OPTIONS.map((opt) => (
						<label
							key={opt.value}
							className={cn(
								"flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all",
								state.slotInterval === opt.value
									? "border-teal-400 bg-teal-50/50 dark:bg-teal-950/30"
									: "border-transparent hover:bg-muted/30",
							)}
						>
							<input
								type="radio"
								name="slot-interval"
								checked={state.slotInterval === opt.value}
								onChange={() =>
									setState((prev) => ({ ...prev, slotInterval: opt.value }))
								}
								className="w-4 h-4 text-teal-600 focus:ring-teal-500"
							/>
							<span className="text-sm font-medium">{opt.label}</span>
						</label>
					))}
				</div>

				<MiniTimeline interval={state.slotInterval} />

				<div className="flex items-center gap-3 pt-2">
					<Switch
						id="round-next-slot"
						checked={state.roundToNextSlot}
						onCheckedChange={(v) =>
							setState((prev) => ({ ...prev, roundToNextSlot: v }))
						}
					/>
					<Label
						htmlFor="round-next-slot"
						className="text-sm font-medium cursor-pointer"
					>
						Arredondar para o próximo slot disponível
					</Label>
				</div>
			</div>
		</SettingsSectionCard>
	);
}
