/**
 * AI Action Plan Generator Edge Function
 * Generates comprehensive action plans using AI based on clinic analytics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
interface ActionPlanRequest {
  organization_id?: string;
  focus_area: 'occupancy' | 'acquisition' | 'retention' | 'revenue' | 'all';
  time_horizon: 'immediate' | 'short' | 'medium' | 'long';
  constraints?: {
    budget?: 'low' | 'medium' | 'high';
    team_size?: number;
    available_resources?: string[];
  };
}

interface ActionStep {
  title: string;
  description: string;
  expected_impact: string;
  effort: 'easy' | 'medium' | 'hard';
  timeline: string;
  steps: string[];
  resources?: string[];
  estimated_cost?: string;
}

interface ActionPlan {
  summary: {
    focus_area: string;
    time_horizon: string;
    total_actions: number;
    estimated_impact: string;
    estimated_timeline: string;
  };
  priority_actions: Array<{
    order: number;
    title: string;
    description: string;
    expected_impact: string;
    effort: string;
    timeline: string;
    steps: string[];
  }>;
  quick_wins: Array<{
    title: string;
    description: string;
    impact: string;
    effort: 'low';
    timeline: string;
  }>;
  long_term_strategies: Array<{
    title: string;
    description: string;
    impact: string;
    effort: 'medium' | 'high';
    timeline: string;
  }>;
  kpis_to_track: string[];
  review_date: string;
}

// ============================================================================
// ACTION PLAN TEMPLATES
// ============================================================================

const ACTION_TEMPLATES: Record<string, ActionStep[]> = {
  occupancy: [
    {
      title: 'Otimizar Horários com Baixa Ocupação',
      description: 'Implementar estratégias para preencher horários vagos na agenda',
      expected_impact: 'Aumentar taxa de ocupação em 15-25%',
      effort: 'medium',
      timeline: '2-4 semanas',
      steps: [
        'Identificar os 5 horários com menor ocupação',
        'Criar pacotes promocionais para esses horários',
        'Enviar SMS para pacientes inativos com oferta especial',
        'Monitorar ocupação semanalmente',
        'Ajustar estratégia baseado em resultados',
      ],
      resources: ['Ferramenta de SMS', 'Sistema de agendamento'],
      estimated_cost: 'Baixo - principalmente tempo da equipe',
    },
    {
      title: 'Implementar Sistema de Lista de Espera Inteligente',
      description: 'Oferecer automaticamente horários que abrem para pacientes em espera',
      expected_impact: 'Reduzir vagas não preenchidas em 30%',
      effort: 'medium',
      timeline: '3-6 semanas',
      steps: [
        'Configurar notificações para horários que abrem',
        'Criar lista de espera por horário preferido',
        'Implementar sistema de oferta automática',
        'Treinar equipe no processo',
        'Comunicar benefícios aos pacientes',
      ],
      resources: ['Sistema de notificações', 'Atualizações no software'],
      estimated_cost: 'Médio - desenvolvimento interno',
    },
    {
      title: 'Campanha "Hora Feliz" - Horários com Menos Demanda',
      description: 'Oferecer descontos progressivos para horários específicos',
      expected_impact: 'Aumentar ocupação em horários de baixa demanda em 20-30%',
      effort: 'easy',
      timeline: 'Imediato - 1 semana para implementar',
      steps: [
        'Definir horários elegíveis (ex: Segunda 14h-16h)',
        'Definir percentual de desconto (10-20%)',
        'Criar materiais de marketing',
        'Divulgar nas redes sociais e WhatsApp',
        'Monitorar resultados semanalmente',
      ],
      resources: ['Redes sociais', 'WhatsApp Business', 'Materiais gráficos'],
      estimated_cost: 'Baixo - principalmente comunicação',
    },
  ],
  acquisition: [
    {
      title: 'Campanha de Avaliação Gratuita',
      description: 'Oferecer primeira avaliação gratuita para atrair novos pacientes',
      expected_impact: 'Aumentar captação em 30-50% no curto prazo',
      effort: 'medium',
      timeline: '4-8 semanas',
      steps: [
        'Definir critérios de elegibilidade',
        'Criar página de landing para campanha',
        'Configurar sistema de agendamento online',
        'Treinar equipe para conversão',
        'Implementar follow-up automatizado',
        'Mediar resultados e ROI',
      ],
      resources: ['Ads online', 'Landing page', 'CRM para follow-up'],
      estimated_cost: 'Médio - investimento em ads R$500-2000/mês',
    },
    {
      title: 'Programa de Indicações com Recompensas',
      description: 'Incentivar pacientes atuais a indicarem amigos e familiares',
      expected_impact: 'Aumentar captação qualificada em 20-30%',
      effort: 'easy',
      timeline: '2-4 semanas',
      steps: [
        'Definir estrutura de recompensas (desconto, sessão grátis, etc)',
        'Criar materiais explicativos para pacientes',
        'Implementar sistema de rastreamento',
        'Lançar programa com comunicado aos pacientes',
        'Reconhecer publicamente indicadores',
      ],
      resources: ['Sistema de rastreamento', 'Materiais impressos'],
      estimated_cost: 'Baixo - custo variável por conversão',
    },
    {
      title: 'Parcerias Locais Estratégicas',
      description: 'Estabelecer parcerias com empresas locais para captação direta',
      expected_impact: 'Aumentar fluxo constante de novos pacientes',
      effort: 'medium',
      timeline: '6-12 semanas',
      steps: [
        'Identificar potenciais parceiros (academias, clínicas, empresas)',
        'Elaborar propostas de parceria (mútuo benefício)',
        'Criar contratos ou acordos formais',
        'Implementar sistema de referência',
        'Monitorar qualidade e conversão',
      ],
      resources: ['Contratos', 'Materiais de apresentação', 'Tempo de networking'],
      estimated_cost: 'Baixo - principalmente tempo e relacionamento',
    },
    {
      title: 'Marketing Local de Bairro',
      description: 'Focar em atrair pacientes de bairros específicos',
      expected_impact: 'Aumentar presença local em 20-40%',
      effort: 'medium',
      timeline: '4-6 semanas',
      steps: [
        'Analisar origem geográfica dos pacientes atuais',
        'Identificar bairros com menor penetração',
        'Criar campanhas direcionadas para cada bairro',
        'Participar de eventos locais',
        'Distribuir folhetos em estabelecimentos locais',
      ],
      resources: ['Materiais gráficos', 'Equipe para eventos'],
      estimated_cost: 'Médio - R$500-1500/mês em materiais e eventos',
    },
  ],
  retention: [
    {
      title: 'Programa de Fidelidade com Benefícios Exclusivos',
      description: 'Recompensar pacientes fiéis com descontos e benefícios',
      expected_impact: 'Aumentar retenção em 25-35%',
      effort: 'medium',
      timeline: '4-6 semanas',
      steps: [
        'Definir níveis de fidelidade (bronze, prata, ouro)',
        'Estabelecer benefícios por nível',
        'Criar sistema de pontuação',
        'Comunicar programa aos pacientes',
        'Implementar acompanhamento de progresso',
      ],
      resources: ['Sistema de pontuação', 'Materiais de comunicação'],
      estimated_cost: 'Baixo - principalmente descontos oferecidos',
    },
    {
      title: 'Follow-up Proativo Pós-Tratamento',
      description: 'Contatar pacientes 30 e 60 dias após alta para acompanhamento',
      expected_impact: 'Aumentar retenção e reativação em 20%',
      effort: 'easy',
      timeline: '1-2 semanas para implementar',
      steps: [
        'Criar lista de pacientes dados alta',
        'Definir script de follow-up',
        'Implementar lembretes automáticos no sistema',
        'Treinar equipe para ligações',
        'Registrar outcomes e fazer follow-up adicional se necessário',
      ],
      resources: ['CRM ou planilha', 'Telefone/WhatsApp'],
      estimated_cost: 'Baixo - tempo da equipe',
    },
    {
      title: 'Educação Continuada do Paciente',
      description: 'Manter pacientes engajados com conteúdo relevante',
      expected_impact: 'Aumentar LTV e retenção em 15-20%',
      effort: 'easy',
      timeline: 'Contínuo',
      steps: [
        'Criar calendário editorial de conteúdos',
        'Produzir vídeos curtos de exercícios',
        'Enviar newsletter semanal com dicas',
        'Criar grupo de WhatsApp para dúvidas',
        'Promover webinars mensais sobre temas relevantes',
      ],
      resources: ['Smartphone para vídeos', 'WhatsApp', 'Email marketing'],
      estimated_cost: 'Baixo - principalmente tempo de criação',
    },
  ],
  revenue: [
    {
      title: 'Pacotes de Sessões com Desconto Progressivo',
      description: 'Oferecer descontos para pacotes maiores de sessões',
      expected_impact: 'Aumentar ticket médio e receita recorrente em 15-25%',
      effort: 'easy',
      timeline: '1-2 semanas',
      steps: [
        'Definir estrutura de pacotes (5, 10, 20 sessões)',
        'Calcular descontos progressivos (10%, 15%, 20%)',
        'Atualizar sistema de vendas',
        'Treinar equipe na oferta',
        'Comunicar benefícios financeiros aos pacientes',
      ],
      resources: ['Sistema de vendas', 'Materiais de apresentação'],
      estimated_cost: 'Baixo - apenas tempo de implementação',
    },
    {
      title: 'Upsell de Serviços Complementares',
      description: 'Oferecer produtos/serviços adicionais durante tratamento',
      expected_impact: 'Aumentar receita adicional em 10-20%',
      effort: 'medium',
      timeline: '4-6 semanas',
      steps: [
        'Identificar serviços complementares (órteses, produtos, etc)',
        'Definir critérios para oferta',
        'Treinar equipe em técnicas de venda consultiva',
        'Criar materiais educativos',
        'Implementar sistema de registro e vendas',
      ],
      resources: ['Produtos/serviços complementares', 'Treinamento'],
      estimated_cost: 'Médio - investimento em estoque ou treinamento',
    },
    {
      title: 'Reajuste de Preços Baseado em Demanda',
      description: 'Implementar precificação dinâmica por horário/dia',
      expected_impact: 'Aumentar receita em 8-12% sem perder volume',
      effort: 'medium',
      timeline: '2-4 semanas',
      steps: [
        'Analisar ocupação por horário',
        'Definir preços diferenciados por horário',
        'Implementar no sistema de agendamento',
        'Comunicar mudanças aos pacientes',
        'Monitorar impacto em volume e receita',
        'Ajustar conforme necessário',
      ],
      resources: ['Sistema de agendamento', 'Análise de dados'],
      estimated_cost: 'Baixo - apenas implementação',
    },
  ],
};

// ============================================================================
// ACTION PLAN GENERATOR
// ============================================================================

function generateActionPlan(request: ActionPlanRequest): ActionPlan {
  const { focus_area, time_horizon, constraints } = request;

  // Get relevant actions based on focus area
  let relevantActions: ActionStep[] = [];

  if (focus_area === 'all') {
    relevantActions = [
      ...ACTION_TEMPLATES.occupancy,
      ...ACTION_TEMPLATES.acquisition,
      ...ACTION_TEMPLATES.retention,
      ...ACTION_TEMPLATES.revenue,
    ];
  } else {
    relevantActions = ACTION_TEMPLATES[focus_area] || [];
  }

  // Ensure we have actions
  if (relevantActions.length === 0) {
    relevantActions = ACTION_TEMPLATES.occupancy.slice(0, 3);
  }

  // Filter by budget if specified (more lenient)
  if (constraints?.budget) {
    if (constraints.budget === 'low') {
      relevantActions = relevantActions.filter(a =>
        a.estimated_cost?.includes('Baixo') || a.estimated_cost?.includes('baixo') || !a.estimated_cost
      );
    } else if (constraints.budget === 'medium') {
      relevantActions = relevantActions.filter(a =>
        !a.estimated_cost?.includes('Alto') && !a.estimated_cost?.includes('alto')
      );
    }
  }

  // Ensure we still have actions after filtering
  if (relevantActions.length === 0) {
    relevantActions = ACTION_TEMPLATES.occupancy.slice(0, 3);
  }

  // Categorize actions
  const quickWins = relevantActions
    .filter(a => a.effort === 'easy')
    .slice(0, 3)
    .map(action => ({
      title: action.title,
      description: action.description,
      impact: action.expected_impact,
      effort: 'low' as const,
      timeline: action.timeline,
    }));

  const priorityActions = relevantActions
    .slice(0, 5)
    .map((action, index) => ({
      order: index + 1,
      title: action.title,
      description: action.description,
      expected_impact: action.expected_impact,
      effort: action.effort === 'easy' ? 'Baixo' : action.effort === 'medium' ? 'Médio' : 'Alto',
      timeline: action.timeline,
      steps: action.steps || [],
    }));

  const longTermStrategies = relevantActions
    .filter(a => a.effort === 'hard' || a.timeline.includes('mês') || a.timeline.includes('ano'))
    .slice(0, 3)
    .map(action => ({
      title: action.title,
      description: action.description,
      impact: action.expected_impact,
      effort: (action.effort === 'medium' ? 'medium' : 'high') as 'medium' | 'high',
      timeline: action.timeline,
    }));

  // Define KPIs based on focus area
  const kpisMap: Record<string, string[]> = {
    occupancy: [
      'Taxa de ocupação da agenda',
      'Número de vagas preenchidas',
      'Horário médio de antecedência de agendamento',
    ],
    acquisition: [
      'Número de novos pacientes por semana',
      'Custo de aquisição por paciente (CAC)',
      'Taxa de conversão de avaliação para tratamento',
    ],
    retention: [
      'Taxa de retenção de pacientes',
      'Valor médio do tempo de vida do paciente (LTV)',
      'Número de pacientes reativados',
    ],
    revenue: [
      'Receita mensal total',
      'Ticket médio por sessão',
      'Número de pacotes vendidos',
    ],
    all: [
      'Receita mensal',
      'Taxa de ocupação',
      'Novos pacientes',
      'Taxa de retenção',
      'Satisfação dos pacientes (NPS)',
    ],
  };

  const kpis = kpisMap[focus_area] || kpisMap.all;

  // Calculate timeline
  const today = new Date();
  const reviewDate = new Date(today);
  reviewDate.setDate(reviewDate.getDate() + 30); // 30 days review

  const timelineMap: Record<string, string> = {
    immediate: 'Imediato (0-7 dias)',
    short: 'Curto prazo (1-4 semanas)',
    medium: 'Médio prazo (1-3 meses)',
    long: 'Longo prazo (3-12 meses)',
  };

  return {
    summary: {
      focus_area: focus_area === 'all' ? 'Todos os aspectos' : getFocusAreaLabel(focus_area),
      time_horizon: timelineMap[time_horizon] || 'Curto prazo',
      total_actions: relevantActions.length,
      estimated_impact: getEstimatedImpact(focus_area),
      estimated_timeline: getEstimatedTimeline(time_horizon),
    },
    priority_actions: priorityActions,
    quick_wins: quickWins,
    long_term_strategies: longTermStrategies,
    kpis_to_track: kpis,
    review_date: reviewDate.toISOString().split('T')[0],
  };
}

function getFocusAreaLabel(area: string): string {
  const labels: Record<string, string> = {
    occupancy: 'Otimização de Ocupação',
    acquisition: 'Aquisição de Pacientes',
    retention: 'Retenção e Fidelização',
    revenue: 'Maximização de Receita',
  };
  return labels[area] || area;
}

function getEstimatedImpact(area: string): string {
  const impacts: Record<string, string> = {
    occupancy: 'Aumento de 15-25% na taxa de ocupação',
    acquisition: 'Aumento de 30-50% na captação de novos pacientes',
    retention: 'Aumento de 20-30% na taxa de retenção',
    revenue: 'Aumento de 15-25% na receita mensal',
    all: 'Melhoria abrangente em todos os indicadores-chave',
  };
  return impacts[area] || 'Impacto significativo nos resultados';
}

function getEstimatedTimeline(horizon: string): string {
  const timelines: Record<string, string> = {
    immediate: '7 dias',
    short: '4 semanas',
    medium: '3 meses',
    long: '6-12 meses',
  };
  return timelines[horizon] || 'Variado';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Only POST allowed
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const requestBody: ActionPlanRequest = await req.json();

    // Validate request
    if (!requestBody.focus_area || !requestBody.time_horizon) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: focus_area and time_horizon are required',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate action plan
    const actionPlan = generateActionPlan(requestBody);

    return new Response(JSON.stringify({
      success: true,
      data: actionPlan,
      generated_at: new Date().toISOString(),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in AI action plan:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
