export interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    unit?: string;
    required: boolean;
    enabled: boolean;
    options?: string[]; // For select type
    description?: string;
    category?: 'basic' | 'advanced';
}

export const DEFAULT_MEASUREMENT_FIELDS: CustomField[] = [
    {
        id: 'measurement_name',
        label: 'Nome da Medição',
        type: 'text',
        required: true,
        enabled: true,
        description: 'Ex: Flexão do joelho direito',
        category: 'basic'
    },
    {
        id: 'value',
        label: 'Valor',
        type: 'number',
        required: true,
        enabled: true,
        description: 'Valor numérico da medição',
        category: 'basic'
    },
    {
        id: 'unit',
        label: 'Unidade',
        type: 'text',
        required: false,
        enabled: true,
        description: 'Ex: graus, cm, kg',
        category: 'basic'
    },
    {
        id: 'side',
        label: 'Lado',
        type: 'select',
        required: false,
        enabled: false,
        options: ['Esquerdo', 'Direito', 'Bilateral'],
        description: 'Lado do corpo avaliado',
        category: 'basic'
    },
    {
        id: 'comparison_value',
        label: 'Valor de Comparação',
        type: 'number',
        required: false,
        enabled: false,
        description: 'Para comparar com outro lado',
        category: 'advanced'
    },
    {
        id: 'notes',
        label: 'Observações',
        type: 'textarea',
        required: false,
        enabled: true,
        description: 'Anotações adicionais',
        category: 'basic'
    },
    {
        id: 'pain_level',
        label: 'Nível de Dor (EVA)',
        type: 'number',
        required: false,
        enabled: false,
        unit: '0-10',
        description: 'Escala Visual Analógica',
        category: 'advanced'
    },
    {
        id: 'repetitions',
        label: 'Repetições',
        type: 'number',
        required: false,
        enabled: false,
        description: 'Número de repetições realizadas',
        category: 'advanced'
    },
];
