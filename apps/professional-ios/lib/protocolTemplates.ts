/**
 * Exercise Protocol Templates
 * Pre-defined exercise plans for common conditions
 */


export interface ProtocolTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  duration_weeks: number;
  sessions_per_week: number;
  exercises: ProtocolExercise[];
  goals: string[];
  contraindications?: string[];
}

export interface ProtocolExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rest_time: number;
  hold_time?: number;
  notes?: string;
}

// Protocol templates for common conditions
export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  // Lumbar Pain
  {
    id: 'lumbar_pain_phase1',
    name: 'Lombalgia - Fase 1',
    category: 'Coluna',
    description: 'Protocolo inicial para reabilitação de lombalgia mecânica',
    duration_weeks: 4,
    sessions_per_week: 3,
    goals: [
      'Reduzir dor',
      'Melhorar flexibilidade',
      'Fortalecer core',
      'Educação postural',
    ],
    exercises: [
      { exercise_id: 'cat', exercise_name: 'Gato', sets: 3, reps: 10, rest_time: 60 },
      { exercise_id: 'bird_dog', exercise_name: 'Pássaro', sets: 3, reps: 10, rest_time: 60 },
      { exercise_id: 'pelvic_tilt', exercise_name: 'Inclinação Pélvica', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'glute_bridge', exercise_name: 'Ponte de Glúteo', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'plank', exercise_name: 'Prancha', sets: 3, reps: 30, rest_time: 60, hold_time: 30 },
    ],
    contraindications: ['Dor radicular aguda', 'Instabilidade vertebral'],
  },
  {
    id: 'lumbar_pain_phase2',
    name: 'Lombalgia - Fase 2',
    category: 'Coluna',
    description: 'Protocolo intermediário com fortalecimento progressivo',
    duration_weeks: 4,
    sessions_per_week: 3,
    goals: [
      'Fortalecimento muscular',
      'Estabilidade dinâmica',
      'Prevenção de recorrência',
    ],
    exercises: [
      { exercise_id: 'squat', exercise_name: 'Agachamento', sets: 3, reps: 12, rest_time: 90 },
      { exercise_id: 'deadlift', exercise_name: 'Levantamento Terra', sets: 3, reps: 10, rest_time: 120 },
      { exercise_id: 'lunges', exercise_name: 'Lunges', sets: 3, reps: 12, rest_time: 60 },
      { exercise_id: 'side_plank', exercise_name: 'Prancha Lateral', sets: 3, reps: 30, rest_time: 60, hold_time: 30 },
    ],
  },

  // Shoulder Pain
  {
    id: 'shoulder_impingement',
    name: 'Síndrome do Impacto - Fase 1',
    category: 'Ombro',
    description: 'Protocolo para síndrome do impacto no ombro',
    duration_weeks: 6,
    sessions_per_week: 2,
    goals: [
      'Restaurar amplitude de movimento',
      'Fortalecer manguito rotador',
      'Melhorar função escapular',
    ],
    exercises: [
      { exercise_id: 'pendulum', exercise_name: 'Pêndulo', sets: 3, reps: 15, rest_time: 30 },
      { exercise_id: 'wall_slides', exercise_name: 'Deslizamento na Parede', sets: 3, reps: 10, rest_time: 30 },
      { exercise_id: 'shoulder_flexion', exercise_name: 'Flexão de Ombro', sets: 3, reps: 15, rest_time: 30 },
      { exercise_id: 'external_rotation', exercise_name: 'Rotação Externa', sets: 3, reps: 15, rest_time: 30 },
      { exercise_id: 'scaption', exercise_name: 'Scaption', sets: 3, reps: 10, rest_time: 45 },
    ],
  },

  // Knee Rehabilitation
  {
    id: 'knee_acl_preop',
    name: 'Joelho - Pré-operatório',
    category: 'Joelho',
    description: 'Protocolo preparatório para cirurgia de LCA',
    duration_weeks: 4,
    sessions_per_week: 3,
    goals: [
      'Reduzir edema',
      'Manter amplitude de movimento',
      'Fortalecimento quadríceps',
      'Ganho de controle motor',
    ],
    exercises: [
      { exercise_id: 'quad_sets', exercise_name: 'Extensão de Joelho', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'straight_leg_raise', exercise_name: 'Elevação de Perna Estendida', sets: 3, reps: 15, rest_time: 60 },
      { exercise_id: 'hamstring_curl', exercise_name: 'Flexão de Joelho', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'wall_sit', exercise_name: 'Sentar na Parede', sets: 3, reps: 30, rest_time: 60, hold_time: 30 },
      { exercise_id: 'step_ups', exercise_name: 'Subir Escada', sets: 3, reps: 10, rest_time: 60 },
    ],
  },

  // Knee ACL Post-op
  {
    id: 'knee_acl_postop',
    name: 'Joelho - Pós-operatório LCA',
    category: 'Joelho',
    description: 'Protocolo de reabilitação após reconstrução do LCA',
    duration_weeks: 12,
    sessions_per_week: 3,
    goals: [
      'Fase 1: Proteção e ROM (0-2 sem)',
      'Fase 2: Fortalecimento (2-6 sem)',
      'Fase 3: Função esportiva (6-12 sem)',
    ],
    exercises: [
      { exercise_id: 'quad_sets_isometric', exercise_name: 'Extensão Isométrica', sets: 4, reps: 10, rest_time: 30, hold_time: 6 },
      { exercise_id: 'slr', exercise_name: 'SLR', sets: 3, reps: 10, rest_time: 60 },
      { exercise_id: 'hamstring_curl', exercise_name: 'Flexão de Joelho', sets: 3, reps: 15, rest_time: 60 },
      { exercise_id: 'calf_raises', exercise_name: 'Elevação de Panturrilha', sets: 3, reps: 20, rest_time: 45 },
      { exercise_id: 'single_leg_balance', exercise_name: 'Equilíbrio Unipodal', sets: 3, reps: 30, rest_time: 30, hold_time: 15 },
    ],
  },

  // Neck Pain
  {
    id: 'neck_pain',
    name: 'Cervicalgia - Protocolo',
    category: 'Pescoço',
    description: 'Protocolo para dor cervical e tensão muscular',
    duration_weeks: 3,
    sessions_per_week: 2,
    goals: [
      'Aliviar dor',
      'Melhorar mobilidade',
      'Fortalecer cervicais',
      'Educação ergonômica',
    ],
    exercises: [
      { exercise_id: 'neck_flexion', exercise_name: 'Flexão de Pescoço', sets: 3, reps: 10, rest_time: 30 },
      { exercise_id: 'neck_extension', exercise_name: 'Extensão de Pescoço', sets: 3, reps: 10, rest_time: 30 },
      { exercise_id: 'neck_rotation', exercise_name: 'Rotação de Pescoço', sets: 3, reps: 10, rest_time: 30 },
      { exercise_id: 'shoulder_shrugs', exercise_name: 'Elevação de Ombros', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'chin_tucks', exercise_name: 'Chin Tucks', sets: 3, reps: 15, rest_time: 30 },
    ],
  },

  // Hip Osteoarthritis
  {
    id: 'hip_oa',
    name: 'Artrose de Quadril - Protocolo',
    category: 'Quadril',
    description: 'Protocolo conservador para artrose de quadril',
    duration_weeks: 8,
    sessions_per_week: 2,
    goals: [
      'Reduzir dor',
      'Melhorar mobilidade',
      'Fortalecer musculatura',
      'Melhorar função',
    ],
    exercises: [
      { exercise_id: 'hip_abduction', exercise_name: 'Abdução de Quadril', sets: 3, reps: 12, rest_time: 45 },
      { exercise_id: 'clamshell', exercise_name: 'Concha', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'bridge', exercise_name: 'Ponte', sets: 3, reps: 15, rest_time: 60 },
      { exercise_id: 'side_lying_abduction', exercise_name: 'Abdução Decúbito Lateral', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'standing_wall_push', exercise_name: 'Flexão em Pé', sets: 3, reps: 12, rest_time: 60 },
    ],
    contraindications: ['Artroplastia recente', 'Fratura recentes'],
  },

  // Ankle Sprain
  {
    id: 'ankle_sprain',
    name: 'Entorse de Tornozelo - Protocolo',
    category: 'Tornozelo',
    description: 'Protocolo de reabilitação para entorse de tornozelo',
    duration_weeks: 4,
    sessions_per_week: 2,
    goals: [
      'Fase 1: Reduzir edema e dor (1-2 sem)',
      'Fase 2: Restaurar ROM (3-4 sem)',
      'Fase 3: Fortalecer e prevenir recorrência',
    ],
    exercises: [
      { exercise_id: 'ankle_dorsiflexion', exercise_name: 'Dorsiflexão/Plantiflexão', sets: 3, reps: 15, rest_time: 30 },
      { exercise_id: 'ankle_inversion_eversion', exercise_name: 'Inversão/Eversão', sets: 3, reps: 15, rest_time: 30 },
      { exercise_id: 'ankle_alphabet', exercise_name: 'Alfabeto', sets: 2, reps: 26, rest_time: 30 },
      { exercise_id: 'single_leg_balance', exercise_name: 'Equilíbrio Unipodal', sets: 3, reps: 20, rest_time: 30 },
      { exercise_id: 'calf_raises', exercise_name: 'Elevação de Panturrilha', sets: 3, reps: 20, rest_time: 45 },
    ],
  },

  // Posture Correction
  {
    id: 'posture_correction',
    name: 'Correção Postural - Protocolo',
    category: 'Mobilidade',
    description: 'Protocolo para correção de postura e alinhamento corporal',
    duration_weeks: 6,
    sessions_per_week: 2,
    goals: [
      'Melhorar consciência postural',
      'Fortalecer estabilizadores',
      'Aumentar flexibilidade',
      'Corrigir desequilíbrios',
    ],
    exercises: [
      { exercise_id: 'cat_cow', exercise_name: 'Gato-Vaca', sets: 3, reps: 10, rest_time: 60 },
      { exercise_id: 'child_pose', exercise_name: 'Posição de Criança', sets: 1, reps: 60, rest_time: 0, hold_time: 60 },
      { exercise_id: 'thread_the_needle', exercise_name: 'Passar a Agulha', sets: 3, reps: 10, rest_time: 45 },
      { exercise_id: 'quadruped_rock', exercise_name: 'Balanço em Quatro Apoios', sets: 3, reps: 12, rest_time: 60 },
      { exercise_id: 'wall_angels', exercise_name: 'Anjo na Parede', sets: 3, reps: 12, rest_time: 45 },
    ],
  },

  // Core Stabilization
  {
    id: 'core_stabilization',
    name: 'Core - Estabilização',
    category: 'Core',
    description: 'Protocolo de fortalecimento de core e estabilização',
    duration_weeks: 4,
    sessions_per_week: 3,
    goals: [
      'Fortalecer transverso do abdômen',
      'Estabilizar coluna lombar',
      'Melhorar controle motor',
    ],
    exercises: [
      { exercise_id: 'dead_bug', exercise_name: 'Dead Bug', sets: 3, reps: 12, rest_time: 45 },
      { exercise_id: 'bird_dog', exercise_name: 'Pássaro', sets: 3, reps: 10, rest_time: 45 },
      { exercise_id: 'side_plank', exercise_name: 'Prancha Lateral', sets: 3, reps: 30, rest_time: 45, hold_time: 30 },
      { exercise_id: 'hollow_body_hold', exercise_name: 'Hollow Body Hold', sets: 3, reps: 30, rest_time: 45, hold_time: 30 },
      { exercise_id: 'pallof_press', exercise_name: 'Pallof Press', sets: 3, reps: 10, rest_time: 60 },
    ],
  },

  // Pilates Reformer
  {
    id: 'pilates_reformer_basic',
    name: 'Pilates Clinical - Reformer',
    category: 'Pilates',
    description: 'Série básica de Pilates no Reformer',
    duration_weeks: 6,
    sessions_per_week: 2,
    goals: [
      'Aumentar flexibilidade',
      'Fortalecer centro',
      'Melhorar postura',
      'Coordenação',
    ],
    exercises: [
      { exercise_id: 'footwork', exercise_name: 'Footwork', sets: 3, reps: 10, rest_time: 30 },
      { exercise_id: 'hundred', exercise_name: 'Hundred', sets: 3, reps: 10, rest_time: 60 },
      { exercise_id: 'long_box', exercise_name: 'Long Box', sets: 3, reps: 8, rest_time: 60 },
      { exercise_id: 'short_box', exercise_name: 'Short Box', sets: 3, reps: 10, rest_time: 60 },
      { exercise_id: 'elephant', exercise_name: 'Elephant', sets: 3, reps: 10, rest_time: 45 },
    ],
  },

  // Post-Partum
  {
    id: 'postpartum',
    name: 'Pós-Parto - Recuperação',
    category: 'Mobilidade',
    description: 'Protocolo para recuperação pós-parto',
    duration_weeks: 6,
    sessions_per_week: 2,
    goals: [
      'Recuperar força do core',
      'Reabilitar asso de piso',
      'Aliviar dores lombares',
      'Restaurar função pélvica',
    ],
    exercises: [
      { exercise_id: 'pelvic_floor', exercise_name: 'Asso de Piso', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'transverse_abdominal', exercise_name: 'Abdominal Transverso', sets: 3, reps: 15, rest_time: 45 },
      { exercise_id: 'glute_bridge', exercise_name: 'Ponte de Glúteo', sets: 3, reps: 15, rest_time: 60 },
      { exercise_id: 'modified_plank', exercise_name: 'Prancha Modificada', sets: 3, reps: 20, rest_time: 60 },
      { exercise_id: 'wall_sit', exercise_name: 'Sentar na Parede', sets: 3, reps: 30, rest_time: 60, hold_time: 30 },
    ],
  },
];

/**
 * Get protocol by category
 */
export function getProtocolsByCategory(category: string): ProtocolTemplate[] {
  return PROTOCOL_TEMPLATES.filter(p => p.category === category || p.category === 'Geral');
}

/**
 * Get protocol by ID
 */
export function getProtocolById(id: string): ProtocolTemplate | undefined {
  return PROTOCOL_TEMPLATES.find(p => p.id === id);
}

/**
 * Get all protocol categories
 */
export function getProtocolCategories(): string[] {
  return Array.from(new Set(PROTOCOL_TEMPLATES.map(p => p.category)));
}

/**
 * Search protocols
 */
export function searchProtocols(query: string): ProtocolTemplate[] {
  const lowerQuery = query.toLowerCase();
  return PROTOCOL_TEMPLATES.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get recommended protocols based on patient condition
 */
export function getRecommendedProtocols(condition: string): ProtocolTemplate[] {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('lombalgia') || lowerCondition.includes('coluna') || lowerCondition.includes('dor lombar')) {
    return PROTOCOL_TEMPLATES.filter(p => p.id === 'lumbar_pain_phase1' || p.id === 'lumbar_pain_phase2');
  }

  if (lowerCondition.includes('ombro') || lowerCondition.includes('manguito') || lowerCondition.includes('impacto')) {
    return [PROTOCOL_TEMPLATES.find(p => p.id === 'shoulder_impingement')].filter(Boolean);
  }

  if (lowerCondition.includes('joelho') || lowerCondition.includes('lca') || lowerCondition.includes('menisco')) {
    return PROTOCOL_TEMPLATES.filter(p => p.category === 'Joelho');
  }

  if (lowerCondition.includes('quadril') || lowerCondition.includes('artrose')) {
    return [PROTOCOL_TEMPLATES.find(p => p.id === 'hip_oa')].filter(Boolean);
  }

  if (lowerCondition.includes('pescoço') || lowerCondition.includes('cervical')) {
    return [PROTOCOL_TEMPLATES.find(p => p.id === 'neck_pain')].filter(Boolean);
  }

  if (lowerCondition.includes('tornozelo') || lowerCondition.includes('entorse')) {
    return [PROTOCOL_TEMPLATES.find(p => p.id === 'ankle_sprain')].filter(Boolean);
  }

  if (lowerCondition.includes('gestante') || lowerCondition.includes('pós-parto')) {
    return [PROTOCOL_TEMPLATES.find(p => p.id === 'postpartum')].filter(Boolean);
  }

  if (lowerCondition.includes('postura') || lowerCondition.includes('alinhamento')) {
    return [PROTOCOL_TEMPLATES.find(p => p.id === 'posture_correction')].filter(Boolean);
  }

  if (lowerCondition.includes('core') || lowerCondition.includes('estabilizacao')) {
    return [PROTOCOL_TEMPLATES.find(p => p.id === 'core_stabilization')].filter(Boolean);
  }

  return PROTOCOL_TEMPLATES.slice(0, 3); // Return first 3 protocols as defaults
}
