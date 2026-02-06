
// We define a partial type for the template data we want to seed

import { ExerciseTemplate, ExerciseTemplateItem } from '@/hooks/useExerciseTemplates';

export interface DefaultTemplateData extends Omit<ExerciseTemplate, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'created_by'> {
    items: Omit<ExerciseTemplateItem, 'id' | 'template_id' | 'created_at' | 'exercise_id'>[]; // Items contain search criteria or placeholders
}

export const defaultTemplates: DefaultTemplateData[] = [
    {
        name: 'Retorno ao Esporte - LCA (Fase Final)',
        description: 'Protocolo de fase final para retorno ao esporte após reconstrução de LCA. Foco em pliometria, agilidade e força explosiva.',
        category: 'pos_operatorio',
        condition_name: 'LCA - Ligamento Cruzado Anterior',
        template_variant: 'Retorno ao Esporte (6+ meses)',
        items: [
            {
                order_index: 0,
                sets: 3,
                repetitions: 10,
                notes: 'Aquecimento: Trote leve',
                duration: 300 // 5 min
            },
            {
                order_index: 1,
                sets: 3,
                repetitions: 12,
                notes: 'Salto unipodal com aterrissagem estável (box jump unipodal)',
            },
            {
                order_index: 2,
                sets: 3,
                repetitions: 8,
                notes: 'Mudança de direção em Y (Agilidade)',
            },
            {
                order_index: 3,
                sets: 4,
                repetitions: 6,
                notes: 'Agachamento com salto (Jump Squat)',
            }
        ]
    },
    {
        name: 'Fisioterapia Esportiva - Prevenção de Lesões',
        description: 'Exercícios focados em estabilidade de core, propriocepção e fortalecimento excêntrico para atletas.',
        category: 'patologia', // Using general category
        condition_name: 'Prevenção Esportiva',
        template_variant: 'Geral',
        items: [
            {
                order_index: 0,
                sets: 3,
                repetitions: 15,
                notes: 'Prancha frontal com variação',
                duration: 45
            },
            {
                order_index: 1,
                sets: 3,
                repetitions: 10,
                notes: 'Nordic Hamstring Curl (Isquiotibiais)',
            },
            {
                order_index: 2,
                sets: 3,
                repetitions: 12,
                notes: 'Afundo com rotação de tronco',
            }
        ]
    },
    {
        name: 'Coluna Lombar - Fase Aguda',
        description: 'Exercícios de mobilidade e controle motor para lombalgia aguda.',
        category: 'patologia',
        condition_name: 'Lombalgia',
        template_variant: 'Fase Aguda',
        items: [
            {
                order_index: 0,
                sets: 2,
                repetitions: 10,
                notes: 'Gato-Cavalo (Mobilidade)',
            },
            {
                order_index: 1,
                sets: 3,
                repetitions: 10,
                notes: 'Respiração diafragmática ativa',
                duration: 120
            },
            {
                order_index: 2,
                sets: 3,
                repetitions: 5,
                notes: 'Bird-dog (Perdigueiro) - isometria leve',
                duration: 5
            }
        ]
    },
    {
        name: 'Ombro - Manguito Rotador',
        description: 'Fortalecimento de manguito rotador e estabilizadores de escápula.',
        category: 'patologia',
        condition_name: 'Síndrome do Impacto / Tendinite',
        template_variant: 'Fortalecimento Intermediário',
        items: [
            {
                order_index: 0,
                sets: 3,
                repetitions: 12,
                notes: 'Rotação externa com elástico',
            },
            {
                order_index: 1,
                sets: 3,
                repetitions: 12,
                notes: 'Rotação interna com elástico',
            },
            {
                order_index: 2,
                sets: 3,
                repetitions: 15,
                notes: 'YTWL com halteres leves',
            }
        ]
    }
];
