import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Target } from "lucide-react";

interface PsfsActivity {
	name: string;
	score: number;
}

interface PsfsFormProps {
	patientId: string;
	sessionId?: string;
	onSave: (score: number, responses: Record<string, unknown>) => void;
	onCancel: () => void;
}

function getPsfsInterpretation(score: number): {
	label: string;
	color: string;
} {
	if (score >= 8)
		return { label: "Função excelente", color: "bg-green-100 text-green-800" };
	if (score >= 6)
		return { label: "Boa função", color: "bg-green-100 text-green-700" };
	if (score >= 4)
		return { label: "Função moderada", color: "bg-yellow-100 text-yellow-800" };
	if (score >= 2)
		return { label: "Função limitada", color: "bg-orange-100 text-orange-800" };
	return { label: "Função muito limitada", color: "bg-red-100 text-red-800" };
}

function getScoreColor(score: number): string {
	if (score >= 7) return "text-green-600";
	if (score >= 4) return "text-yellow-600";
	return "text-red-600";
}

export function PsfsForm({ onSave, onCancel }: PsfsFormProps) {
	const [activities, setActivities] = useState<PsfsActivity[]>([
		{ name: "", score: 0 },
		{ name: "", score: 0 },
		{ name: "", score: 0 },
	]);

	const validActivities = activities.filter((a) => a.name.trim() !== "");
	const meanScore =
		validActivities.length > 0
			? validActivities.reduce((sum, a) => sum + a.score, 0) /
				validActivities.length
			: 0;

	const interpretation = getPsfsInterpretation(meanScore);

	const addActivity = () => {
		if (activities.length < 5) {
			setActivities([...activities, { name: "", score: 0 }]);
		}
	};

	const removeActivity = (index: number) => {
		if (activities.length > 3) {
			setActivities(activities.filter((_, i) => i !== index));
		}
	};

	const updateName = (index: number, name: string) => {
		const updated = [...activities];
		updated[index] = { ...updated[index], name };
		setActivities(updated);
	};

	const updateScore = (index: number, score: number) => {
		const updated = [...activities];
		updated[index] = { ...updated[index], score };
		setActivities(updated);
	};

	const handleSubmit = () => {
		const responses: Record<string, unknown> = {};
		activities.forEach((a, i) => {
			responses[`activity_${i + 1}_name`] = a.name;
			responses[`activity_${i + 1}_score`] = a.score;
		});
		responses.activities = activities;
		responses.valid_activity_count = validActivities.length;
		onSave(Number(meanScore.toFixed(1)), responses);
	};

	const canSubmit = validActivities.length >= 1;

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<Target className="h-5 w-5 text-purple-500" />
					<CardTitle className="text-lg">
						Escala Funcional Específica do Paciente (EFEP/PSFS)
					</CardTitle>
				</div>
				<p className="text-sm text-muted-foreground">
					Avaliação de atividades funcionais específicas do paciente. MCID: 2
					pontos (melhora clinicamente significativa).
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="rounded-md border bg-blue-50/50 p-3 text-sm text-blue-800">
					<p className="font-medium mb-1">Instrução:</p>
					<p>
						Identifique até 5 atividades importantes que você tem dificuldade de
						realizar devido ao seu problema. Para cada atividade, indique sua
						capacidade atual de 0 (incapaz) a 10 (sem dificuldade).
					</p>
				</div>

				<div className="space-y-4">
					{activities.map((activity, index) => (
						<div
							key={index}
							className="rounded-md border p-3 space-y-3 bg-card"
						>
							<div className="flex items-center gap-2">
								<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
									{index + 1}
								</span>
								<Input
									placeholder={`Atividade ${index + 1} (ex.: subir escadas, caminhar 500m)`}
									value={activity.name}
									onChange={(e) => updateName(index, e.target.value)}
									className="flex-1"
								/>
								{activities.length > 3 && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => removeActivity(index)}
										className="h-8 w-8 text-muted-foreground hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>

							<div className="space-y-2 px-1">
								<div className="flex justify-between text-xs text-muted-foreground">
									<span>0 — Incapaz</span>
									<span>5 — Dificuldade moderada</span>
									<span>10 — Sem dificuldade</span>
								</div>
								<Slider
									min={0}
									max={10}
									step={1}
									value={[activity.score]}
									onValueChange={([v]) => updateScore(index, v)}
									disabled={!activity.name.trim()}
								/>
								<div className="flex justify-end">
									<span
										className={`text-lg font-bold tabular-nums ${getScoreColor(activity.score)}`}
									>
										{activity.score}/10
									</span>
								</div>
							</div>
						</div>
					))}
				</div>

				{activities.length < 5 && (
					<Button
						variant="outline"
						size="sm"
						onClick={addActivity}
						className="w-full gap-1.5 border-dashed"
					>
						<Plus className="h-4 w-4" />
						Adicionar atividade ({activities.length}/5)
					</Button>
				)}

				{validActivities.length > 0 && (
					<div className="rounded-md border bg-muted/30 p-4 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">
								Pontuação média (PSFS):
							</span>
							<div className="flex items-center gap-2">
								<span
									className={`text-2xl font-bold tabular-nums ${getScoreColor(meanScore)}`}
								>
									{meanScore.toFixed(1)}
								</span>
								<span className="text-muted-foreground">/10</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground">
								Baseado em {validActivities.length} atividade
								{validActivities.length > 1 ? "s" : ""}
							</span>
							<Badge className={interpretation.color}>
								{interpretation.label}
							</Badge>
						</div>
					</div>
				)}

				<div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
					<p className="font-medium">Interpretação:</p>
					<p className="text-muted-foreground">
						MCID = 2 pontos. Uma melhora de 2 ou mais pontos na média indica
						mudança clinicamente significativa para o paciente.
					</p>
				</div>

				<div className="flex gap-2 pt-2">
					<Button
						onClick={handleSubmit}
						disabled={!canSubmit}
						className="flex-1"
					>
						Salvar PSFS — Score: {meanScore.toFixed(1)}/10
					</Button>
					<Button variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
