/**
 * Exercise Constants
 * Centralized configuration for exercise filters and options
 */

// ============================================
// BODY PARTS (Partes do Corpo / Membros)
// ============================================
export const BODY_PARTS = [
    // Membros Superiores
    { value: 'ombro', label: 'Ombro' },
    { value: 'cotovelo', label: 'Cotovelo' },
    { value: 'punho_mao', label: 'Punho/Mão' },
    { value: 'manguito_rotador', label: 'Manguito Rotador' },
    // Cervical/Cabeça
    { value: 'cervical', label: 'Coluna Cervical' },
    { value: 'cabeca_pescoco', label: 'Cabeça/Pescoço' },
    // Tronco
    { value: 'toracica', label: 'Coluna Torácica' },
    { value: 'lombar', label: 'Coluna Lombar' },
    { value: 'core', label: 'Core' },
    { value: 'abdomen', label: 'Abdômen' },
    // Membros Inferiores
    { value: 'quadril', label: 'Quadril' },
    { value: 'gluteos', label: 'Glúteos' },
    { value: 'quadriceps', label: 'Quadríceps' },
    { value: 'isquiotibiais', label: 'Isquiotibiais' },
    { value: 'joelho', label: 'Joelho' },
    { value: 'tornozelo_pe', label: 'Tornozelo/Pé' },
    { value: 'panturrilha', label: 'Panturrilha' },
] as const;

export type BodyPart = typeof BODY_PARTS[number]['value'];

// ============================================
// DIFFICULTY LEVELS
// ============================================
export const DIFFICULTY_LEVELS = [
    { value: 'Iniciante', label: 'Iniciante', color: 'emerald' },
    { value: 'Intermediário', label: 'Intermediário', color: 'amber' },
    { value: 'Avançado', label: 'Avançado', color: 'rose' },
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number]['value'];

// ============================================
// CATEGORIES
// ============================================
export const CATEGORIES = [
    { value: 'Fortalecimento', label: 'Fortalecimento', icon: 'dumbbell' },
    { value: 'Alongamento', label: 'Alongamento', icon: 'stretch' },
    { value: 'Mobilidade', label: 'Mobilidade', icon: 'move' },
    { value: 'Equilíbrio', label: 'Equilíbrio', icon: 'scale' },
    { value: 'Propriocepção', label: 'Propriocepção', icon: 'target' },
    { value: 'Cardio', label: 'Cardio', icon: 'heart' },
    { value: 'Respiratório', label: 'Respiratório', icon: 'wind' },
    { value: 'Funcional', label: 'Funcional', icon: 'activity' },
    { value: 'Relaxamento', label: 'Relaxamento', icon: 'moon' },
] as const;

export type Category = typeof CATEGORIES[number]['value'];

// ============================================
// EQUIPMENT (Equipamentos)
// Including home-friendly options for patients
// ============================================
export const EQUIPMENT = [
    // Sem equipamento
    { value: 'peso_corporal', label: 'Peso Corporal', category: 'none', homeFrequency: 'always' },

    // Doméstico (home-friendly) - Para exercícios em casa
    { value: 'toalha', label: 'Toalha', category: 'home', homeFrequency: 'always' },
    { value: 'vassoura_cabo', label: 'Vassoura/Cabo de Madeira', category: 'home', homeFrequency: 'always' },
    { value: 'cadeira', label: 'Cadeira', category: 'home', homeFrequency: 'always' },
    { value: 'parede', label: 'Parede', category: 'home', homeFrequency: 'always' },
    { value: 'garrafa_agua', label: 'Garrafa de Água (como peso)', category: 'home', homeFrequency: 'always' },
    { value: 'travesseiro', label: 'Travesseiro', category: 'home', homeFrequency: 'always' },
    { value: 'escada_degrau', label: 'Escada/Degrau', category: 'home', homeFrequency: 'common' },
    { value: 'tapete', label: 'Tapete/Esteira', category: 'home', homeFrequency: 'always' },
    { value: 'porta', label: 'Porta (para âncora de elástico)', category: 'home', homeFrequency: 'common' },
    { value: 'mesa', label: 'Mesa', category: 'home', homeFrequency: 'common' },
    { value: 'lata_conserva', label: 'Lata de Conserva (como peso)', category: 'home', homeFrequency: 'common' },
    { value: 'mochila_peso', label: 'Mochila com Peso', category: 'home', homeFrequency: 'common' },

    // Elásticos/Faixas (comum em casa e clínica)
    { value: 'faixa_elastica_leve', label: 'Faixa Elástica Leve', category: 'resistance', homeFrequency: 'common' },
    { value: 'faixa_elastica_media', label: 'Faixa Elástica Média', category: 'resistance', homeFrequency: 'common' },
    { value: 'faixa_elastica_forte', label: 'Faixa Elástica Forte', category: 'resistance', homeFrequency: 'common' },
    { value: 'theraband', label: 'Theraband', category: 'resistance', homeFrequency: 'common' },

    // Equipamentos básicos
    { value: 'halter', label: 'Halter', category: 'basic', homeFrequency: 'sometimes' },
    { value: 'caneleira', label: 'Caneleira', category: 'basic', homeFrequency: 'sometimes' },
    { value: 'colchonete', label: 'Colchonete', category: 'basic', homeFrequency: 'common' },
    { value: 'bola_suica', label: 'Bola Suíça', category: 'basic', homeFrequency: 'sometimes' },
    { value: 'bola_pequena', label: 'Bola Pequena', category: 'basic', homeFrequency: 'sometimes' },
    { value: 'rolo_espuma', label: 'Rolo de Espuma (Foam Roller)', category: 'basic', homeFrequency: 'sometimes' },
    { value: 'medicine_ball', label: 'Medicine Ball', category: 'basic', homeFrequency: 'rare' },

    // Equilíbrio e Propriocepção
    { value: 'disco_equilibrio', label: 'Disco de Equilíbrio', category: 'balance', homeFrequency: 'rare' },
    { value: 'bosu', label: 'BOSU', category: 'balance', homeFrequency: 'rare' },
    { value: 'prancha_equilibrio', label: 'Prancha de Equilíbrio', category: 'balance', homeFrequency: 'rare' },

    // Equipamentos de clínica
    { value: 'barra_fixa', label: 'Barra Fixa', category: 'clinic', homeFrequency: 'rare' },
    { value: 'esteira', label: 'Esteira', category: 'clinic', homeFrequency: 'rare' },
    { value: 'bicicleta_ergometrica', label: 'Bicicleta Ergométrica', category: 'clinic', homeFrequency: 'rare' },
    { value: 'maca', label: 'Maca', category: 'clinic', homeFrequency: 'never' },
    { value: 'espelho', label: 'Espelho', category: 'clinic', homeFrequency: 'sometimes' },
] as const;

export type Equipment = typeof EQUIPMENT[number]['value'];

// Helper to get home-friendly equipment only
export const getHomeEquipment = () =>
    EQUIPMENT.filter(e => e.homeFrequency === 'always' || e.homeFrequency === 'common');

// Helper to get value-label pairs for dropdowns
export const getBodyPartsOptions = () => BODY_PARTS.map(b => ({ value: b.label, label: b.label }));
export const getDifficultyOptions = () => DIFFICULTY_LEVELS.map(d => ({ value: d.value, label: d.label }));
export const getCategoryOptions = () => CATEGORIES.map(c => ({ value: c.value, label: c.label }));
export const getEquipmentOptions = () => EQUIPMENT.map(e => ({ value: e.label, label: e.label }));
export const getHomeEquipmentOptions = () => getHomeEquipment().map(e => ({ value: e.label, label: e.label }));

// ============================================
// FILTER PRESETS (Filtros Rápidos)
// ============================================
export const FILTER_PRESETS = [
    {
        id: 'home_exercises',
        label: 'Exercícios para Casa',
        icon: 'home',
        filters: {
            equipment: ['Peso Corporal', 'Toalha', 'Cadeira', 'Parede'],
        },
    },
    {
        id: 'upper_body',
        label: 'Membros Superiores',
        icon: 'hand',
        filters: {
            bodyParts: ['Ombro', 'Cotovelo', 'Punho/Mão', 'Manguito Rotador'],
        },
    },
    {
        id: 'lower_body',
        label: 'Membros Inferiores',
        icon: 'footprints',
        filters: {
            bodyParts: ['Quadril', 'Joelho', 'Tornozelo/Pé', 'Glúteos', 'Quadríceps', 'Isquiotibiais'],
        },
    },
    {
        id: 'spine',
        label: 'Coluna',
        icon: 'bone',
        filters: {
            bodyParts: ['Coluna Cervical', 'Coluna Torácica', 'Coluna Lombar', 'Core'],
        },
    },
    {
        id: 'beginner_friendly',
        label: 'Para Iniciantes',
        icon: 'star',
        filters: {
            difficulty: ['Iniciante'],
        },
    },
] as const;
