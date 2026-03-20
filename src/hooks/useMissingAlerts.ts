/**
 * useMissingAlerts - Hook to check for required measurements based on pathology
 *
 * Features:
 * - Checks required measurements by patient pathology
 * - Provides pulsing border alerts
 * - Tooltips explaining "Why do I need this?"
 * - Integrates with patient protocols
 */

import { useMemo } from "react";

export interface MissingAlert {
	id: string;
	field: string;
	severity: "critical" | "high" | "medium";
	message: string;
	explanation: string;
	icon?: string;
}

export interface MissingAlertsConfig {
	pathology?: string;
	sessionNumber?: number;
	patientGoals?: string[];
	activeProtocol?: string;
}

export interface EvolutionData {
	painLevel?: number;
	measurements?: Array<{
		type: string;
		value?: string | number;
	}>;
	exercises?: Array<any>;
}

// Required measurements by pathology
const PATHOLOGY_REQUIREMENTS: Record<
	string,
	Array<{ type: string; sessionEvery?: number; reason: string }>
> = {
	lombalgia: [
		{
			type: "rom_lombar",
			reason: "Avaliar amplitude de movimento da coluna lombar",
		},
		{
			type: "forca_muscular",
			reason: "Avaliar força de core e musculatura paravertebral",
		},
		{
			type: "teste_slr",
			reason: "Teste de elevação da perna reta para compressão radicular",
		},
	],
	lesao_ombro: [
		{
			type: "rom_ombro",
			reason:
				"Avaliar amplitude de movimento do ombro (flexão, abdução, rotação)",
		},
		{ type: "teste_speed", reason: "Teste para lesão de bicipite" },
		{ type: "teste_yergason", reason: "Teste para lesão de bicipite" },
		{ type: "teste_empty_can", reason: "Teste para lesão de manguito rotator" },
	],
	lesao_acl: [
		{ type: "rom_joelho", reason: "Avaliar amplitude de movimento do joelho" },
		{
			type: "teste_lachman",
			reason: "Avaliar instabilidade do ligamento cruzado anterior",
		},
		{
			type: "teste_pivot_shift",
			reason: "Avaliar instabilidade rotacional do joelho",
		},
		{
			type: "circunferencia_joelho",
			reason: "Acompanhar edema e atrofia muscular",
		},
		{
			type: "y_balance",
			sessionEvery: 3,
			reason: "Avaliar equilíbrio funcional e risco de lesão",
		},
	],
	lesao_tornozelo: [
		{
			type: "rom_tornozelo",
			reason: "Avaliar amplitude de movimento do tornozelo",
		},
		{
			type: "teste_garrau",
			reason: "Avaliar instabilidade ligamentar anterior",
		},
		{
			type: "teste_cajado",
			reason: "Avaliar instabilidade ligamentar posterior",
		},
	],
	pos_operatorio: [
		{
			type: "circunferencia_articulacao",
			reason: "Acompanhar edema pós-operatório",
		},
		{
			type: "rom_articulacao",
			reason: "Avaliar recuperação da amplitude de movimento",
		},
		{ type: "forca_muscular", reason: "Avaliar recuperação da força muscular" },
	],
};

// Common critical fields
const CRITICAL_FIELDS = [
	{
		id: "painLevel",
		field: "painLevel",
		name: "Nível de Dor",
		reason: "Essencial para avaliação inicial e acompanhamento",
	},
	{
		id: "patientReport",
		field: "patientReport",
		name: "Relato do Paciente",
		reason: "Informação subjetiva crucial para tratamento",
	},
];

// High importance fields by session
const SESSION_IMPORTANCE: Record<
	number,
	Array<{ id: string; field: string; name: string; reason: string }>
> = {
	1: [
		{
			id: "measurements",
			field: "measurements",
			name: "Mensurações Iniciais",
			reason: "Baseline para comparar progresso",
		},
		{
			id: "procedures",
			field: "procedures",
			name: "Procedimentos Realizados",
			reason: "Documentar intervenções iniciais",
		},
	],
	3: [
		{
			id: "y_balance",
			field: "y_balance",
			name: "Teste Y-Balance",
			reason: "Avaliar risco de lesão e equilíbrio funcional",
		},
	],
	6: [
		{
			id: "measurements",
			field: "measurements",
			name: "Mensurações de Reavaliação",
			reason: "Comparar com baseline inicial",
		},
	],
	12: [
		{
			id: "measurements",
			field: "measurements",
			name: "Mensurações de Progresso",
			reason: "Avaliar evolução após 3 meses",
		},
	],
};

export const useMissingAlerts = (
	evolutionData: EvolutionData,
	config: MissingAlertsConfig = {},
): MissingAlert[] => {
	const { pathology, sessionNumber = 1 } = config;

	const alerts = useMemo(() => {
		const result: MissingAlert[] = [];

		// Check critical fields
		CRITICAL_FIELDS.forEach((fieldConfig) => {
			const value = evolutionData[fieldConfig.field as keyof EvolutionData];
			const isMissing = value === undefined || value === null || value === "";

			if (isMissing) {
				result.push({
					id: fieldConfig.id,
					field: fieldConfig.field,
					severity: "critical",
					message: `${fieldConfig.name} é obrigatório`,
					explanation: fieldConfig.reason,
					icon: "⚠️",
				});
			}
		});

		// Check pathology-specific requirements
		if (pathology && PATHOLOGY_REQUIREMENTS[pathology]) {
			const requirements = PATHOLOGY_REQUIREMENTS[pathology];

			requirements.forEach((req) => {
				// Skip if session-specific requirement doesn't match
				if (req.sessionEvery && sessionNumber % req.sessionEvery !== 0) {
					return;
				}

				const hasMeasurement = evolutionData.measurements?.some(
					(m) => m.type === req.type && m.value !== undefined && m.value !== "",
				);

				if (!hasMeasurement) {
					result.push({
						id: req.type,
						field: `measurements.${req.type}`,
						severity: "high",
						message: `Mensuração ${req.type.replace(/_/g, " ")} recomendada`,
						explanation: req.reason,
						icon: "📏",
					});
				}
			});
		}

		// Check session-specific importance
		const sessionImportance = SESSION_IMPORTANCE[sessionNumber];
		if (sessionImportance) {
			sessionImportance.forEach((fieldConfig) => {
				let isMissing = false;

				if (fieldConfig.field === "measurements") {
					isMissing =
						!evolutionData.measurements ||
						evolutionData.measurements.length === 0;
				} else if (fieldConfig.field === "procedures") {
					isMissing =
						!evolutionData.procedures || evolutionData.procedures.length === 0;
				} else {
					const value = evolutionData[fieldConfig.field as keyof EvolutionData];
					isMissing = value === undefined || value === null || value === "";
				}

				if (isMissing) {
					result.push({
						id: fieldConfig.id,
						field: fieldConfig.field,
						severity: "medium",
						message: `${fieldConfig.name} sugerido para sessão ${sessionNumber}`,
						explanation: fieldConfig.reason,
						icon: "💡",
					});
				}
			});
		}

		return result;
	}, [evolutionData, pathology, sessionNumber]);

	return alerts;
};

// Helper to get alert message by field ID
export const getAlertMessage = (
	fieldId: string,
	alerts: MissingAlert[],
): string | null => {
	const alert = alerts.find((a) => a.id === fieldId);
	return alert?.message || null;
};

// Helper to get alert explanation by field ID
export const getAlertExplanation = (
	fieldId: string,
	alerts: MissingAlert[],
): string | null => {
	const alert = alerts.find((a) => a.id === fieldId);
	return alert?.explanation || null;
};

// Helper to get severity class for styling
export const getSeverityClass = (
	severity: MissingAlert["severity"],
): string => {
	switch (severity) {
		case "critical":
			return "border-rose-500 shadow-[0_0_0_2px_rgba(244,63,94,0.2)] animate-required-pulse";
		case "high":
			return "border-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.15)] animate-pulse-soft";
		case "medium":
			return "border-sky-500/50 shadow-[0_0_0_1px_rgba(14,165,233,0.1)]";
		default:
			return "border-border/20";
	}
};
