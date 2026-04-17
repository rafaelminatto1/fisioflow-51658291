import type { PhysioDictionaryEntry } from './physioDictionary';

export interface ProtocolPhase {
  name: string;
  duration?: string; // e.g., "1-4 semanas"
  objectives: string[];
  exercises: string[]; // IDs from exerciseDictionary
  criteria: string[];  // IDs from physioDictionary or text
}

export interface ProtocolEntry extends PhysioDictionaryEntry {
  category: 'procedure';
  subcategory: 'Protocolo';
  phases: ProtocolPhase[];
}

export const protocolDictionary: ProtocolEntry[] = [
  {
    id: 'prot_acl',
    pt: 'Reconstrução de LCA (Padrão Ouro)',
    en: 'ACL Reconstruction (Gold Standard)',
    category: 'procedure',
    subcategory: 'Protocolo',
    aliases_pt: ['LCA', 'Cruzado Anterior', 'Pós-op LCA'],
    aliases_en: ['ACL', 'Anterior Cruciate Ligament', 'ACLR'],
    description_pt: 'Protocolo fásico para reabilitação de LCA, focado em retorno seguro ao esporte.',
    phases: [
      {
        name: 'Fase 1: Proteção e Ativação',
        duration: '0-2 semanas',
        objectives: ['Controle de edema', 'Extensão total de joelho', 'Ativação de quadríceps'],
        exercises: ['exd-ativação-vmo', 'exd-agachamento-parede', 'exd-along-panturrilha'],
        criteria: ['Extensão passiva simétrica', 'Controle de derrame articular']
      },
      {
        name: 'Fase 2: Carga e Mobilidade',
        duration: '2-6 semanas',
        objectives: ['Normalização da marcha', 'Equilíbrio unipodal', 'Força inicial'],
        exercises: ['exd-ponte-gluteo', 'exd-agachamento', 'exd-apoio-unipodal', 'exd-step-up'],
        criteria: ['Marcha sem auxílio', 'Flexão de joelho > 110º']
      },
      {
        name: 'Fase 3: Fortalecimento Avançado',
        duration: '6-12 semanas',
        objectives: ['Hipertrofia', 'Controle de valgo dinâmico', 'Potência inicial'],
        exercises: ['exd-agachamento-bulgaro', 'exd-stiff', 'exd-step-down', 'exd-leg-press'],
        criteria: ['LSI (Limb Symmetry Index) > 80% em força']
      },
      {
        name: 'Fase 4: Retorno ao Esporte',
        duration: '12+ semanas',
        objectives: ['Pliometria', 'Mudança de direção', 'Retorno à modalidade'],
        exercises: ['exd-salto-unipodal', 'exd-box-jump', 'exd-jump-squat', 'exd-skipping'],
        criteria: ['Hopping tests > 90% simetria', 'Ausência de medo do movimento']
      }
    ]
  },
  {
    id: 'prot_hernia_lombar',
    pt: 'Gestão de Hérnia de Disco Lombar',
    en: 'Lumbar Disc Herniation Management',
    category: 'procedure',
    subcategory: 'Protocolo',
    aliases_pt: ['Ciatalgia', 'Hérnia Lombar', 'Lombociatalgia'],
    aliases_en: ['Disc Herniation', 'Sciatica', 'Lumbar Radiculopathy'],
    description_pt: 'Protocolo baseado em centralização de sintomas e mobilização neural.',
    phases: [
      {
        name: 'Fase Aguda: Centralização',
        objectives: ['Redução da dor irradiada', 'Educação em dor'],
        exercises: ['exd-mckenzie', 'exd-child-pose', 'exd-respiracao-diafragmatica'],
        criteria: ['Centralização dos sintomas (Sinal de McKenzie)']
      },
      {
        name: 'Fase Subaguda: Mobilidade e Nervo',
        objectives: ['Ganho de ADM de flexão/extensão', 'Deslizamento neural'],
        exercises: ['exd-neuro-ciatico', 'exd-cat-cow', 'exd-dead-bug'],
        criteria: ['Teste de Slump negativo ou melhorado']
      },
      {
        name: 'Fase de Estabilização',
        objectives: ['Fortalecimento do core', 'Retorno às atividades'],
        exercises: ['exd-bird-dog', 'exd-prancha-ventral', 'exd-ponte-gluteo'],
        criteria: ['Estabilidade lombo-pélvica mantida sob carga']
      }
    ]
  },
  {
    id: 'prot_hipermobilidade',
    pt: 'Protocolo de Estabilidade para Hipermobilidade (SED/HSD)',
    en: 'Hypermobility Stability Protocol',
    category: 'procedure',
    subcategory: 'Protocolo',
    aliases_pt: ['SED', 'Hipermobilidade Articular', 'Ehlers-Danlos'],
    aliases_en: ['EDS', 'HSD', 'Joint Hypermobility'],
    description_pt: 'Foco em propriocepção, controle motor e estabilização articular profunda.',
    phases: [
      {
        name: 'Fase 1: Consciência e Isometria',
        objectives: ['Consciência articular', 'Ativação tônica'],
        exercises: ['exd-apoio-unipodal', 'exd-ativação-vmo', 'exd-retração-cervical-isometrica'],
        criteria: ['Controle de hiperestensão durante exercícios']
      },
      {
        name: 'Fase 2: Estabilidade Dinâmica',
        objectives: ['Fortalecimento funcional', 'Propriocepção'],
        exercises: ['exd-pallof-press', 'exd-ponte-unilateral-isom', 'exd-monster-walk'],
        criteria: ['Equilíbrio mantido em superfícies instáveis']
      }
    ]
  }
];
