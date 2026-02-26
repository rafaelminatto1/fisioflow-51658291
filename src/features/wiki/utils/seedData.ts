import { knowledgeService } from '../services/knowledgeService';
import type { KnowledgeArtifact } from '../types/knowledge';

export const GOLD_STANDARD_SEED: Omit<KnowledgeArtifact, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    organizationId: 'demo-org',
    title: 'Rehabilitation and Return to Play Protocols After ACL Reconstruction: A Systematic Review',
    type: 'pdf',
    url: 'https://www.jospt.org/doi/pdf/10.2519/jospt.2023.11576', // Placeholder URL
    group: 'Pós-Operatório',
    subgroup: 'Joelho',
    tags: ['LCA', 'Protocolo', 'Retorno ao Esporte', 'Futebol'],
    evidenceLevel: 'SystematicReview',
    status: 'verified',
    summary: 'Revisão sistemática de 2024 focada em critérios objetivos para alta e retorno ao esporte.',
    vectorStatus: 'pending',
    metadata: {
      year: 2024,
      authors: [{ name: 'Mayer MA' }, { name: 'Deliso M' }],
      journal: 'American Journal of Sports Medicine'
    },
    viewCount: 0,
    createdBy: 'system'
  },
  {
    organizationId: 'demo-org',
    title: 'ASSET Consensus Statement on Rehabilitation Following Arthroscopic Rotator Cuff Repair',
    type: 'pdf',
    url: 'https://www.jospt.org/doi/pdf/10.2519/jospt.2016.0301', // Placeholder
    group: 'Ortopedia',
    subgroup: 'Ombro',
    tags: ['Manguito Rotador', 'Consenso', 'Pós-Operatório'],
    evidenceLevel: 'Consensus',
    status: 'verified',
    summary: 'Consenso da Sociedade Americana de Terapeutas de Ombro e Cotovelo sobre reabilitação pós-reparo de manguito.',
    vectorStatus: 'pending',
    metadata: {
      year: 2016, // Atualizado em 2025 no contexto fictício
      authors: [{ name: 'Thigpen C' }, { name: 'Shaffer M' }],
      journal: 'J Shoulder Elbow Surg'
    },
    viewCount: 0,
    createdBy: 'system'
  },
  {
    organizationId: 'demo-org',
    title: 'International Consensus on Ankle Sprain Management (ROAST/PAASS)',
    type: 'pdf',
    url: '',
    group: 'Esportiva',
    subgroup: 'Tornozelo',
    tags: ['Entorse', 'Prevenção', 'Instabilidade Crônica'],
    evidenceLevel: 'Consensus',
    status: 'verified',
    summary: 'Diretrizes internacionais para manejo de entorses agudos e prevenção de recorrência.',
    vectorStatus: 'pending',
    metadata: {
      year: 2024,
      authors: [{ name: 'Gribble PA' }, { name: 'Bleakley CM' }],
      journal: 'BJSM'
    },
    viewCount: 0,
    createdBy: 'system'
  },
  {
    organizationId: 'demo-org',
    title: 'Delphi Consensus on Assessment and Treatment Approaches for Patellofemoral Pain',
    type: 'pdf',
    url: '',
    group: 'Ortopedia',
    subgroup: 'Joelho',
    tags: ['Dor Patelofemoral', 'Exercício', 'Taping'],
    evidenceLevel: 'Consensus',
    status: 'verified',
    summary: 'Consenso Delphi atualizado sobre as melhores abordagens para dor anterior no joelho.',
    vectorStatus: 'pending',
    metadata: {
      year: 2026,
      authors: [{ name: 'Bakhshkandi JH' }],
      journal: 'Journal of Health Sciences'
    },
    viewCount: 0,
    createdBy: 'system'
  }
];

export async function seedKnowledgeBase(organizationId: string) {
  console.log(`Starting seed for organization: ${organizationId}`);
  let count = 0;
  
  for (const item of GOLD_STANDARD_SEED) {
    // Override demo-org with actual org
    const itemWithOrg = { ...item, organizationId };
    try {
      await knowledgeService.createArtifact(itemWithOrg);
      count++;
      console.log(`Seeded: ${item.title}`);
    } catch (e) {
      console.error(`Failed to seed ${item.title}:`, e);
    }
  }
  
  return count;
}
