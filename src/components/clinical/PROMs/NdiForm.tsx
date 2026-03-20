import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Brain } from "lucide-react";

interface NdiSection {
	title: string;
	options: string[];
}

const NDI_SECTIONS: NdiSection[] = [
	{
		title: "1. Intensidade da dor no pescoço",
		options: [
			"Não tenho dor no momento",
			"A dor é muito leve no momento",
			"A dor é moderada no momento",
			"A dor é bastante intensa no momento",
			"A dor é muito intensa no momento",
			"A dor é a pior imaginável",
		],
	},
	{
		title: "2. Cuidados pessoais (lavar-se, vestir-se, etc.)",
		options: [
			"Consigo cuidar de mim normalmente sem causar dor extra",
			"Consigo cuidar de mim normalmente, mas é muito doloroso",
			"Cuidar de mim é doloroso e sou lento e cuidadoso",
			"Necessito de alguma ajuda, mas consigo a maioria dos cuidados pessoais",
			"Necessito de ajuda todos os dias para a maioria dos cuidados pessoais",
			"Não consigo me vestir, lavo-me com dificuldade e fico na cama",
		],
	},
	{
		title: "3. Levantamento de objetos",
		options: [
			"Consigo levantar objetos pesados sem dor extra",
			"Consigo levantar objetos pesados, mas sinto dor extra",
			"A dor me impede de levantar objetos pesados do chão, mas consigo se estiverem em posição conveniente",
			"A dor me impede de levantar objetos pesados, mas consigo levantar objetos leves a moderados",
			"Só consigo levantar objetos muito leves",
			"Não consigo levantar ou carregar nada",
		],
	},
	{
		title: "4. Leitura",
		options: [
			"Consigo ler o quanto quiser sem dor no pescoço",
			"Consigo ler o quanto quiser com leve dor no pescoço",
			"Consigo ler o quanto quiser com dor moderada no pescoço",
			"Não consigo ler o quanto quiser por causa de dor moderada no pescoço",
			"Mal consigo ler por causa de intensa dor no pescoço",
			"Não consigo ler nada",
		],
	},
	{
		title: "5. Cefaleia (dor de cabeça)",
		options: [
			"Não tenho cefaleia",
			"Tenho leves dores de cabeça que aparecem raramente",
			"Tenho dores de cabeça moderadas que aparecem raramente",
			"Tenho dores de cabeça moderadas que aparecem frequentemente",
			"Tenho dores de cabeça intensas que aparecem frequentemente",
			"Tenho dores de cabeça quase todo o tempo",
		],
	},
	{
		title: "6. Concentração",
		options: [
			"Consigo me concentrar plenamente sem dificuldade",
			"Consigo me concentrar plenamente com leve dificuldade",
			"Tenho um grau regular de dificuldade em me concentrar",
			"Tenho muita dificuldade de concentração",
			"Tenho muita dificuldade de concentração",
			"Não consigo me concentrar de jeito algum",
		],
	},
	{
		title: "7. Trabalho",
		options: [
			"Consigo fazer o quanto quiser do meu trabalho",
			"Só consigo fazer meu trabalho habitual, não mais",
			"Consigo fazer a maioria do meu trabalho habitual, mas não mais",
			"Não consigo fazer meu trabalho habitual",
			"Mal consigo fazer qualquer trabalho",
			"Não consigo fazer nenhum trabalho",
		],
	},
	{
		title: "8. Dirigir",
		options: [
			"Consigo dirigir sem dor no pescoço",
			"Consigo dirigir o quanto quiser com leve dor no pescoço",
			"Consigo dirigir o quanto quiser com dor moderada no pescoço",
			"Não consigo dirigir o quanto quiser por causa de dor moderada no pescoço",
			"Mal consigo dirigir por causa de intensa dor no pescoço",
			"Não consigo dirigir",
		],
	},
	{
		title: "9. Dormir",
		options: [
			"Não tenho problemas para dormir",
			"Meu sono é perturbado levemente (menos de 1 h sem dormir)",
			"Meu sono é levemente perturbado (1–2 h sem dormir)",
			"Meu sono é moderadamente perturbado (2–3 h sem dormir)",
			"Meu sono é muito perturbado (3–5 h sem dormir)",
			"Meu sono é completamente perturbado (5–7 h sem dormir)",
		],
	},
	{
		title: "10. Atividades de lazer",
		options: [
			"Consigo fazer todas as atividades de lazer sem dor no pescoço",
			"Consigo fazer todas as atividades de lazer com alguma dor no pescoço",
			"Consigo fazer a maioria das atividades de lazer por causa da dor no pescoço",
			"Não consigo fazer todas as atividades de lazer por causa da dor no pescoço",
			"Mal consigo fazer qualquer atividade de lazer por causa da dor no pescoço",
			"Não consigo fazer nenhuma atividade de lazer",
		],
	},
];

interface NdiFormProps {
	patientId: string;
	sessionId?: string;
	onSave: (score: number, responses: Record<string, unknown>) => void;
	onCancel: () => void;
}

function getNdiInterpretation(score: number): { label: string; color: string } {
	if (score <= 8)
		return { label: "Sem incapacidade", color: "bg-green-100 text-green-800" };
	if (score <= 28)
		return { label: "Incapacidade leve", color: "bg-green-100 text-green-700" };
	if (score <= 48)
		return {
			label: "Incapacidade moderada",
			color: "bg-yellow-100 text-yellow-800",
		};
	if (score <= 64)
		return {
			label: "Incapacidade intensa",
			color: "bg-orange-100 text-orange-800",
		};
	return { label: "Incapacidade completa", color: "bg-red-100 text-red-800" };
}

export function NdiForm({ onSave, onCancel }: NdiFormProps) {
	const [responses, setResponses] = useState<Record<number, number>>({});

	const answeredCount = Object.keys(responses).length;
	const totalSections = NDI_SECTIONS.length;

	const totalScore = Object.values(responses).reduce((sum, v) => sum + v, 0);
	const ndiScore =
		answeredCount === totalSections ? (totalScore / 50) * 100 : null;
	const interpretation =
		ndiScore !== null ? getNdiInterpretation(ndiScore) : null;

	const setResponse = (sectionIndex: number, value: number) => {
		setResponses((prev) => ({ ...prev, [sectionIndex]: value }));
	};

	const handleSubmit = () => {
		if (ndiScore === null) return;
		const responsePayload: Record<string, unknown> = {};
		NDI_SECTIONS.forEach((section, i) => {
			responsePayload[`section_${i + 1}`] = responses[i];
			responsePayload[`section_${i + 1}_title`] = section.title;
		});
		responsePayload.total_raw_score = totalScore;
		onSave(Number(ndiScore.toFixed(1)), responsePayload);
	};

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<Brain className="h-5 w-5 text-indigo-500" />
					<CardTitle className="text-lg">
						Índice de Incapacidade do Pescoço (NDI)
					</CardTitle>
				</div>
				<p className="text-sm text-muted-foreground">
					10 seções sobre limitações por dor cervical. Score = (soma / 50) ×
					100%.
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="rounded-md border bg-blue-50/50 p-3 text-sm text-blue-800">
					<p className="font-medium mb-1">Instrução:</p>
					<p>
						Este questionário foi elaborado para dar informações sobre o quanto
						sua dor no pescoço afetou sua capacidade de realizar atividades do
						dia a dia. Selecione em cada seção apenas a alternativa que melhor
						descreve sua situação hoje.
					</p>
				</div>

				<div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
					{NDI_SECTIONS.map((section, sectionIndex) => (
						<div
							key={sectionIndex}
							className={`rounded-md border p-4 space-y-3 transition-colors ${
								responses[sectionIndex] !== undefined
									? "bg-indigo-50/30 border-indigo-200"
									: "bg-card"
							}`}
						>
							<h3 className="text-sm font-semibold">{section.title}</h3>
							<RadioGroup
								value={responses[sectionIndex]?.toString()}
								onValueChange={(v) => setResponse(sectionIndex, Number(v))}
								className="space-y-1.5"
							>
								{section.options.map((option, optionIndex) => (
									<div key={optionIndex} className="flex items-start gap-2">
										<RadioGroupItem
											value={optionIndex.toString()}
											id={`ndi-s${sectionIndex}-o${optionIndex}`}
											className="mt-0.5 shrink-0"
										/>
										<Label
											htmlFor={`ndi-s${sectionIndex}-o${optionIndex}`}
											className="text-sm font-normal leading-snug cursor-pointer"
										>
											<span className="font-medium text-muted-foreground mr-1.5">
												{optionIndex}
											</span>
											{option}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>
					))}
				</div>

				<div className="rounded-md border bg-muted/30 p-4 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Progresso:</span>
						<span className="text-sm text-muted-foreground">
							{answeredCount}/{totalSections} respondidos
						</span>
					</div>
					{ndiScore !== null && (
						<>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Índice NDI:</span>
								<div className="flex items-center gap-1">
									<span className="text-2xl font-bold tabular-nums">
										{ndiScore.toFixed(1)}
									</span>
									<span className="text-muted-foreground">%</span>
								</div>
							</div>
							{interpretation && (
								<div className="flex items-center gap-2">
									<Badge className={interpretation.color}>
										{interpretation.label}
									</Badge>
									<span className="text-xs text-muted-foreground">
										Pontuação bruta: {totalScore}/50
									</span>
								</div>
							)}
						</>
					)}
				</div>

				<div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
					<p className="font-medium">Interpretação:</p>
					<div className="grid grid-cols-1 gap-0.5 text-muted-foreground text-xs">
						<span>0–8% = Sem incapacidade</span>
						<span>10–28% = Incapacidade leve</span>
						<span>30–48% = Incapacidade moderada</span>
						<span>50–64% = Incapacidade intensa</span>
						<span>{"> 64% = Incapacidade completa"}</span>
					</div>
				</div>

				<div className="flex gap-2 pt-2">
					<Button
						onClick={handleSubmit}
						disabled={answeredCount < totalSections}
						className="flex-1"
					>
						{answeredCount < totalSections
							? `Faltam ${totalSections - answeredCount} seções`
							: `Salvar NDI — ${ndiScore?.toFixed(1)}%`}
					</Button>
					<Button variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
