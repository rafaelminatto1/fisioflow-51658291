export type TemplateDomain = 'knowledge' | 'operations' | 'product' | 'clinical';

export interface TemplateVariable {
  key: string;
  label: string;
  required: boolean;
  defaultValue?: string;
}

export interface WikiTemplateBlueprint {
  id: string;
  name: string;
  description: string;
  domain: TemplateDomain;
  tags: string[];
  variables: TemplateVariable[];
  content: string;
}

// Reference templates inspired by Notion, Evernote, Linear and Obsidian patterns.
export const WIKI_TEMPLATE_CATALOG: WikiTemplateBlueprint[] = [
  {
    id: 'product-prd-v1',
    name: 'PRD Enxuto',
    description: 'Template para especificacao de produto com metas, escopo e riscos.',
    domain: 'product',
    tags: ['prd', 'produto', 'roadmap'],
    variables: [
      { key: 'feature_name', label: 'Nome da Funcionalidade', required: true },
      { key: 'owner', label: 'Responsavel', required: true },
      { key: 'target_date', label: 'Data Alvo', required: false },
    ],
    content: [
      '# PRD - {{feature_name}}',
      '',
      '## 1. Contexto',
      '- Problema:',
      '- Hipotese de valor:',
      '',
      '## 2. Objetivos',
      '- Objetivo principal:',
      '- Metricas de sucesso:',
      '',
      '## 3. Escopo',
      '- In scope:',
      '- Out of scope:',
      '',
      '## 4. Requisitos',
      '- Funcionais:',
      '- Nao funcionais:',
      '',
      '## 5. Riscos e mitigacoes',
      '- Risco:',
      '- Mitigacao:',
      '',
      '## 6. Entregaveis',
      '- Owner: {{owner}}',
      '- Data alvo: {{target_date}}',
    ].join('\n'),
  },
  {
    id: 'incident-postmortem-v1',
    name: 'Postmortem de Incidente',
    description: 'Template para analise de incidentes e plano de prevencao.',
    domain: 'operations',
    tags: ['incidente', 'postmortem', 'confiabilidade'],
    variables: [
      { key: 'incident_title', label: 'Titulo do Incidente', required: true },
      { key: 'date', label: 'Data', required: true },
      { key: 'severity', label: 'Severidade', required: true, defaultValue: 'SEV-2' },
    ],
    content: [
      '# Postmortem - {{incident_title}}',
      '',
      '- Data: {{date}}',
      '- Severidade: {{severity}}',
      '',
      '## Resumo executivo',
      '',
      '## Impacto',
      '- Usuarios afetados:',
      '- Tempo de indisponibilidade:',
      '',
      '## Linha do tempo',
      '- HH:mm Evento',
      '',
      '## Causa raiz',
      '',
      '## Acoes corretivas',
      '- [ ] Acao 1',
      '- [ ] Acao 2',
      '',
      '## Acoes preventivas',
      '- [ ] Acao 1',
      '- [ ] Acao 2',
    ].join('\n'),
  },
  {
    id: 'clinical-protocol-v1',
    name: 'Protocolo Clinico',
    description: 'Template para protocolo de atendimento com evidencias e checklist.',
    domain: 'clinical',
    tags: ['protocolo', 'clinico', 'evidencia'],
    variables: [
      { key: 'protocol_name', label: 'Nome do Protocolo', required: true },
      { key: 'condition', label: 'Condicao Clinica', required: true },
      { key: 'owner', label: 'Responsavel Tecnico', required: true },
    ],
    content: [
      '# Protocolo - {{protocol_name}}',
      '',
      '- Condicao: {{condition}}',
      '- Responsavel tecnico: {{owner}}',
      '',
      '## Indicacao',
      '',
      '## Contraindicacoes',
      '',
      '## Estrutura por fases',
      '### Fase 1',
      '- Objetivos',
      '- Criterios de progressao',
      '',
      '### Fase 2',
      '- Objetivos',
      '- Criterios de progressao',
      '',
      '## Evidencias',
      '- DOI / Link',
      '',
      '## Checklist de seguranca',
      '- [ ] Triagem concluida',
      '- [ ] Termo de consentimento atualizado',
      '- [ ] Plano registrado no prontuario',
    ].join('\n'),
  },
  {
    id: 'meeting-notes-v1',
    name: 'Ata de Reuniao',
    description: 'Template rapido para reunioes com decisoes e acoes.',
    domain: 'operations',
    tags: ['meeting', 'ata', 'decisoes'],
    variables: [
      { key: 'meeting_title', label: 'Titulo da Reuniao', required: true },
      { key: 'date', label: 'Data', required: true },
      { key: 'facilitator', label: 'Facilitador', required: false },
    ],
    content: [
      '# Ata - {{meeting_title}}',
      '',
      '- Data: {{date}}',
      '- Facilitador: {{facilitator}}',
      '',
      '## Participantes',
      '- ',
      '',
      '## Pauta',
      '- ',
      '',
      '## Decisoes',
      '- ',
      '',
      '## Acoes',
      '| Acao | Responsavel | Prazo |',
      '| --- | --- | --- |',
      '| | | |',
    ].join('\n'),
  },
  {
    id: 'knowledge-article-v1',
    name: 'Resumo de Evidencia',
    description: 'Template para registrar resumo de artigo com implicacao clinica.',
    domain: 'knowledge',
    tags: ['evidencia', 'resumo', 'artigo'],
    variables: [
      { key: 'title', label: 'Titulo do Artigo', required: true },
      { key: 'year', label: 'Ano', required: true },
      { key: 'doi', label: 'DOI', required: false },
    ],
    content: [
      '# Resumo de Evidencia - {{title}}',
      '',
      '- Ano: {{year}}',
      '- DOI: {{doi}}',
      '',
      '## Pergunta clinica',
      '',
      '## Metodo',
      '',
      '## Achados principais',
      '- ',
      '',
      '## Implicacao para protocolo interno',
      '',
      '## Nivel de confianca',
      '- Alto / Medio / Baixo',
    ].join('\n'),
  },
];

export function listTemplateCatalog(domain?: TemplateDomain): WikiTemplateBlueprint[] {
  if (!domain) return WIKI_TEMPLATE_CATALOG;
  return WIKI_TEMPLATE_CATALOG.filter((template) => template.domain === domain);
}

export function getTemplateById(templateId: string): WikiTemplateBlueprint | undefined {
  return WIKI_TEMPLATE_CATALOG.find((template) => template.id === templateId);
}
