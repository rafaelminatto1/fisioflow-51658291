export const PATIENT_DIRECTORY_CLASSIFICATIONS = [
	{ value: "active", label: "Ativos" },
	{ value: "new_patient", label: "Novos" },
	{ value: "at_risk", label: "Em risco" },
	{ value: "completed", label: "Alta / Finalizados" },
] as const;

export const PATIENT_DIRECTORY_PATHOLOGY_STATUSES = [
	{ value: "active", label: "Em tratamento" },
	{ value: "monitoring", label: "Monitoramento" },
	{ value: "treated", label: "Tratada / Alta" },
	{ value: "historical", label: "Histórico" },
] as const;

export const PATIENT_CARE_PROFILE_OPTIONS = [
	{ value: "ortopedico", label: "Ortopédico" },
	{ value: "esportivo", label: "Esportivo" },
	{ value: "pos_operatorio", label: "Pós-operatório" },
	{ value: "prevencao", label: "Prevenção" },
	{ value: "idosos", label: "Idosos" },
] as const;

export const PATIENT_THERAPY_FOCUS_OPTIONS = [
	{ value: "liberacao_miofascial", label: "Liberação miofascial" },
	{ value: "fortalecimento", label: "Fortalecimento" },
	{ value: "retorno_ao_esporte", label: "Retorno ao esporte" },
	{ value: "analgesia", label: "Analgesia" },
	{ value: "mobilidade", label: "Mobilidade" },
	{ value: "estabilidade", label: "Estabilidade" },
] as const;

export const PATIENT_PAYER_MODEL_OPTIONS = [
	{ value: "particular", label: "Particular" },
	{ value: "convenio", label: "Convênio" },
	{ value: "parceria", label: "Parceria" },
	{ value: "terceiro_pagador", label: "Terceiro pagador" },
] as const;

export const PATIENT_FINANCIAL_STATUS_OPTIONS = [
	{ value: "current", label: "Adimplente" },
	{ value: "pending_balance", label: "Saldo pendente" },
	{ value: "in_collection", label: "Em cobrança" },
	{ value: "credit", label: "Crédito" },
	{ value: "uninvoiced", label: "Não faturado" },
] as const;

export const PATIENT_ORIGIN_OPTIONS = [
	{ value: "parceria", label: "Parceria" },
	{ value: "indicacao", label: "Indicação" },
	{ value: "organico", label: "Orgânico" },
	{ value: "campanha", label: "Campanha" },
	{ value: "convenio", label: "Convênio" },
] as const;

export type PatientDirectoryClassification =
	(typeof PATIENT_DIRECTORY_CLASSIFICATIONS)[number]["value"];

export type PatientDirectoryPathologyStatus =
	(typeof PATIENT_DIRECTORY_PATHOLOGY_STATUSES)[number]["value"];

export type PatientCareProfile =
	(typeof PATIENT_CARE_PROFILE_OPTIONS)[number]["value"];

export type PatientTherapyFocus =
	(typeof PATIENT_THERAPY_FOCUS_OPTIONS)[number]["value"];

export type PatientPayerModel =
	(typeof PATIENT_PAYER_MODEL_OPTIONS)[number]["value"];

export type PatientFinancialStatus =
	(typeof PATIENT_FINANCIAL_STATUS_OPTIONS)[number]["value"];

export const PATIENT_CLASSIFICATION_LABELS = Object.fromEntries(
	PATIENT_DIRECTORY_CLASSIFICATIONS.map((option) => [option.value, option.label]),
) as Record<PatientDirectoryClassification, string>;

export const PATIENT_PATHOLOGY_STATUS_LABELS = Object.fromEntries(
	PATIENT_DIRECTORY_PATHOLOGY_STATUSES.map((option) => [
		option.value,
		option.label,
	]),
) as Record<PatientDirectoryPathologyStatus, string>;

export const PATIENT_CARE_PROFILE_LABELS = Object.fromEntries(
	PATIENT_CARE_PROFILE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const PATIENT_THERAPY_FOCUS_LABELS = Object.fromEntries(
	PATIENT_THERAPY_FOCUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const PATIENT_PAYER_MODEL_LABELS = Object.fromEntries(
	PATIENT_PAYER_MODEL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const PATIENT_FINANCIAL_STATUS_LABELS = Object.fromEntries(
	PATIENT_FINANCIAL_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const PATIENT_ORIGIN_LABELS = Object.fromEntries(
	PATIENT_ORIGIN_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;
