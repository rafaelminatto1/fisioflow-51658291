import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Bone } from "lucide-react";

interface OswestrySection {
	title: string;
	options: string[];
}

const OSWESTRY_SECTIONS: OswestrySection[] = [
	{
		title: "1. Intensidade da dor",
		options: [
			"Não tenho dor no momento",
			"A dor é muito leve no momento",
			"A dor é moderada no momento",
			"A dor é bastante intensa no momento",
			"A dor é muito intensa no momento",
			"A dor é a pior imaginável no momento",
		],
	},
	{
		title: "2. Cuidados pessoais (lavar-se, vestir-se, etc.)",
		options: [
			"Posso cuidar de mim normalmente sem sentir dor extra",
			"Posso cuidar de mim normalmente mas é doloroso",
			"Cuidar de mim é doloroso e sou lento e cuidadoso",
			"Necessito de alguma ajuda, mas consigo fazer a maioria dos cuidados pessoais",
			"Necessito de ajuda todos os dias para a maioria dos cuidados",
			"Não consigo me vestir, lavo-me com dificuldade e fico na cama",
		],
	},
	{
		title: "3. Levantamento de objetos",
		options: [
			"Posso levantar objetos pesados sem sentir dor extra",
			"Posso levantar objetos pesados mas sinto dor extra",
			"A dor me impede de levantar objetos pesados do chão, mas consigo se estiverem em posição conveniente",
			"A dor me impede de levantar objetos pesados, mas consigo levantar objetos leves a moderados se estiverem em posição conveniente",
			"Só consigo levantar objetos muito leves",
			"Não consigo levantar ou carregar absolutamente nada",
		],
	},
	{
		title: "4. Caminhada",
		options: [
			"A dor não me impede de andar qualquer distância",
			"A dor me impede de andar mais de 1,6 km",
			"A dor me impede de andar mais de 800 m",
			"A dor me impede de andar mais de 400 m",
			"Só consigo andar com bengala ou muletas",
			"Fico na cama a maior parte do tempo e tenho de me arrastar até o banheiro",
		],
	},
	{
		title: "5. Sentar",
		options: [
			"Consigo me sentar em qualquer tipo de cadeira pelo tempo que quiser",
			"Consigo sentar em minha cadeira favorita pelo tempo que quiser",
			"A dor me impede de sentar por mais de 1 hora",
			"A dor me impede de sentar por mais de 30 minutos",
			"A dor me impede de sentar por mais de 10 minutos",
			"A dor me impede de sentar",
		],
	},
	{
		title: "6. Ficar em pé",
		options: [
			"Consigo ficar em pé pelo tempo que quiser sem dor extra",
			"Consigo ficar em pé pelo tempo que quiser mas sinto dor extra",
			"A dor me impede de ficar em pé por mais de 1 hora",
			"A dor me impede de ficar em pé por mais de 30 minutos",
			"A dor me impede de ficar em pé por mais de 10 minutos",
			"A dor me impede de ficar em pé",
		],
	},
	{
		title: "7. Dormir",
		options: [
			"Meu sono não é perturbado por dor",
			"Meu sono é ocasionalmente perturbado por dor",
			"Durmo menos de 6 horas por causa da dor",
			"Durmo menos de 4 horas por causa da dor",
			"Durmo menos de 2 horas por causa da dor",
			"A dor me impede de dormir",
		],
	},
	{
		title: "8. Vida social",
		options: [
			"Minha vida social é normal e não me causa dor extra",
			"Minha vida social é normal mas aumenta o grau de dor",
			"A dor não tem efeito significativo em minha vida social, exceto impedir atividades mais vigorosas",
			"A dor restringiu minha vida social e não saio com tanta frequência",
			"A dor restringiu minha vida social ao lar",
			"Não tenho vida social por causa da dor",
		],
	},
	{
		title: "9. Viagem",
		options: [
			"Posso viajar para qualquer lugar sem dor extra",
			"Posso viajar para qualquer lugar mas sinto dor extra",
			"A dor é intensa mas consigo viajar por mais de 2 horas",
			"A dor me restringe a viagens de menos de 1 hora",
			"A dor me restringe a viagens curtas e necessárias de menos de 30 minutos",
			"A dor me impede de viajar exceto para receber tratamento",
		],
	},
	{
		title: "10. Emprego/trabalho doméstico",
		options: [
			"Minha atividade profissional/doméstica normal não me causa dor extra",
			"Consigo fazer minha atividade habitual, mas me causa dor extra",
			"Consigo fazer a maioria das minhas atividades, mas a dor me impede de fazer as mais vigorosas",
			"A dor me impede de fazer qualquer coisa exceto trabalho leve",
			"A dor me impede de fazer mesmo trabalho leve",
			"A dor me impede de fazer qualquer tipo de trabalho",
		],
	},
];

interface OswestryFormProps {
	patientId: string;
	sessionId?: string;
	onSave: (score: number, responses: Record<string, unknown>) => void;
	onCancel: () => void;
}

function getOswestryInterpretation(score: number): {
	label: string;
	color: string;
} {
	if (score <= 20)
		return {
			label: "Incapacidade mínima",
			color: "bg-green-100 text-green-800",
		};
	if (score <= 40)
		return {
			label: "Incapacidade moderada",
			color: "bg-yellow-100 text-yellow-800",
		};
	if (score <= 60)
		return {
			label: "Incapacidade intensa",
			color: "bg-orange-100 text-orange-800",
		};
	if (score <= 80)
		return { label: "Deficiência grave", color: "bg-red-100 text-red-800" };
	return { label: "Acamado / exagerando", color: "bg-red-200 text-red-900" };
}

export function OswestryForm({ onSave, onCancel }: OswestryFormProps) {
	const [responses, setResponses] = useState<Record<number, number>>({});

	const answeredCount = Object.keys(responses).length;
	const totalSections = OSWESTRY_SECTIONS.length;

	const totalScore = Object.values(responses).reduce((sum, v) => sum + v, 0);
	const denominator = answeredCount * 5;
	const odScore = denominator > 0 ? (totalScore / denominator) * 100 : null;
	const interpretation =
		odScore !== null ? getOswestryInterpretation(odScore) : null;

	const setResponse = (sectionIndex: number, value: number) => {
		setResponses((prev) => ({ ...prev, [sectionIndex]: value }));
	};

	const handleSubmit = () => {
		if (odScore === null) return;
		const responsePayload: Record<string, unknown> = {};
		OSWESTRY_SECTIONS.forEach((section, i) => {
			responsePayload[`section_${i + 1}`] = responses[i];
			responsePayload[`section_${i + 1}_title`] = section.title;
		});
		responsePayload.total_score = totalScore;
		responsePayload.denominator = denominator;
		onSave(Number(odScore.toFixed(1)), responsePayload);
	};

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<Bone className="h-5 w-5 text-orange-500" />
					<CardTitle className="text-lg">
						Índice de Incapacidade de Oswestry (ODI)
					</CardTitle>
				</div>
				<p className="text-sm text-muted-foreground">
					10 seções sobre limitações por dor lombar. Score = (soma / 50) × 100%.
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="rounded-md border bg-blue-50/50 p-3 text-sm text-blue-800">
					<p className="font-medium mb-1">Instrução:</p>
					<p>
						Este questionário foi elaborado para dar informações sobre como a
						dor nas costas ou perna afeta sua capacidade de realizar atividades
						diárias. Por favor, responda a cada seção marcando apenas a opção
						que melhor se aplica a você hoje.
					</p>
				</div>

				<div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
					{OSWESTRY_SECTIONS.map((section, sectionIndex) => (
						<div
							key={sectionIndex}
							className={`rounded-md border p-4 space-y-3 transition-colors ${
								responses[sectionIndex] !== undefined
									? "bg-orange-50/30 border-orange-200"
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
											id={`s${sectionIndex}-o${optionIndex}`}
											className="mt-0.5 shrink-0"
										/>
										<Label
											htmlFor={`s${sectionIndex}-o${optionIndex}`}
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
					{odScore !== null && (
						<>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Índice de Oswestry:</span>
								<div className="flex items-center gap-1">
									<span className="text-2xl font-bold tabular-nums">
										{odScore.toFixed(1)}
									</span>
									<span className="text-muted-foreground">%</span>
								</div>
							</div>
							{interpretation && (
								<Badge className={interpretation.color}>
									{interpretation.label}
								</Badge>
							)}
						</>
					)}
				</div>

				<div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
					<p className="font-medium">Interpretação:</p>
					<div className="grid grid-cols-1 gap-0.5 text-muted-foreground text-xs">
						<span>0–20% = Incapacidade mínima</span>
						<span>21–40% = Incapacidade moderada</span>
						<span>41–60% = Incapacidade intensa</span>
						<span>
							61–80% = Deficiência (interferência em todos os aspectos da vida)
						</span>
						<span>81–100% = Acamado ou exagerando os sintomas</span>
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
							: `Salvar Oswestry — ${odScore?.toFixed(1)}%`}
					</Button>
					<Button variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
