/**
 * Inference Engine - FisioFlow
 * Motor de suporte à decisão clínica baseado em evidências.
 */

export interface ClinicalSuggestion {
	id: string;
	title: string;
	description: string;
	type: 'warning' | 'info' | 'success';
	testToPerform?: string[]; // IDs de testes sugeridos
	educationalContentId?: string; // Link para a Wiki
}

export interface AssessmentRule {
	condition: (results: Record<string, any>) => boolean;
	suggestion: ClinicalSuggestion;
}

export const clinicalRules: AssessmentRule[] = [
	// REGRAS DE JOELHO
	{
		condition: (results) => results['lachman'] === 'positive',
		suggestion: {
			id: 'sug-lca-instability',
			title: 'Suspeita de Lesão de LCA',
			description: 'Lachman positivo indica alta probabilidade de ruptura do LCA. Considere realizar o teste de Pivot Shift para avaliar instabilidade rotacional.',
			type: 'warning',
			testToPerform: ['pivot_shift'],
			educationalContentId: 'con_lca_injury'
		}
	},
	{
		condition: (results) => results['mcmurray'] === 'positive',
		suggestion: {
			id: 'sug-meniscal-tear',
			title: 'Atenção: Lesão Meniscal',
			description: 'McMurray positivo sugere lesão de menisco. Realize o teste de Thessaly para confirmar o achado funcional.',
			type: 'info',
			testToPerform: ['thessaly'],
			educationalContentId: 'con_meniscal_tear'
		}
	},
	// REGRAS DE QUADRIL
	{
		condition: (results) => results['thomas_test'] === 'positive',
		suggestion: {
			id: 'sug-hip-flexor-tension',
			title: 'Encurtamento de Flexores de Quadril',
			description: 'Teste de Thomas positivo indica tensão no Ilio-psoas ou Reto Femoral. Integre mobilidade de quadril no plano de tratamento.',
			type: 'info',
			educationalContentId: 'con_tendinopathy'
		}
	},
	// REGRAS DE COLUNA
	{
		condition: (results) => results['lasegue'] === 'positive',
		suggestion: {
			id: 'sug-nerve-root-compression',
			title: 'Irritação de Raiz Nervosa',
			description: 'Lasègue positivo entre 30-70° sugere compressão radicular. Realize o teste de Slump para confirmar a neurodinâmica.',
			type: 'warning',
			testToPerform: ['slump'],
			educationalContentId: 'con_sciatica'
		}
	}
];

/**
 * Analisa os resultados atuais da avaliação e retorna sugestões relevantes.
 */
export const getClinicalSuggestions = (results: Record<string, any>): ClinicalSuggestion[] => {
	return clinicalRules
		.filter(rule => rule.condition(results))
		.map(rule => rule.suggestion);
};
