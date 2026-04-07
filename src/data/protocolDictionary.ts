import type { PhysioDictionaryEntry } from './physioDictionary';

export const protocolDictionary: PhysioDictionaryEntry[] = [
  {
    id: 'prot_acl',
    pt: 'Reconstrução de LCA',
    en: 'ACL Reconstruction',
    category: 'procedure',
    subcategory: 'Protocolo',
    aliases_pt: ['LCA', 'Cruzado Anterior', 'Pós-op LCA'],
    aliases_en: ['ACL', 'Anterior Cruciate Ligament', 'ACLR'],
    description_pt: 'Protocolo de seguimento para retorno ao esporte pós reconstrução ligamentar.'
  },
  {
    id: 'prot_tkr',
    pt: 'Artroplastia Total de Joelho (ATJ)',
    en: 'Total Knee Replacement (TKR)',
    category: 'procedure',
    subcategory: 'Protocolo',
    aliases_pt: ['ATJ', 'Prótese de joelho', 'Artroplastia'],
    aliases_en: ['TKR', 'TKA', 'Total Knee Arthroplasty'],
    description_pt: 'Gestão da reabilitação fásica após substituição articular e ganho de rolamento.'
  },
  {
    id: 'prot_thr',
    pt: 'Artroplastia Total de Quadril (ATQ)',
    en: 'Total Hip Replacement (THR)',
    category: 'procedure',
    subcategory: 'Protocolo',
    aliases_pt: ['ATQ', 'Prótese de quadril', 'Prótese coxofemoral'],
    aliases_en: ['THR', 'THA', 'Total Hip Arthroplasty'],
    description_pt: 'Protocolo focado em precauções pós-operatórias para evitar luxação protética.'
  },
  {
    id: 'prot_rice',
    pt: 'Protocolo PRICE / POLICE',
    en: 'RICE / POLICE Protocol',
    category: 'procedure',
    subcategory: 'Protocolo',
    aliases_pt: ['PRICE', 'POLICE', 'Gelo', 'Criocompressão', 'Apoio de peso protegido'],
    aliases_en: ['RICE', 'Protection Optimal Load Ice Compression Elevation'],
    description_pt: 'Protocolo sistêmico de contenção aguda inflamátoria musculoesquelética.'
  },
  {
    id: 'prot_rts',
    pt: 'Retorno ao Esporte (RTS)',
    en: 'Return to Sport (RTS)',
    category: 'procedure', // using procedure for protocols for now, or could extend types but procedure fits
    subcategory: 'Protocolo',
    aliases_pt: ['Retorno Esportivo', 'RTS', 'Alta Esportiva', 'Fase 4', 'Pliometria final'],
    aliases_en: ['Rtp', 'Return to play', 'Sports progression'],
    description_pt: 'Critérios funcionais para prever alta clínica ao atletismo ou modalidade específica.'
  }
];
