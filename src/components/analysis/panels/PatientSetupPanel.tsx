import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User2 } from 'lucide-react';

interface PatientSetupPanelProps {
	patientMass: number | null;
	setPatientMass: (val: number | null) => void;
	legLength: number | null;
	setLegLength: (val: number | null) => void;
	runSpeed: number;
	setRunSpeed: (val: number) => void;
	showRunSpeed?: boolean;
	showLegLength?: boolean;
}

export const PatientSetupPanel: React.FC<PatientSetupPanelProps> = ({
	patientMass,
	setPatientMass,
	legLength,
	setLegLength,
	runSpeed,
	setRunSpeed,
	showRunSpeed = true,
	showLegLength = true,
}) => {
	return (
		<Card className="border-none shadow-sm bg-muted/5">
			<CardContent className="p-4 space-y-3">
				<h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
					<User2 className="h-3 w-3" /> Dados do Paciente
				</h4>
				<div className="space-y-2">
					<div>
						<Label className="text-[9px] font-bold uppercase text-muted-foreground">Massa (kg)</Label>
						<Input
							type="number"
							placeholder="ex: 70"
							className="h-7 text-xs font-bold"
							value={patientMass ?? ""}
							onChange={e => setPatientMass(e.target.value ? Number(e.target.value) : null)}
						/>
					</div>
					{showLegLength && (
						<div>
							<Label className="text-[9px] font-bold uppercase text-muted-foreground">Comprimento Perna (cm)</Label>
							<Input
								type="number"
								placeholder="ex: 90 (trocânter→chão)"
								className="h-7 text-xs font-bold"
								value={legLength ?? ""}
								onChange={e => setLegLength(e.target.value ? Number(e.target.value) : null)}
							/>
						</div>
					)}
					{showRunSpeed && (
						<div>
							<Label className="text-[9px] font-bold uppercase text-muted-foreground">Vel. Esteira (m/s)</Label>
							<Input
								type="number"
								step="0.5"
								placeholder="ex: 3.0"
								className="h-7 text-xs font-bold"
								value={runSpeed}
								onChange={e => setRunSpeed(Number(e.target.value) || 3.0)}
							/>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
