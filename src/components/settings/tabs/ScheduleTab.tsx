import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock } from "lucide-react";

const TimeInput = memo(({ id, label, value, onChange }: any) => (
	<div className="space-y-1.5 sm:space-y-2">
		<Label htmlFor={id} className="text-xs sm:text-sm">
			{label}
		</Label>
		<Input
			id={id}
			type="time"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="text-sm"
		/>
	</div>
));

export function ScheduleTab({ workingHours, setWorkingHours, onSave }: any) {
	return (
		<Card className="bg-gradient-card border-border shadow-card">
			<CardHeader className="border-b border-border p-3 sm:p-4">
				<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
					<Clock className="w-4 h-4 sm:w-5 sm:h-5" /> Horário de Funcionamento
				</CardTitle>
			</CardHeader>
			<CardContent className="p-3 sm:p-4 lg:p-6 space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<TimeInput
						id="start"
						label="Início"
						value={workingHours.start}
						onChange={(v: any) =>
							setWorkingHours({ ...workingHours, start: v })
						}
					/>
					<TimeInput
						id="end"
						label="Fim"
						value={workingHours.end}
						onChange={(v: any) => setWorkingHours({ ...workingHours, end: v })}
					/>
				</div>
				<Separator />
				<div className="grid grid-cols-2 gap-4">
					<TimeInput
						id="lunchStart"
						label="Início Almoço"
						value={workingHours.lunchStart}
						onChange={(v: any) =>
							setWorkingHours({ ...workingHours, lunchStart: v })
						}
					/>
					<TimeInput
						id="lunchEnd"
						label="Fim Almoço"
						value={workingHours.lunchEnd}
						onChange={(v: any) =>
							setWorkingHours({ ...workingHours, lunchEnd: v })
						}
					/>
				</div>
				<Button onClick={onSave} className="w-full">
					Salvar Horários
				</Button>
			</CardContent>
		</Card>
	);
}
