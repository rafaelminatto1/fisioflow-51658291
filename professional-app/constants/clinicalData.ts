export interface ClinicalResource {
  id: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
}

export const PROCEDURES: ClinicalResource[] = [
  { id: 'p1', name: 'Liberação Miofascial', category: 'Terapia Manual', description: 'Técnica de pressão sobre os pontos de gatilho.' },
  { id: 'p2', name: 'Mobilização Articular', category: 'Terapia Manual', description: 'Movimentos lentos e repetitivos na articulação.' },
  { id: 'p3', name: 'Eletroterapia (TENS)', category: 'Recursos', description: 'Estimulação elétrica nervosa transcutânea para analgesia.' },
  { id: 'p4', name: 'Ultrassom Terapêutico', category: 'Recursos', description: 'Uso de ondas sonoras para reparo tecidual.' },
  { id: 'p5', name: 'Dry Needling', category: 'Terapia Manual', description: 'Agulhamento a seco para inativação de pontos gatilho.' },
  { id: 'p6', name: 'Crioterapia', category: 'Recursos', description: 'Aplicação de gelo para controle de inflamação.' },
];

export const CLINICAL_TESTS: ClinicalResource[] = [
  { id: 't1', name: 'Teste de Lachman', category: 'Joelho', description: 'Avaliação de integridade do LCA.' },
  { id: 't2', name: 'Teste de Gaveta Anterior', category: 'Joelho', description: 'Verificação de estabilidade do joelho.' },
  { id: 't3', name: 'Teste de Phalen', category: 'Punho', description: 'Avaliação de Síndrome do Túnel do Carpo.' },
  { id: 't4', name: 'Teste de Neer', category: 'Ombro', description: 'Avaliação de impacto subacromial.' },
  { id: 't5', name: 'Teste de Lasègue', category: 'Coluna', description: 'Avaliação de compressão radicular.' },
  { id: 't6', name: 'Teste de Jobe', category: 'Ombro', description: 'Avaliação do músculo supraespinhal.' },
];
