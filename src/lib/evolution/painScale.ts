export interface PainScaleData {
	level: number;
	location?: string;
	character?: string;
}

export interface PainHistory {
	date: string;
	level: number;
}

export interface PainTrend {
	direction: "up" | "down" | "same";
	value: number;
	label: string;
}

export const PAIN_LEVELS = [
	{ level: 0, label: "Sem dor", color: "bg-green-500", emoji: "😊" },
	{ level: 1, label: "Mínima", color: "bg-green-400", emoji: "🙂" },
	{ level: 2, label: "Leve", color: "bg-lime-400", emoji: "🙂" },
	{ level: 3, label: "Desconfortável", color: "bg-lime-500", emoji: "😐" },
	{ level: 4, label: "Moderada", color: "bg-yellow-400", emoji: "😐" },
	{ level: 5, label: "Incômoda", color: "bg-yellow-500", emoji: "😕" },
	{ level: 6, label: "Angustiante", color: "bg-orange-400", emoji: "😟" },
	{ level: 7, label: "Muito forte", color: "bg-orange-500", emoji: "😣" },
	{ level: 8, label: "Intensa", color: "bg-red-400", emoji: "😖" },
	{ level: 9, label: "Severa", color: "bg-red-500", emoji: "😫" },
	{ level: 10, label: "Insuportável", color: "bg-red-600", emoji: "🤯" },
] as const;

export const PAIN_LOCATIONS = [
	"Cervical",
	"Torácica",
	"Lombar",
	"Sacral",
	"Ombro D",
	"Ombro E",
	"Cotovelo D",
	"Cotovelo E",
	"Punho D",
	"Punho E",
	"Mão D",
	"Mão E",
	"Quadril D",
	"Quadril E",
	"Joelho D",
	"Joelho E",
	"Tornozelo D",
	"Tornozelo E",
	"Pé D",
	"Pé E",
	"Cabeça",
	"Pescoço",
	"Tórax",
	"Abdome",
] as const;

export const PAIN_CHARACTERS = [
	"Pontada",
	"Queimação",
	"Latejante",
	"Pressão",
	"Formigamento",
	"Fisgada",
	"Cólica",
	"Facada",
	"Irradiada",
	"Localizada",
	"Difusa",
	"Profunda",
] as const;

export const calculatePainTrend = (
	history: PainHistory[],
	currentLevel: number,
): PainTrend | null => {
	if (history.length < 2) return null;
	const lastValue = history[0]?.level ?? currentLevel;
	const prevValue = history[1]?.level ?? lastValue;
	const diff = lastValue - prevValue;

	if (diff < 0)
		return { direction: "down", value: Math.abs(diff), label: "Melhorou" };
	if (diff > 0) return { direction: "up", value: diff, label: "Piorou" };
	return { direction: "same", value: 0, label: "Estável" };
};

export const getPainLevelInfo = (level: number) => {
	const clampedLevel = Math.max(0, Math.min(10, level));
	return PAIN_LEVELS[clampedLevel] || PAIN_LEVELS[0];
};
