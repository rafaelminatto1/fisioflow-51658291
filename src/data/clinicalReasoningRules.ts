import { physioDictionary } from "./physioDictionary";

export interface ActionRule {
    id: string;
    name: string;
    description: string;
    // Condition to trigger the rule
    condition: {
        fieldLabels: string[]; // Labels of the fields to monitor
        matchValue?: any;      // Specific value to match (e.g., 'Positivo')
        matchAny?: string[];   // Any of these values match
        minValue?: number;     // For numeric/scale fields
        maxValue?: number;
    };
    // Suggested actions
    suggestions: {
        type: 'protocol' | 'exercise' | 'precaution' | 'alert';
        id?: string;           // ID from the respective dictionary
        title: string;
        content: string;
        priority: 'high' | 'medium' | 'low';
    }[];
    reasoning: string;         // Clinical justification
}

export const clinicalReasoningRules: ActionRule[] = [
    {
        id: 'rule-red-flags',
        name: 'Sinais de Alerta (Red Flags)',
        description: 'Detecção de sintomas que exigem cautela ou encaminhamento.',
        condition: {
            fieldLabels: ['Sinais de Alerta', 'Bandeiras Vermelhas', 'Sintomas Neurológicos'],
            matchAny: ['Perda de força súbita', 'Alteração de esfíncter', 'Dor noturna persistente', 'Febre sem causa aparente']
        },
        suggestions: [
            {
                type: 'alert',
                title: 'ENCAMINHAMENTO MÉDICO',
                content: 'Atenção: Sinais de alerta detectados. Recomenda-se avaliação médica imediata ou monitoramento rigoroso.',
                priority: 'high'
            },
            {
                type: 'precaution',
                title: 'Interrupção de Exercícios de Carga',
                content: 'Suspenda exercícios de alta intensidade até a liberação médica.',
                priority: 'high'
            }
        ],
        reasoning: 'A presença de red flags pode indicar patologias sistêmicas ou compressões neurológicas graves que contraindicam a fisioterapia convencional imediata.'
    },
    {
        id: 'rule-de-quervain',
        name: 'Tenosinovite de De Quervain',
        description: 'Sugestões baseadas no teste de Finkelstein.',
        condition: {
            fieldLabels: ['Testes de Punho/Mão', 'Objetivo: Exame Físico e Testes'],
            matchValue: 'Finkelstein Positivo'
        },
        suggestions: [
            {
                type: 'exercise',
                id: 'exd-glide-tendineo',
                title: 'Deslizamento Tendíneo (Longo do Polegar)',
                content: 'Mobilização suave para reduzir o atrito no primeiro compartimento extensor.',
                priority: 'medium'
            },
            {
                type: 'precaution',
                title: 'Proteção do Polegar',
                content: 'Evite movimentos repetitivos de pinça e desvio ulnar sustentado.',
                priority: 'high'
            }
        ],
        reasoning: 'O teste de Finkelstein positivo é indicativo de irritação dos tendões do abdutor longo e extensor curto do polegar.'
    },
    {
        id: 'rule-achilles-rupture',
        name: 'Suspeita de Ruptura de Aquiles',
        description: 'Teste de Thompson positivo.',
        condition: {
            fieldLabels: ['Testes de Tornozelo', 'Integridade do Tendão de Aquiles'],
            matchValue: 'Thompson Positivo'
        },
        suggestions: [
            {
                type: 'alert',
                title: 'SUSPEITA DE RUPTURA TOTAL',
                content: 'Teste de Thompson positivo indica perda de continuidade do tendão. Encaminhar para ortopedia.',
                priority: 'high'
            },
            {
                type: 'precaution',
                title: 'Imobilização em Equino',
                content: 'Manter o tornozelo em leve flexão plantar para evitar estresse na área da lesão.',
                priority: 'high'
            }
        ],
        reasoning: 'A ausência de flexão plantar ao comprimir a panturrilha (Thompson) é um sinal clássico de ruptura total do tendão de Aquiles.'
    },
    {
        id: 'rule-cervical-radiculopathy-advanced',
        name: 'Radiculopatia Cervical (Wainner)',
        description: 'Cluster completo de Wainner.',
        condition: {
            fieldLabels: ['Testes de Cervical'],
            matchAny: ['Cluster de Wainner Positivo', 'ULTT A Positivo']
        },
        suggestions: [
            {
                type: 'exercise',
                id: 'exd-chin-tuck',
                title: 'Chin Tuck (Retração Cervical)',
                content: 'Fortalecimento de flexores profundos e melhora do alinhamento cervical.',
                priority: 'high'
            },
            {
                type: 'alert',
                title: 'Foco em Centralização',
                content: 'Priorize movimentos que centralizem a dor e reduzam os sintomas distais nos braços.',
                priority: 'high'
            }
        ],
        reasoning: 'O cluster de Wainner tem alta acurácia diagnóstica quando 3 ou 4 testes são positivos.'
    },
    {
        id: 'rule-lca-instability',
        name: 'Instabilidade de LCA detectada',
        description: 'Sugestões baseadas em testes positivos para LCA.',
        condition: {
            fieldLabels: ['Instabilidade Ligamentar (LCA/LCP)', 'Objetivo: Exame Físico e Testes'],
            matchAny: ['Lachman Positivo', 'Gaveta Anterior Positiva', 'Pivot-Shift Positivo']
        },
        suggestions: [
            {
                type: 'protocol',
                id: 'prot_lca_preop',
                title: 'Protocolo Pré-Operatório LCA',
                content: 'Foco em controle de edema, ganho de ADM de extensão e ativação de quadríceps.',
                priority: 'high'
            },
            {
                type: 'exercise',
                id: 'exd-quads-isometric',
                title: 'Isometria de Quadríceps',
                content: 'Fundamental para evitar a inibição artrogênica do quadríceps no pré-op.',
                priority: 'high'
            },
            {
                type: 'precaution',
                title: 'Restrição de Cadeia Aberta',
                content: 'Evitar exercícios de extensão de joelho em cadeia aberta (0-45º) para reduzir estresse no enxerto/ligamento.',
                priority: 'high'
            }
        ],
        reasoning: 'Testes de Lachman ou Gaveta Anterior positivos indicam alta probabilidade de lesão do Ligamento Cruzado Anterior.'
    },

    {
        id: 'rule-meniscus-tear',
        name: 'Suspeita de Lesão Meniscal',
        description: 'Achados sugestivos de ruptura de menisco.',
        condition: {
            fieldLabels: ['Testes de Menisco'],
            matchAny: ['McMurray Positivo', 'Thessaly Positivo', 'Apley Compressão Positivo']
        },
        suggestions: [
            {
                type: 'protocol',
                id: 'prot_menisco_conservador',
                title: 'Protocolo Meniscal Conservador',
                content: 'Progressão gradual de carga e controle de sintomas compressivos.',
                priority: 'medium'
            },
            {
                type: 'alert',
                title: 'Cuidado com Pivoteio',
                content: 'Evitar atividades de alto impacto ou mudanças bruscas de direção na fase inicial.',
                priority: 'medium'
            }
        ],
        reasoning: 'A combinação de dor na interlinha articular com testes compressivos positivos (McMurray/Thessaly) aumenta a especificidade diagnóstica.'
    },
    {
        id: 'rule-central-sensitization',
        name: 'Risco de Sensibilização Central',
        description: 'Escore de CSI indicativo de hipersensibilidade do SNC.',
        condition: {
            fieldLabels: ['Inventário de Sensibilização Central (CSI)'],
            minValue: 40
        },
        suggestions: [
            {
                type: 'alert',
                title: 'Padrão Nociplástico',
                content: 'Considere o uso de PNE (Neurociência da Dor) e evite condutas puramente passivas.',
                priority: 'high'
            },
            {
                type: 'exercise',
                title: 'Exposição Gradativa',
                content: 'Implemente exercícios aeróbicos leves e exposição gradual a movimentos temidos.',
                priority: 'high'
            }
        ],
        reasoning: 'Pontuação acima de 40 no CSI correlaciona-se com quadros de sensibilização central e dor persistente.'
    },
    {
        id: 'rule-systemic-hypermobility',
        name: 'Hipermobilidade Sistêmica',
        description: 'Escore de Beighton elevado.',
        condition: {
            fieldLabels: ['Escore de Beighton (0-9)'],
            minValue: 5
        },
        suggestions: [
            {
                type: 'alert',
                title: 'Treino de Estabilidade',
                content: 'Priorize o controle motor e estabilidade articular sobre o alongamento passivo.',
                priority: 'medium'
            },
            {
                type: 'precaution',
                title: 'Evitar Yoga/Alongamentos Extremos',
                content: 'Pacientes hipermóveis devem evitar o fim da amplitude passiva sem controle muscular.',
                priority: 'medium'
            }
        ],
        reasoning: 'Um escore de Beighton >= 5 em adultos indica hipermobilidade articular sistêmica, exigindo maior foco em estabilização.'
    },
    {
        id: 'rule-cervical-radiculopathy',
        name: 'Radiculopatia Cervical',
        description: 'Cluster de Wainner positivo.',
        condition: {
            fieldLabels: ['Cluster de Wainner (Radiculopatia)'],
            matchAny: ['Spurling Positivo', 'Distração Cervical Positiva']
        },
        suggestions: [
            {
                type: 'alert',
                title: 'Foco em Descompressão',
                content: 'Considere técnicas de tração manual e exercícios de centralização de sintomas.',
                priority: 'high'
            }
        ],
        reasoning: 'O teste de Spurling e o de Distração são os componentes mais específicos do cluster de Wainner para radiculopatia.'
    },
    {
        id: 'rule-shoulder-impingement',
        name: 'Impacto Subacromial (Cluster)',
        description: 'Cluster de Hawkins-Kennedy, Arco Doloroso e Infraspinatus.',
        condition: {
            fieldLabels: ['Testes de Impacto e Labrum', 'Objetivo: Exame Físico e Testes'],
            matchAny: ['Neer Positivo', 'Hawkins-Kennedy Positivo', 'Arco Doloroso Positivo']
        },
        suggestions: [
            {
                type: 'exercise',
                title: 'Serrátil Punch & Wall Slides',
                content: 'Foco em controle escapular para aumentar o espaço subacromial.',
                priority: 'medium'
            },
            {
                type: 'alert',
                title: 'Evitar Elevação em RI',
                content: 'Reduzir movimentos de elevação com rotação interna para evitar pinçamento.',
                priority: 'medium'
            }
        ],
        reasoning: 'A positividade em múltiplos testes de impacto sugere redução do espaço subacromial ou tendinopatia do manguito.'
    },
    {
        id: 'rule-ankle-instability',
        name: 'Instabilidade Lateral de Tornozelo',
        description: 'Gaveta anterior ou Talar Tilt positivo.',
        condition: {
            fieldLabels: ['Instabilidade Ligamentar (Tornozelo)'],
            matchAny: ['Gaveta Anterior Positiva', 'Talar Tilt Positivo']
        },
        suggestions: [
            {
                type: 'protocol',
                id: 'prot_tornozelo_estabilidade',
                title: 'Protocolo de Estabilidade de Tornozelo',
                content: 'Foco em fortalecimento de fibulares e propriocepção.',
                priority: 'high'
            },
            {
                type: 'exercise',
                id: 'exd-apoio-unipodal',
                title: 'Treino de Equilíbrio Unipodal',
                content: 'Manter estabilidade em um pé por 30-45 segundos.',
                priority: 'high'
            }
        ],
        reasoning: 'Sinais de frouxidão ligamentar lateral exigem reabilitação sensório-motora agressiva para evitar entorses recorrentes.'
    },
    {
        id: 'rule-low-back-derangement',
        name: 'Padrão de Deranjamento Lombar',
        description: 'Centralização de sintomas com extensão.',
        condition: {
            fieldLabels: ['Preferência Direcional / McKenzie', 'Resposta aos Movimentos Repetidos'],
            matchAny: ['Centralização com Extensão', 'Melhora com Extensão']
        },
        suggestions: [
            {
                type: 'exercise',
                id: 'exd-mckenzie',
                title: 'Extensão de McKenzie (Prone Press-up)',
                content: 'Realizar 10 repetições a cada 2 horas para manter a centralização.',
                priority: 'high'
            },
            {
                type: 'precaution',
                title: 'Evitar Flexão Sustentada',
                content: 'Evite posturas de flexão prolongada (ex: sentar relaxado) na fase aguda.',
                priority: 'medium'
            }
        ],
        reasoning: 'A centralização dos sintomas com movimentos de extensão é o indicador mais forte de bom prognóstico no método McKenzie.'
    },
    {
        id: 'rule-patellofemoral-pain',
        name: 'Dor Patelofemoral',
        description: 'Cluster de dor anterior no joelho.',
        condition: {
            fieldLabels: ['Testes de Patela / Fêmur', 'Objetivo: Exame Físico e Testes'],
            matchAny: ['Teste de Clarke Positivo', 'Apprehension Test Positivo', 'Dor ao Agachamento']
        },
        suggestions: [
            {
                type: 'exercise',
                id: 'exd-monster-walk',
                title: 'Monster Walk (Glúteo Médio)',
                content: 'O fortalecimento de quadril é superior ao foco isolado no joelho para DPF.',
                priority: 'high'
            },
            {
                type: 'exercise',
                id: 'exd-step-down',
                title: 'Step-Down Excêntrico',
                content: 'Treinar o controle de descida para evitar o valgo dinâmico.',
                priority: 'medium'
            }
        ],
        reasoning: 'Diretrizes atuais recomendam o fortalecimento de posterolateral de quadril como pilar para o tratamento da dor patelofemoral.'
    },
    {
        id: 'rule-lateral-epicondylitis',
        name: 'Epicondilalgia Lateral (Cotovelo de Tenista)',
        description: 'Dor à extensão resistida de punho.',
        condition: {
            fieldLabels: ['Testes de Cotovelo'],
            matchAny: ['Teste de Cozen Positivo', 'Teste de Mill Positivo']
        },
        suggestions: [
            {
                type: 'exercise',
                id: 'exd-flexbar-tyler',
                title: 'Tyler Twist (Excêntrico)',
                content: 'Exercícios excêntricos para extensores de punho apresentam melhor evidência.',
                priority: 'high'
            },
            {
                type: 'precaution',
                title: 'Modificação de Pegada',
                content: 'Evite carregar objetos com o antebraço em pronação.',
                priority: 'medium'
            }
        ],
        reasoning: 'O estímulo mecânico controlado via exercícios excêntricos promove a remodelação tendínea na epicondilite lateral.'
    },
    {
        id: 'rule-progression-lca',
        name: 'Progressão de LCA detectada',
        description: 'Sugestão de avanço de fase após melhora de critérios clínicos.',
        condition: {
            fieldLabels: ['Instabilidade Ligamentar (LCA/LCP)'],
            matchAny: ['Estável', 'Negativo']
        },
        suggestions: [
            {
                type: 'protocol',
                id: 'prot_acl',
                title: 'Avançar Protocolo LCA (Fase 2)',
                content: 'Critérios de estabilidade atingidos. Iniciar carga progressiva e treino de marcha.',
                priority: 'high'
            }
        ],
        reasoning: 'Quando os testes de gaveta e Lachman se tornam negativos ou estáveis, o foco deve migrar da proteção para a carga funcional.'
    }
];
