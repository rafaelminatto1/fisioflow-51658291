export interface ClinicalResource {
  id: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
}

export const PROCEDURES: ClinicalResource[] = [
  { id: 'p1', name: 'Liberação Miofascial', category: 'Terapia Manual', description: 'Técnica de pressão sobre os pontos de gatilho.', imageUrl: 'https://media.moocafisio.com.br/illustrations/myofascial_release_illustration.png' },
  { id: 'p2', name: 'Mobilização Articular', category: 'Terapia Manual', description: 'Movimentos lentos e repetitivos na articulação.', imageUrl: 'https://media.moocafisio.com.br/illustrations/joint_mobilization_illustration.png' },
  { id: 'p3', name: 'Eletroterapia (TENS)', category: 'Recursos', description: 'Estimulação elétrica nervosa transcutânea para analgesia.', imageUrl: 'https://media.moocafisio.com.br/illustrations/tens_therapy_illustration.png' },
  { id: 'p4', name: 'Ultrassom Terapêutico', category: 'Recursos', description: 'Uso de ondas sonoras para reparo tecidual.', imageUrl: 'https://media.moocafisio.com.br/illustrations/ultrasound_therapy_illustration.png' },
  { id: 'p5', name: 'Dry Needling', category: 'Terapia Manual', description: 'Agulhamento a seco para inativação de pontos gatilho.', imageUrl: 'https://media.moocafisio.com.br/illustrations/dry_needling_illustration.png' },
  { id: 'p6', name: 'Crioterapia', category: 'Recursos', description: 'Aplicação de gelo para controle de inflamação.', imageUrl: 'https://media.moocafisio.com.br/illustrations/cryotherapy_illustration.png' },
];

export const CLINICAL_TESTS: ClinicalResource[] = [
  { id: 't1', name: 'Teste de Lachman', category: 'Joelho', description: 'Avaliação de integridade do LCA.', imageUrl: 'https://media.moocafisio.com.br/illustrations/lachman_test_illustration.png' },
  { id: 't2', name: 'Teste de Gaveta Anterior', category: 'Joelho', description: 'Verificação de estabilidade do joelho.', imageUrl: 'https://media.moocafisio.com.br/illustrations/anterior_drawer_test_knee.png' },
  { id: 't3', name: 'Teste de Phalen', category: 'Punho', description: 'Avaliação de Síndrome do Túnel do Carpo.', imageUrl: 'https://media.moocafisio.com.br/illustrations/phalen_test_illustration.png' },
  { id: 't4', name: 'Teste de Neer', category: 'Ombro', description: 'Avaliação de impacto subacromial.', imageUrl: 'https://media.moocafisio.com.br/illustrations/neer_test_shoulder_illustration.png' },
  { id: 't5', name: 'Teste de Lasègue', category: 'Coluna', description: 'Avaliação de compressão radicular.', imageUrl: 'https://media.moocafisio.com.br/illustrations/lasegue_test_spine_illustration.png' },
  { id: 't6', name: 'Teste de Jobe', category: 'Ombro', description: 'Avaliação do músculo supraespinhal.', imageUrl: 'https://media.moocafisio.com.br/illustrations/jobe_test_shoulder_illustration.png' },
];
