// Mock data centralizado para desenvolvimento e testes

import { AppointmentBase, AppointmentType, AppointmentStatus } from '@/types/appointment';
import { Patient } from '@/types';

// ============= PACIENTES MOCK =============
export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'João Silva Santos',
    email: 'joao.silva@email.com',
    phone: '(11) 98765-4321',
    cpf: '123.456.789-00',
    birthDate: '1985-05-15',
    gender: 'masculino',
    address: 'Rua das Flores, 123 - São Paulo/SP',
    emergencyContact: '(11) 98765-1234',
    emergencyContactRelationship: 'Esposa',
    medicalHistory: 'Histórico de lesão no joelho direito em 2019. Praticante de corrida.',
    mainCondition: 'Dor lombar crônica',
    status: 'Em Tratamento',
    progress: 65,
    insurancePlan: 'Unimed',
    insuranceNumber: '123456789',
    profession: 'Engenheiro',
    allergies: 'Nenhuma alergia conhecida',
    medications: 'Ibuprofeno 400mg (uso eventual)',
    weight: 78,
    height: 175,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2025-01-10T14:30:00Z'
  },
  {
    id: '2',
    name: 'Maria Oliveira Costa',
    email: 'maria.oliveira@email.com',
    phone: '(11) 97654-3210',
    cpf: '987.654.321-00',
    birthDate: '1990-08-22',
    gender: 'feminino',
    address: 'Av. Paulista, 1000 - São Paulo/SP',
    emergencyContact: '(11) 97654-9999',
    emergencyContactRelationship: 'Mãe',
    medicalHistory: 'Cirurgia de LCA em 2022. Retorno ao esporte.',
    mainCondition: 'Reabilitação pós-cirúrgica LCA',
    status: 'Recuperação',
    progress: 85,
    insurancePlan: 'Bradesco Saúde',
    insuranceNumber: '987654321',
    profession: 'Professora',
    allergies: 'Dipirona',
    medications: 'Nenhuma medicação regular',
    weight: 62,
    height: 165,
    createdAt: '2024-02-20T09:00:00Z',
    updatedAt: '2025-01-10T16:45:00Z'
  },
  {
    id: '3',
    name: 'Carlos Eduardo Ferreira',
    email: 'carlos.ferreira@email.com',
    phone: '(11) 96543-2109',
    cpf: '456.789.123-00',
    birthDate: '1978-12-10',
    gender: 'masculino',
    address: 'Rua Augusta, 500 - São Paulo/SP',
    emergencyContact: '(11) 96543-8888',
    emergencyContactRelationship: 'Irmão',
    medicalHistory: 'Tendinite crônica no ombro. Praticante de natação.',
    mainCondition: 'Tendinite do manguito rotador',
    status: 'Em Tratamento',
    progress: 45,
    insurancePlan: 'SulAmérica',
    insuranceNumber: '456123789',
    profession: 'Arquiteto',
    allergies: 'Penicilina',
    medications: 'Ômega 3, Colágeno tipo II',
    weight: 85,
    height: 180,
    createdAt: '2024-03-10T11:30:00Z',
    updatedAt: '2025-01-09T10:20:00Z'
  },
  {
    id: '4',
    name: 'Ana Paula Rodrigues',
    email: 'ana.rodrigues@email.com',
    phone: '(11) 95432-1098',
    cpf: '321.654.987-00',
    birthDate: '1995-03-18',
    gender: 'feminino',
    address: 'Rua Consolação, 800 - São Paulo/SP',
    emergencyContact: '(11) 95432-7777',
    emergencyContactRelationship: 'Pai',
    medicalHistory: 'Escoliose diagnosticada aos 14 anos. Pilates regular.',
    mainCondition: 'Escoliose torácica',
    status: 'Inicial',
    progress: 20,
    insurancePlan: 'Amil',
    insuranceNumber: '321987654',
    profession: 'Designer Gráfica',
    allergies: 'Látex',
    medications: 'Nenhuma',
    weight: 58,
    height: 168,
    createdAt: '2024-12-28T08:00:00Z',
    updatedAt: '2025-01-08T15:10:00Z'
  },
  {
    id: '5',
    name: 'Roberto Santos Lima',
    email: 'roberto.lima@email.com',
    phone: '(11) 94321-0987',
    cpf: '789.123.456-00',
    birthDate: '1982-07-25',
    gender: 'masculino',
    address: 'Av. Rebouças, 300 - São Paulo/SP',
    emergencyContact: '(11) 94321-6666',
    emergencyContactRelationship: 'Esposa',
    medicalHistory: 'Hérnia de disco L4-L5. Tratamento conservador.',
    mainCondition: 'Hérnia de disco lombar',
    status: 'Em Tratamento',
    progress: 55,
    insurancePlan: 'Porto Seguro Saúde',
    insuranceNumber: '789456123',
    profession: 'Contador',
    allergies: 'Nenhuma',
    medications: 'Pregabalina 75mg, Ciclobenzaprina 10mg',
    weight: 92,
    height: 178,
    createdAt: '2024-04-15T13:00:00Z',
    updatedAt: '2025-01-09T11:40:00Z'
  }
];

// Helper para gerar UUID v4 simples
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ============= AGENDAMENTOS MOCK =============
const generateAppointmentsForWeek = (): AppointmentBase[] => {
  try {
    const today = new Date();
    const appointments: AppointmentBase[] = [];

    // Validar que mockPatients é um array
    if (!Array.isArray(mockPatients) || mockPatients.length === 0) {
      console.error('mockPatients não é um array ou está vazio');
      return [];
    }

    const types: AppointmentType[] = [
      'Consulta Inicial',
      'Fisioterapia',
      'Reavaliação',
      'Consulta de Retorno',
      'Avaliação Funcional',
      'Terapia Manual',
      'Pilates Clínico'
    ];

    const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

    // Gerar agendamentos para os próximos 14 dias
    for (let dayOffset = -7; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);

      // Pular finais de semana
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // 2-4 agendamentos por dia
      const appointmentsPerDay = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < appointmentsPerDay; i++) {
        const patientIndex = Math.floor(Math.random() * mockPatients.length);
        const patient = mockPatients[patientIndex];
        if (!patient) continue;

        const timeIndex = Math.floor(Math.random() * times.length);
        const time = times[timeIndex];
        if (!time) continue;

        const typeIndex = Math.floor(Math.random() * types.length);
        const type = types[typeIndex];
        if (!type) continue;

        let status: AppointmentStatus;
        if (dayOffset < 0) {
          status = Math.random() > 0.3 ? 'concluido' : 'cancelado';
        } else if (dayOffset === 0) {
          status = Math.random() > 0.5 ? 'confirmado' : 'em_andamento';
        } else {
          status = Math.random() > 0.3 ? 'confirmado' : 'agendado';
        }

        const appointmentDate = new Date(date);
        if (isNaN(appointmentDate.getTime())) continue;

        appointments.push({
          id: generateUUID(),
          patientId: patient.id,
          patientName: patient.name,
          phone: patient.phone || '',
          date: appointmentDate,
          time: time,
          duration: type === 'Consulta Inicial' ? 90 : 60,
          type: type,
          status: status,
          notes: status === 'cancelado' ? 'Paciente solicitou cancelamento' :
                 type === 'Consulta Inicial' ? 'Primeira consulta - anamnese completa' :
                 'Sessão regular de tratamento',
          createdAt: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        });
      }
    }

    // Validar que appointments ainda é um array antes de chamar sort
    if (!Array.isArray(appointments)) {
      console.error('appointments não é um array antes do sort');
      return [];
    }

    return appointments.sort((a, b) => {
      const aTime = a.date?.getTime() ?? 0;
      const bTime = b.date?.getTime() ?? 0;
      const dateCompare = aTime - bTime;
      if (dateCompare !== 0) return dateCompare;
      const aTimeStr = String(a.time ?? '');
      const bTimeStr = String(b.time ?? '');
      return aTimeStr.localeCompare(bTimeStr);
    });
  } catch (error) {
    console.error('Erro ao gerar agendamentos mock:', error);
    return [];
  }
};

export const mockAppointments = generateAppointmentsForWeek();

// ============= EXERCÍCIOS MOCK =============
export const mockExercises = [
  {
    id: 'ex-1',
    name: 'Prancha Abdominal',
    category: 'fortalecimento' as const,
    difficulty: 'intermediario' as const,
    duration: '30-60 segundos',
    description: 'Exercício isométrico para fortalecimento do core e estabilização lombar',
    instructions: '1. Posicione-se em quatro apoios\n2. Apoie os antebraços no chão\n3. Estenda as pernas mantendo o corpo alinhado\n4. Mantenha a posição sem deixar o quadril cair',
    targetMuscles: ['Reto abdominal', 'Transverso do abdômen', 'Multífidos'],
    equipment: ['Tapete'],
    contraindications: 'Hérnia abdominal não tratada, gravidez avançada',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ex-2',
    name: 'Ponte Glútea',
    category: 'fortalecimento' as const,
    difficulty: 'iniciante' as const,
    duration: '3 séries de 15 repetições',
    description: 'Fortalecimento de glúteos e isquiotibiais, ativação da cadeia posterior',
    instructions: '1. Deite de costas com joelhos flexionados\n2. Pés apoiados no chão, largura dos ombros\n3. Eleve o quadril até alinhar com joelhos e ombros\n4. Contraia glúteos no topo do movimento\n5. Desça controladamente',
    targetMuscles: ['Glúteo máximo', 'Isquiotibiais', 'Paravertebrais lombares'],
    equipment: ['Tapete'],
    contraindications: 'Dor lombar aguda',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ex-3',
    name: 'Alongamento de Isquiotibiais',
    category: 'alongamento' as const,
    difficulty: 'iniciante' as const,
    duration: '30 segundos cada perna',
    description: 'Alongamento da cadeia posterior da coxa para aumentar flexibilidade',
    instructions: '1. Sente-se no chão com uma perna estendida\n2. Outra perna flexionada com pé apoiado na coxa\n3. Incline o tronco para frente mantendo as costas retas\n4. Mantenha a posição sem forçar',
    targetMuscles: ['Isquiotibiais', 'Gastrocnêmio'],
    equipment: ['Tapete'],
    contraindications: 'Lesão aguda nos isquiotibiais',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ex-4',
    name: 'Mobilidade Torácica',
    category: 'mobilidade' as const,
    difficulty: 'iniciante' as const,
    duration: '10 repetições',
    description: 'Melhora da mobilidade da coluna torácica e rotação',
    instructions: '1. Posição de quatro apoios\n2. Uma mão atrás da cabeça\n3. Rotacione o tronco abrindo o cotovelo para o teto\n4. Retorne à posição inicial\n5. Repita do outro lado',
    targetMuscles: ['Músculos rotadores do tronco', 'Eretores da espinha'],
    equipment: ['Tapete'],
    contraindications: 'Dor aguda na coluna torácica',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ex-5',
    name: 'Agachamento Livre',
    category: 'fortalecimento' as const,
    difficulty: 'intermediario' as const,
    duration: '3 séries de 12 repetições',
    description: 'Fortalecimento de membros inferiores e core',
    instructions: '1. Pés na largura dos ombros\n2. Desça flexionando joelhos e quadril\n3. Mantenha as costas retas\n4. Desça até 90° de flexão de joelho\n5. Retorne à posição inicial',
    targetMuscles: ['Quadríceps', 'Glúteos', 'Isquiotibiais', 'Core'],
    equipment: [],
    contraindications: 'Lesão aguda no joelho, dor lombar aguda',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ex-6',
    name: 'Respiração Diafragmática',
    category: 'respiratorio' as const,
    difficulty: 'iniciante' as const,
    duration: '5 minutos',
    description: 'Exercício de consciência respiratória e ativação do diafragma',
    instructions: '1. Deite de costas ou sente confortavelmente\n2. Uma mão no peito, outra no abdômen\n3. Inspire pelo nariz expandindo o abdômen\n4. Expire pela boca esvaziando o abdômen\n5. Mantenha o peito relativamente imóvel',
    targetMuscles: ['Diafragma', 'Músculos intercostais'],
    equipment: [],
    contraindications: 'Nenhuma',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ex-7',
    name: 'Equilíbrio Unipodal',
    category: 'equilibrio' as const,
    difficulty: 'intermediario' as const,
    duration: '3 séries de 30 segundos cada perna',
    description: 'Treino de propriocepção e equilíbrio em uma perna',
    instructions: '1. Fique em pé apoiado em uma perna\n2. Flexione levemente o joelho de apoio\n3. Mantenha o equilíbrio sem apoiar a outra perna\n4. Braços podem ajudar no equilíbrio\n5. Progrida fechando os olhos',
    targetMuscles: ['Estabilizadores do tornozelo', 'Core', 'Glúteo médio'],
    equipment: [],
    contraindications: 'Entorse de tornozelo agudo, vertigem severa',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ex-8',
    name: 'Alongamento Cat-Cow',
    category: 'mobilidade' as const,
    difficulty: 'iniciante' as const,
    duration: '10 repetições',
    description: 'Mobilização da coluna vertebral em flexão e extensão',
    instructions: '1. Posição de quatro apoios\n2. Inspire arqueando as costas (vaca)\n3. Expire arredondando as costas (gato)\n4. Movimento fluido e controlado\n5. Sincronize com a respiração',
    targetMuscles: ['Músculos paravertebrais', 'Abdominais'],
    equipment: ['Tapete'],
    contraindications: 'Cirurgia recente na coluna',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// ============= EVENTOS MOCK =============
export const mockEventos = [
  {
    id: 'evt-1',
    nome: 'Corrida de São Silvestre 2025',
    descricao: 'Atendimento fisioterapêutico na tradicional corrida de São Silvestre',
    categoria: 'corrida',
    local: 'Avenida Paulista - São Paulo/SP',
    data_inicio: '2025-12-31',
    data_fim: '2025-12-31',
    status: 'AGENDADO',
    gratuito: false,
    link_whatsapp: 'https://wa.me/5511999999999',
    valor_padrao_prestador: 250,
    created_at: '2024-10-15T10:00:00Z',
    updated_at: '2025-01-10T14:30:00Z'
  },
  {
    id: 'evt-2',
    nome: 'Maratona de São Paulo 2025',
    descricao: 'Posto de atendimento com massagem e quick massage pré e pós corrida',
    categoria: 'corrida',
    local: 'Parque do Ibirapuera - São Paulo/SP',
    data_inicio: '2025-06-15',
    data_fim: '2025-06-15',
    status: 'AGENDADO',
    gratuito: false,
    link_whatsapp: 'https://wa.me/5511988888888',
    valor_padrao_prestador: 300,
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2025-01-08T16:45:00Z'
  },
  {
    id: 'evt-3',
    nome: 'Ação Corporativa - Empresa XYZ',
    descricao: 'Ginástica laboral e avaliação postural para colaboradores',
    categoria: 'corporativo',
    local: 'Escritório XYZ - Av. Faria Lima, 1000',
    data_inicio: '2025-02-10',
    data_fim: '2025-02-14',
    status: 'EM_ANDAMENTO',
    gratuito: false,
    link_whatsapp: 'https://wa.me/5511977777777',
    valor_padrao_prestador: 180,
    created_at: '2024-11-20T11:30:00Z',
    updated_at: '2025-01-09T10:20:00Z'
  },
  {
    id: 'evt-4',
    nome: 'Feira de Saúde e Bem-Estar',
    descricao: 'Stand de avaliações fisioterapêuticas gratuitas',
    categoria: 'feira',
    local: 'Shopping Morumbi - São Paulo/SP',
    data_inicio: '2025-03-20',
    data_fim: '2025-03-22',
    status: 'AGENDADO',
    gratuito: true,
    link_whatsapp: 'https://wa.me/5511966666666',
    valor_padrao_prestador: 150,
    created_at: '2024-12-28T08:00:00Z',
    updated_at: '2025-01-08T15:10:00Z'
  },
  {
    id: 'evt-5',
    nome: 'Triathlon Ironman Brazil',
    descricao: 'Suporte fisioterapêutico completo durante o evento',
    categoria: 'corrida',
    local: 'Florianópolis/SC',
    data_inicio: '2025-05-25',
    data_fim: '2025-05-25',
    status: 'AGENDADO',
    gratuito: false,
    link_whatsapp: 'https://wa.me/5548955555555',
    valor_padrao_prestador: 350,
    created_at: '2024-11-10T13:00:00Z',
    updated_at: '2025-01-09T11:40:00Z'
  },
  {
    id: 'evt-6',
    nome: 'Workshop de Ergonomia - Empresa ABC',
    descricao: 'Workshop sobre ergonomia no trabalho e prevenção de lesões',
    categoria: 'corporativo',
    local: 'Sede Empresa ABC - Av. Paulista, 500',
    data_inicio: '2025-02-28',
    data_fim: '2025-02-28',
    status: 'AGENDADO',
    gratuito: false,
    link_whatsapp: 'https://wa.me/5511944444444',
    valor_padrao_prestador: 200,
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-10T09:15:00Z'
  },
  {
    id: 'evt-7',
    nome: 'Corrida Noturna 2024',
    descricao: 'Atendimento finalizado com sucesso',
    categoria: 'corrida',
    local: 'Parque Villa-Lobos - São Paulo/SP',
    data_inicio: '2024-11-20',
    data_fim: '2024-11-20',
    status: 'CONCLUIDO',
    gratuito: false,
    link_whatsapp: 'https://wa.me/5511933333333',
    valor_padrao_prestador: 220,
    created_at: '2024-09-15T14:00:00Z',
    updated_at: '2024-11-21T10:00:00Z'
  },
  {
    id: 'evt-8',
    nome: 'Caminhada pela Saúde 2025',
    descricao: 'Evento comunitário com avaliações gratuitas',
    categoria: 'acao_social',
    local: 'Parque da Juventude - São Paulo/SP',
    data_inicio: '2025-04-07',
    data_fim: '2025-04-07',
    status: 'AGENDADO',
    gratuito: true,
    link_whatsapp: null,
    valor_padrao_prestador: 0,
    created_at: '2025-01-02T09:30:00Z',
    updated_at: '2025-01-10T08:45:00Z'
  }
];

// ============= ESTATÍSTICAS MOCK =============
export const mockStats = {
  totalPatients: mockPatients.length,
  activePatients: mockPatients.filter(p => p.status === 'Em Tratamento').length,
  totalAppointments: Array.isArray(mockAppointments) ? mockAppointments.length : 0,
  todayAppointments: Array.isArray(mockAppointments) ? mockAppointments.filter(apt => {
    const today = new Date();
    return apt.date?.toDateString() === today.toDateString();
  }).length : 0,
  confirmedAppointments: Array.isArray(mockAppointments) ? mockAppointments.filter(apt => apt.status === 'confirmado').length : 0,
  completedAppointments: Array.isArray(mockAppointments) ? mockAppointments.filter(apt => apt.status === 'concluido').length : 0
};
