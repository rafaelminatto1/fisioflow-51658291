    Grid3X3, Activity, Heart, Layers, Dumbbell, Target,
    Calendar, Zap, Users
} from 'lucide-react';

// Dados clínicos detalhados dos protocolos
export const PROTOCOL_DETAILS: Record<string, {
    description: string;
    objectives: string[];
    phases: {
        name: string;
        weeks: string;
        goals: string[];
        exercises: string[];
        precautions: string[];
        criteria: string[];
    }[];
    contraindications: string[];
    expectedOutcomes: string[];
    references: string[];
}> = {
    'Reconstrução do LCA': {
        description: 'Protocolo de reabilitação pós-operatória para reconstrução do Ligamento Cruzado Anterior, baseado em evidências científicas atualizadas e guidelines internacionais.',
        objectives: [
            'Restaurar amplitude de movimento completa do joelho',
            'Recuperar força muscular do quadríceps e isquiotibiais',
            'Restabelecer propriocepção e estabilidade dinâmica',
            'Retorno seguro às atividades esportivas'
        ],
        phases: [
            {
                name: 'Fase 1 - Proteção Máxima',
                weeks: '0-2 semanas',
                goals: ['Controle de dor e edema', 'Proteção do enxerto', 'Extensão completa do joelho (0°)', 'Flexão até 90°'],
                exercises: ['Exercícios isométricos de quadríceps', 'Elevação da perna estendida (SLR)', 'Mobilização patelar', 'Bombeamento de tornozelo', 'Flexão passiva assistida'],
                precautions: ['Uso obrigatório de muletas', 'Órtese travada em extensão para marcha', 'Evitar hiperextensão', 'Carga parcial progressiva (50-75%)'],
                criteria: ['Extensão completa atingida', 'Edema controlado', 'Bom controle do quadríceps']
            },
            {
                name: 'Fase 2 - Proteção Moderada',
                weeks: '2-6 semanas',
                goals: ['Flexão 0-120°', 'Marcha normal sem muletas', 'Início do fortalecimento ativo'],
                exercises: ['Mini agachamentos (0-45°)', 'Step ups baixos', 'Leg press (arco limitado)', 'Bicicleta ergométrica (sem resistência)', 'Propriocepção em superfície estável'],
                precautions: ['Evitar exercícios em cadeia cinética aberta com carga', 'Controlar a progressão da carga', 'Monitorar sinais de inflamação'],
                criteria: ['ADM completa', 'Marcha sem claudicação', 'Força do quadríceps >60% do lado contralateral']
            },
            {
                name: 'Fase 3 - Fortalecimento',
                weeks: '6-12 semanas',
                goals: ['Fortalecimento progressivo', 'Propriocepção avançada', 'Início de atividades funcionais'],
                exercises: ['Agachamento progressivo', 'Leg press (arco completo)', 'Exercícios em cadeia cinética aberta (CCA)', 'Propriocepção em superfícies instáveis', 'Caminhada em esteira'],
                precautions: ['Progressão gradual da carga', 'Evitar movimentos rotacionais', 'Monitorar dor e edema'],
                criteria: ['Força do quadríceps >80%', 'Sem dor ou edema após exercícios', 'Boa estabilidade dinâmica']
            },
            {
                name: 'Fase 4 - Retorno ao Esporte',
                weeks: '12-24 semanas',
                goals: ['Retorno gradual às atividades esportivas', 'Força simétrica bilateral', 'Confiança funcional'],
                exercises: ['Corrida progressiva', 'Pliometria básica', 'Exercícios de agilidade', 'Treinamento sport-specific', 'Saltos unipodais'],
                precautions: ['Testes funcionais antes de progredir', 'Retorno gradual ao esporte', 'Continuar programa de prevenção'],
                criteria: ['LSI >90% em todos os testes', 'Hop tests simétricos', 'Clearance psicológica']
            }
        ],
        contraindications: ['Infecção ativa', 'Frouxidão excessiva do enxerto', 'Dor intensa não controlada', 'Edema significativo persistente'],
        expectedOutcomes: ['90-95% retornam às atividades diárias normais', '80-85% retornam ao esporte em nível semelhante', 'Risco de re-ruptura: 5-15% em atletas jovens'],
        references: ['MOON Knee Group Guidelines 2023', 'APTA Clinical Practice Guidelines', 'International Knee Documentation Committee']
    },
    'Tendinopatia do Manguito Rotador': {
        description: 'Protocolo de reabilitação conservadora para tendinopatia do manguito rotador, focando em exercícios progressivos de fortalecimento e controle motor.',
        objectives: ['Reduzir dor e inflamação', 'Restaurar amplitude de movimento', 'Fortalecer manguito rotador e estabilizadores escapulares', 'Retorno funcional às atividades'],
        phases: [
            {
                name: 'Fase 1 - Controle da Dor',
                weeks: '0-2 semanas',
                goals: ['Redução da dor (EVA <4)', 'Controle inflamatório', 'Manter mobilidade'],
                exercises: ['Exercícios pendulares de Codman', 'Automobilização passiva', 'Deslizamento neural', 'Exercícios posturais', 'Crioterapia pós-exercício'],
                precautions: ['Evitar movimentos acima de 90° de elevação', 'Não realizar exercícios com dor >3/10', 'Evitar atividades overhead'],
                criteria: ['Dor em repouso <3/10', 'Sono sem interrupção por dor', 'ADM passiva sem dor']
            },
            {
                name: 'Fase 2 - Mobilidade e Ativação',
                weeks: '2-4 semanas',
                goals: ['ADM ativa completa', 'Ativação do manguito rotador', 'Controle escapular'],
                exercises: ['AROM em todos os planos', 'Isométricos do manguito rotador', 'Exercícios de retração escapular', 'Rotação externa/interna isométrica', 'Ativação do serrátil anterior'],
                precautions: ['Progressão baseada em sintomas', 'Evitar compensações escapulares', 'Manter técnica correta'],
                criteria: ['ADM ativa igual ao lado contralateral', 'Bom ritmo escapuloumeral', 'Sem dor nos isométricos']
            },
            {
                name: 'Fase 3 - Fortalecimento',
                weeks: '4-8 semanas',
                goals: ['Fortalecimento progressivo', 'Resistência muscular', 'Estabilidade dinâmica'],
                exercises: ['Rotação externa com faixa elástica', 'Rotação interna com faixa elástica', 'Elevação lateral até 90°', 'Prone Y, T, W exercises', 'Push-up plus progressivo'],
                precautions: ['Progressão gradual de resistência', 'Evitar fadiga excessiva', 'Manter postura correta'],
                criteria: ['Força >80% do lado contralateral', 'Sem dor durante exercícios', 'Boa tolerância à carga']
            },
            {
                name: 'Fase 4 - Funcional',
                weeks: '8-12 semanas',
                goals: ['Retorno às atividades funcionais', 'Prevenção de recidivas', 'Força e resistência completas'],
                exercises: ['Exercícios pliométricos leves', 'Atividades sport-specific', 'Fortalecimento em cadeia cinética fechada', 'Exercícios de estabilidade dinâmica', 'Programa de manutenção'],
                precautions: ['Retorno gradual às atividades', 'Programa de prevenção contínuo', 'Atenção a sinais de overuse'],
                criteria: ['Força simétrica bilateral', 'Função normal em AVDs', 'Capacidade de realizar atividades ocupacionais']
            }
        ],
        contraindications: ['Ruptura completa do tendão', 'Instabilidade glenoumeral significativa', 'Capsulite adesiva em fase irritável', 'Dor noturna intensa persistente'],
        expectedOutcomes: ['70-80% melhora com tratamento conservador', 'Tempo médio de recuperação: 3-6 meses', 'Manutenção de exercícios reduz recidivas em 50%'],
        references: ['JOSPT Clinical Practice Guidelines 2022', 'Rotator Cuff Disorders Consensus Statement', 'AAOS Evidence-Based Guidelines']
    }
};

// Categorias de protocolos
export const PROTOCOL_CATEGORIES = [
    { id: 'all', label: 'Todos', icon: Grid3X3, color: 'bg-primary', group: 'Geral' },
    { id: 'ombro', label: 'Ombro', icon: Heart, color: 'bg-rose-500', group: 'Membros Superiores' },
    { id: 'cotovelo', label: 'Cotovelo', icon: Activity, color: 'bg-orange-500', group: 'Membros Superiores' },
    { id: 'punho_mao', label: 'Punho/Mão', icon: Layers, color: 'bg-yellow-500', group: 'Membros Superiores' },
    { id: 'coluna', label: 'Coluna', icon: Layers, color: 'bg-purple-500', group: 'Coluna' },
    { id: 'quadril', label: 'Quadril', icon: Target, color: 'bg-amber-500', group: 'Membros Inferiores' },
    { id: 'joelho', label: 'Joelho', icon: Activity, color: 'bg-blue-500', group: 'Membros Inferiores' },
    { id: 'tornozelo', label: 'Tornozelo/Pé', icon: Dumbbell, color: 'bg-emerald-500', group: 'Membros Inferiores' },
];

export const MUSCULATURE_FILTERS = [
    { id: 'manguito', label: 'Manguito Rotador', group: 'Superior' },
    { id: 'biceps', label: 'Bíceps', group: 'Superior' },
    { id: 'triceps', label: 'Tríceps', group: 'Superior' },
    { id: 'trapezio', label: 'Trapézio', group: 'Superior' },
    { id: 'core', label: 'Core / Abdominais', group: 'Tronco' },
    { id: 'paravertebrais', label: 'Paravertebrais', group: 'Tronco' },
    { id: 'quadriceps', label: 'Quadríceps', group: 'Inferior' },
    { id: 'isquiotibiais', label: 'Isquiotibiais', group: 'Inferior' },
    { id: 'gluteos', label: 'Glúteos', group: 'Inferior' },
    { id: 'panturrilha', label: 'Panturrilha', group: 'Inferior' },
];

// Função para categorizar protocolos
export function getProtocolCategory(conditionName: string): string {
    const lower = conditionName.toLowerCase();
    if (lower.includes('joelho') || lower.includes('lca') || lower.includes('lcp') || lower.includes('menisco') || lower.includes('patelar')) return 'joelho';
    if (lower.includes('ombro') || lower.includes('manguito') || lower.includes('rotador') || lower.includes('glenoumeral')) return 'ombro';
    if (lower.includes('cotovelo') || lower.includes('epicondilite')) return 'cotovelo';
    if (lower.includes('punho') || lower.includes('mao') || lower.includes('carpo')) return 'punho_mao';
    if (lower.includes('coluna') || lower.includes('lombar') || lower.includes('cervical') || lower.includes('lombalgia') || lower.includes('cervicalgia')) return 'coluna';
    if (lower.includes('tornozelo') || lower.includes('fascite') || lower.includes('plantar') || lower.includes('pe')) return 'tornozelo';
    if (lower.includes('quadril') || lower.includes('protese') || lower.includes('fetal')) return 'quadril';
    return 'all';
}

// Templates rápidos (valores de count são estáticos; a contagem real vem dos protocolos carregados)
export const QUICK_TEMPLATES = [
    { name: 'Pós-Cirúrgico Ortopédico', icon: Calendar, color: 'from-blue-500 to-cyan-500', count: 8 },
    { name: 'Reabilitação Esportiva', icon: Zap, color: 'from-orange-500 to-amber-500', count: 5 },
    { name: 'Tratamento Conservador', icon: Heart, color: 'from-rose-500 to-pink-500', count: 12 },
    { name: 'Idosos e Geriatria', icon: Users, color: 'from-purple-500 to-violet-500', count: 4 },
];

/** Protocolos iniciais para seed quando a coleção estiver vazia (baseados em PROTOCOL_DETAILS) */
export const SEED_PROTOCOLS_DATA: Array<{
    name: string;
    condition_name: string;
    protocol_type: 'pos_operatorio' | 'patologia';
    weeks_total?: number;
    milestones: unknown[];
    restrictions: unknown[];
    progression_criteria: Record<string, unknown>;
}> = [
    { name: 'Reconstrução do LCA', condition_name: 'Reconstrução do LCA', protocol_type: 'pos_operatorio', weeks_total: 24, milestones: [], restrictions: [], progression_criteria: {} },
    { name: 'Tendinopatia do Manguito Rotador', condition_name: 'Tendinopatia do Manguito Rotador', protocol_type: 'patologia', weeks_total: 12, milestones: [], restrictions: [], progression_criteria: {} },
];
