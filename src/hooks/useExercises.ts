import { useState, useEffect } from 'react';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  instructions: string;
  video_url?: string;
  image_url?: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration: number; // em minutos
  equipment: string[];
  muscle_groups: string[];
  conditions: string[]; // condições que o exercício trata
  contraindications: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
  usage_count?: number;
}

const MOCK_EXERCISES: Exercise[] = [
  {
    id: '1',
    name: 'Flexão de Braço',
    category: 'Força',
    subcategory: 'Membros Superiores',
    description: 'Exercício para fortalecimento dos músculos peitorais, tríceps e deltoides',
    instructions: 'Posicione-se em prancha, mantenha o corpo reto e desça até quase tocar o chão. Suba controladamente.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20doing%20push%20ups%20exercise%20demonstration%20clean%20background&image_size=square',
    difficulty: 'Intermediário',
    duration: 5,
    equipment: [],
    muscle_groups: ['Peitoral', 'Tríceps', 'Deltoides', 'Core'],
    conditions: ['Fraqueza muscular superior', 'Reabilitação pós-cirúrgica'],
    contraindications: ['Lesão no punho', 'Dor no ombro aguda'],
    tags: ['força', 'funcional', 'sem equipamento'],
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
    usage_count: 45
  },
  {
    id: '2',
    name: 'Agachamento',
    category: 'Força',
    subcategory: 'Membros Inferiores',
    description: 'Exercício fundamental para fortalecimento de quadríceps, glúteos e isquiotibiais',
    instructions: 'Pés na largura dos ombros, desça mantendo os joelhos alinhados com os pés, volte à posição inicial.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20doing%20squat%20exercise%20demonstration%20proper%20form&image_size=square',
    difficulty: 'Iniciante',
    duration: 8,
    equipment: [],
    muscle_groups: ['Quadríceps', 'Glúteos', 'Isquiotibiais', 'Core'],
    conditions: ['Fraqueza muscular inferior', 'Instabilidade de joelho'],
    contraindications: ['Lesão aguda no joelho', 'Dor lombar severa'],
    tags: ['força', 'funcional', 'básico'],
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
    usage_count: 67
  },
  {
    id: '3',
    name: 'Prancha',
    category: 'Estabilização',
    subcategory: 'Core',
    description: 'Exercício isométrico para fortalecimento do core e estabilização do tronco',
    instructions: 'Mantenha o corpo reto apoiado nos antebraços e pés, contraindo o abdômen.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20doing%20plank%20exercise%20core%20strengthening&image_size=square',
    difficulty: 'Intermediário',
    duration: 3,
    equipment: [],
    muscle_groups: ['Core', 'Deltoides', 'Glúteos'],
    conditions: ['Instabilidade lombar', 'Fraqueza do core'],
    contraindications: ['Hérnia discal aguda', 'Gravidez avançada'],
    tags: ['core', 'estabilização', 'isométrico'],
    created_at: '2024-01-16',
    updated_at: '2024-01-16',
    usage_count: 38
  },
  {
    id: '4',
    name: 'Caminhada na Esteira',
    category: 'Cardiovascular',
    subcategory: 'Aeróbico',
    description: 'Exercício cardiovascular de baixo impacto para condicionamento geral',
    instructions: 'Mantenha postura ereta, passos naturais, ajuste velocidade conforme tolerância.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20walking%20on%20treadmill%20cardio%20exercise&image_size=square',
    difficulty: 'Iniciante',
    duration: 20,
    equipment: ['Esteira'],
    muscle_groups: ['Membros Inferiores', 'Sistema Cardiovascular'],
    conditions: ['Descondicionamento', 'Reabilitação cardíaca'],
    contraindications: ['Lesão aguda no pé', 'Instabilidade severa'],
    tags: ['cardio', 'baixo impacto', 'resistência'],
    created_at: '2024-01-17',
    updated_at: '2024-01-17',
    usage_count: 89
  },
  {
    id: '5',
    name: 'Alongamento de Isquiotibiais',
    category: 'Flexibilidade',
    subcategory: 'Membros Inferiores',
    description: 'Alongamento para melhora da flexibilidade posterior da coxa',
    instructions: 'Sentado, estenda uma perna e incline o tronco à frente mantendo as costas retas.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20stretching%20hamstring%20flexibility%20exercise&image_size=square',
    difficulty: 'Iniciante',
    duration: 2,
    equipment: [],
    muscle_groups: ['Isquiotibiais', 'Panturrilha'],
    conditions: ['Rigidez muscular', 'Lombalgia'],
    contraindications: ['Lesão muscular aguda', 'Hérnia discal'],
    tags: ['alongamento', 'flexibilidade', 'relaxamento'],
    created_at: '2024-01-18',
    updated_at: '2024-01-18',
    usage_count: 23
  },
  {
    id: '6',
    name: 'Exercício com Theraband',
    category: 'Força',
    subcategory: 'Resistência Elástica',
    description: 'Fortalecimento com resistência progressiva usando banda elástica',
    instructions: 'Segure a banda, mantenha tensão constante durante todo o movimento.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20using%20resistance%20band%20theraband%20exercise&image_size=square',
    difficulty: 'Intermediário',
    duration: 10,
    equipment: ['Theraband', 'Banda Elástica'],
    muscle_groups: ['Variável'],
    conditions: ['Reabilitação geral', 'Fortalecimento progressivo'],
    contraindications: ['Alergia ao látex'],
    tags: ['resistência', 'progressivo', 'versátil'],
    created_at: '2024-01-19',
    updated_at: '2024-01-19',
    usage_count: 56
  },
  {
    id: '7',
    name: 'Mobilização Cervical',
    category: 'Mobilidade',
    subcategory: 'Coluna Cervical',
    description: 'Exercícios de mobilização para melhora da amplitude cervical',
    instructions: 'Movimentos lentos e controlados em todas as direções, respeitando limites de dor.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20doing%20neck%20mobility%20exercises%20cervical&image_size=square',
    difficulty: 'Iniciante',
    duration: 5,
    equipment: [],
    muscle_groups: ['Músculos Cervicais'],
    conditions: ['Cervicalgia', 'Rigidez cervical'],
    contraindications: ['Instabilidade cervical', 'Vertigem severa'],
    tags: ['mobilidade', 'cervical', 'suave'],
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
    usage_count: 34
  },
  {
    id: '8',
    name: 'Exercício Proprioceptivo',
    category: 'Propriocepção',
    subcategory: 'Equilíbrio',
    description: 'Treinamento de equilíbrio e propriocepção para prevenção de lesões',
    instructions: 'Mantenha-se em pé sobre uma perna, olhos fechados, por 30 segundos.',
    video_url: '',
    image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=person%20doing%20balance%20proprioception%20exercise&image_size=square',
    difficulty: 'Avançado',
    duration: 8,
    equipment: ['Disco de Equilíbrio'],
    muscle_groups: ['Músculos Estabilizadores'],
    conditions: ['Instabilidade articular', 'Prevenção de quedas'],
    contraindications: ['Vertigem severa', 'Instabilidade severa'],
    tags: ['propriocepção', 'equilíbrio', 'prevenção'],
    created_at: '2024-01-21',
    updated_at: '2024-01-21',
    usage_count: 19
  }
];

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>(MOCK_EXERCISES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simula carregamento de dados
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setExercises(MOCK_EXERCISES);
      setLoading(false);
    }, 500);
  }, []);

  const getExercisesByCategory = (category: string) => {
    return exercises.filter(ex => ex.category === category);
  };

  const getExercisesByDifficulty = (difficulty: string) => {
    return exercises.filter(ex => ex.difficulty === difficulty);
  };

  const getExercisesByMuscleGroup = (muscleGroup: string) => {
    return exercises.filter(ex => ex.muscle_groups.includes(muscleGroup));
  };

  const getExercisesByCondition = (condition: string) => {
    return exercises.filter(ex => ex.conditions.includes(condition));
  };

  const searchExercises = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return exercises.filter(ex => 
      ex.name.toLowerCase().includes(lowercaseQuery) ||
      ex.description.toLowerCase().includes(lowercaseQuery) ||
      ex.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      ex.muscle_groups.some(muscle => muscle.toLowerCase().includes(lowercaseQuery))
    );
  };

  const getPopularExercises = () => {
    return exercises.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 5);
  };

  const getCategories = () => {
    return [...new Set(exercises.map(ex => ex.category))];
  };

  const getSubcategories = (category?: string) => {
    const filtered = category ? exercises.filter(ex => ex.category === category) : exercises;
    return [...new Set(filtered.map(ex => ex.subcategory))];
  };

  const getMuscleGroups = () => {
    const allMuscles = exercises.flatMap(ex => ex.muscle_groups);
    return [...new Set(allMuscles)];
  };

  const getEquipment = () => {
    const allEquipment = exercises.flatMap(ex => ex.equipment);
    return [...new Set(allEquipment.filter(eq => eq.length > 0))];
  };

  const getDifficulties = () => {
    return [...new Set(exercises.map(ex => ex.difficulty))];
  };

  return {
    exercises,
    loading,
    error,
    getExercisesByCategory,
    getExercisesByDifficulty,
    getExercisesByMuscleGroup,
    getExercisesByCondition,
    searchExercises,
    getPopularExercises,
    getCategories,
    getSubcategories,
    getMuscleGroups,
    getEquipment,
    getDifficulties
  };
};