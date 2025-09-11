import { useState, useCallback, useEffect } from 'react';

// Interfaces para Relatórios Inteligentes
interface ReportData {
  id: string;
  title: string;
  description: string;
  type: 'financial' | 'clinical' | 'operational' | 'patient' | 'therapist' | 'custom';
  period: {
    start: Date;
    end: Date;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  metrics: ReportMetric[];
  insights: AIInsight[];
  recommendations: Recommendation[];
  charts: ChartConfig[];
  generatedAt: Date;
  status: 'generating' | 'ready' | 'error';
  autoGenerate: boolean;
  recipients: string[];
}

interface ReportMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  unit: string;
  category: string;
  importance: 'high' | 'medium' | 'low';
  description: string;
}

interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction' | 'opportunity' | 'risk';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  category: string;
  data: any;
  actionable: boolean;
  relatedMetrics: string[];
  generatedAt: Date;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  steps: string[];
  relatedInsights: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'gauge';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  metrics: string[];
  filters?: Record<string, any>;
  colors?: string[];
  size: 'small' | 'medium' | 'large' | 'full';
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportData['type'];
  defaultPeriod: ReportData['period']['frequency'];
  metrics: string[];
  charts: Omit<ChartConfig, 'data'>[];
  autoInsights: boolean;
  customizable: boolean;
}

interface ReportFilter {
  dateRange: { start: Date; end: Date };
  type?: ReportData['type'];
  status?: ReportData['status'];
  therapist?: string;
  patient?: string;
  department?: string;
  tags?: string[];
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  includeInsights: boolean;
  includeRecommendations: boolean;
  template?: string;
  branding: boolean;
}

// Templates de relatórios predefinidos
const reportTemplates: Record<string, ReportTemplate> = {
  financial_monthly: {
    id: 'financial_monthly',
    name: 'Relatório Financeiro Mensal',
    description: 'Análise completa da performance financeira mensal',
    type: 'financial',
    defaultPeriod: 'monthly',
    metrics: ['revenue', 'expenses', 'profit', 'receivables', 'payables', 'cash_flow'],
    charts: [
      { id: 'revenue_trend', type: 'line', title: 'Evolução da Receita', metrics: ['revenue'], size: 'large' },
      { id: 'expense_breakdown', type: 'pie', title: 'Distribuição de Despesas', metrics: ['expenses'], size: 'medium' },
      { id: 'profit_margin', type: 'bar', title: 'Margem de Lucro', metrics: ['profit'], size: 'medium' }
    ],
    autoInsights: true,
    customizable: true
  },
  clinical_performance: {
    id: 'clinical_performance',
    name: 'Performance Clínica',
    description: 'Análise da qualidade e eficácia dos tratamentos',
    type: 'clinical',
    defaultPeriod: 'monthly',
    metrics: ['patient_satisfaction', 'treatment_success', 'session_completion', 'recovery_time'],
    charts: [
      { id: 'satisfaction_trend', type: 'line', title: 'Satisfação do Paciente', metrics: ['patient_satisfaction'], size: 'large' },
      { id: 'success_rate', type: 'gauge', title: 'Taxa de Sucesso', metrics: ['treatment_success'], size: 'medium' },
      { id: 'completion_rate', type: 'bar', title: 'Taxa de Conclusão', metrics: ['session_completion'], size: 'medium' }
    ],
    autoInsights: true,
    customizable: true
  },
  operational_efficiency: {
    id: 'operational_efficiency',
    name: 'Eficiência Operacional',
    description: 'Análise da eficiência operacional e utilização de recursos',
    type: 'operational',
    defaultPeriod: 'weekly',
    metrics: ['room_utilization', 'therapist_productivity', 'no_show_rate', 'wait_time'],
    charts: [
      { id: 'utilization_heatmap', type: 'heatmap', title: 'Utilização de Salas', metrics: ['room_utilization'], size: 'large' },
      { id: 'productivity_comparison', type: 'bar', title: 'Produtividade por Terapeuta', metrics: ['therapist_productivity'], size: 'medium' },
      { id: 'no_show_trend', type: 'line', title: 'Taxa de No-Show', metrics: ['no_show_rate'], size: 'medium' }
    ],
    autoInsights: true,
    customizable: true
  },
  patient_outcomes: {
    id: 'patient_outcomes',
    name: 'Resultados dos Pacientes',
    description: 'Análise dos resultados e progresso dos pacientes',
    type: 'patient',
    defaultPeriod: 'monthly',
    metrics: ['recovery_rate', 'pain_reduction', 'mobility_improvement', 'adherence_rate'],
    charts: [
      { id: 'recovery_timeline', type: 'area', title: 'Timeline de Recuperação', metrics: ['recovery_rate'], size: 'large' },
      { id: 'pain_levels', type: 'line', title: 'Redução da Dor', metrics: ['pain_reduction'], size: 'medium' },
      { id: 'mobility_scores', type: 'bar', title: 'Melhoria da Mobilidade', metrics: ['mobility_improvement'], size: 'medium' }
    ],
    autoInsights: true,
    customizable: true
  }
};

// Mock data para demonstração
const mockReportData: ReportData[] = [
  {
    id: 'report-1',
    title: 'Relatório Financeiro - Dezembro 2024',
    description: 'Análise financeira completa do mês de dezembro',
    type: 'financial',
    period: {
      start: new Date('2024-12-01'),
      end: new Date('2024-12-31'),
      frequency: 'monthly'
    },
    metrics: [
      {
        id: 'revenue',
        name: 'Receita Total',
        value: 125000,
        previousValue: 118000,
        change: 7000,
        changePercent: 5.9,
        trend: 'up',
        target: 130000,
        unit: 'R$',
        category: 'Financeiro',
        importance: 'high',
        description: 'Receita total do período'
      },
      {
        id: 'profit',
        name: 'Lucro Líquido',
        value: 32500,
        previousValue: 28000,
        change: 4500,
        changePercent: 16.1,
        trend: 'up',
        target: 35000,
        unit: 'R$',
        category: 'Financeiro',
        importance: 'high',
        description: 'Lucro após todas as deduções'
      }
    ],
    insights: [
      {
        id: 'insight-1',
        type: 'trend',
        title: 'Crescimento Consistente da Receita',
        description: 'A receita tem apresentado crescimento consistente nos últimos 3 meses, com média de 5.2% ao mês.',
        confidence: 92,
        impact: 'high',
        category: 'Financeiro',
        data: { growth_rate: 5.2, months: 3 },
        actionable: true,
        relatedMetrics: ['revenue'],
        generatedAt: new Date()
      },
      {
        id: 'insight-2',
        type: 'opportunity',
        title: 'Potencial de Otimização de Custos',
        description: 'Identificadas oportunidades de redução de custos operacionais em até 8%.',
        confidence: 78,
        impact: 'medium',
        category: 'Operacional',
        data: { potential_savings: 0.08 },
        actionable: true,
        relatedMetrics: ['expenses'],
        generatedAt: new Date()
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        title: 'Implementar Programa de Fidelidade',
        description: 'Criar programa de fidelidade para aumentar retenção de pacientes e receita recorrente.',
        priority: 'high',
        category: 'Marketing',
        estimatedImpact: 'Aumento de 15-20% na retenção',
        effort: 'medium',
        timeline: '2-3 meses',
        steps: [
          'Definir estrutura do programa',
          'Desenvolver sistema de pontos',
          'Criar campanhas de lançamento',
          'Implementar e monitorar'
        ],
        relatedInsights: ['insight-1'],
        status: 'pending'
      }
    ],
    charts: [
      {
        id: 'revenue_chart',
        type: 'line',
        title: 'Evolução da Receita',
        data: [
          { month: 'Out', value: 110000 },
          { month: 'Nov', value: 118000 },
          { month: 'Dez', value: 125000 }
        ],
        xAxis: 'month',
        yAxis: 'value',
        metrics: ['revenue'],
        size: 'large'
      }
    ],
    generatedAt: new Date(),
    status: 'ready',
    autoGenerate: true,
    recipients: ['admin@fisioflow.com', 'financeiro@fisioflow.com']
  }
];

export const useIntelligentReports = () => {
  const [reports, setReports] = useState<ReportData[]>(mockReportData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      end: new Date()
    }
  });
  const [templates, setTemplates] = useState(reportTemplates);
  const [customMetrics, setCustomMetrics] = useState<ReportMetric[]>([]);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);

  // Gerar relatório usando IA
  const generateReport = useCallback(async (templateId: string, period: { start: Date; end: Date }, customConfig?: Partial<ReportData>) => {
    setIsGenerating(true);
    
    try {
      const template = templates[templateId];
      if (!template) {
        throw new Error('Template não encontrado');
      }

      // Simular geração de relatório
      await new Promise(resolve => setTimeout(resolve, 3000));

      const reportId = `report-${Date.now()}`;
      const newReport: ReportData = {
        id: reportId,
        title: customConfig?.title || `${template.name} - ${period.start.toLocaleDateString()}`,
        description: customConfig?.description || template.description,
        type: template.type,
        period: {
          start: period.start,
          end: period.end,
          frequency: template.defaultPeriod
        },
        metrics: await generateMetrics(template.metrics, period),
        insights: await generateInsights(template.metrics, period),
        recommendations: await generateRecommendations(template.metrics, period),
        charts: await generateCharts(template.charts, period),
        generatedAt: new Date(),
        status: 'ready',
        autoGenerate: customConfig?.autoGenerate || false,
        recipients: customConfig?.recipients || []
      };

      setReports(prev => [newReport, ...prev]);
      setSelectedReport(newReport);
      
      return newReport;
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [templates]);

  // Gerar métricas usando IA
  const generateMetrics = useCallback(async (metricIds: string[], period: { start: Date; end: Date }): Promise<ReportMetric[]> => {
    // Simular análise de dados e geração de métricas
    const mockMetrics: Record<string, Partial<ReportMetric>> = {
      revenue: {
        name: 'Receita Total',
        value: Math.random() * 100000 + 50000,
        unit: 'R$',
        category: 'Financeiro',
        importance: 'high'
      },
      expenses: {
        name: 'Despesas Totais',
        value: Math.random() * 50000 + 20000,
        unit: 'R$',
        category: 'Financeiro',
        importance: 'high'
      },
      profit: {
        name: 'Lucro Líquido',
        value: Math.random() * 30000 + 10000,
        unit: 'R$',
        category: 'Financeiro',
        importance: 'high'
      },
      patient_satisfaction: {
        name: 'Satisfação do Paciente',
        value: Math.random() * 20 + 80,
        unit: '%',
        category: 'Qualidade',
        importance: 'high'
      },
      treatment_success: {
        name: 'Taxa de Sucesso do Tratamento',
        value: Math.random() * 15 + 85,
        unit: '%',
        category: 'Clínico',
        importance: 'high'
      },
      no_show_rate: {
        name: 'Taxa de No-Show',
        value: Math.random() * 10 + 5,
        unit: '%',
        category: 'Operacional',
        importance: 'medium'
      }
    };

    return metricIds.map(id => {
      const base = mockMetrics[id] || {
        name: id,
        value: Math.random() * 100,
        unit: 'unidade',
        category: 'Geral',
        importance: 'medium' as const
      };

      const previousValue = base.value! * (0.9 + Math.random() * 0.2);
      const change = base.value! - previousValue;
      const changePercent = (change / previousValue) * 100;

      return {
        id,
        ...base,
        previousValue,
        change,
        changePercent,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        target: base.value! * 1.1,
        description: `Métrica ${base.name} para o período selecionado`
      } as ReportMetric;
    });
  }, []);

  // Gerar insights usando IA
  const generateInsights = useCallback(async (metricIds: string[], period: { start: Date; end: Date }): Promise<AIInsight[]> => {
    const insightTemplates = [
      {
        type: 'trend' as const,
        title: 'Tendência de Crescimento Identificada',
        description: 'Os dados mostram uma tendência consistente de crescimento nos últimos períodos.',
        confidence: 85 + Math.random() * 10,
        impact: 'high' as const,
        category: 'Performance'
      },
      {
        type: 'anomaly' as const,
        title: 'Anomalia Detectada nos Dados',
        description: 'Identificada variação atípica que merece investigação adicional.',
        confidence: 70 + Math.random() * 15,
        impact: 'medium' as const,
        category: 'Qualidade'
      },
      {
        type: 'opportunity' as const,
        title: 'Oportunidade de Melhoria',
        description: 'Identificada oportunidade para otimização de processos.',
        confidence: 75 + Math.random() * 15,
        impact: 'medium' as const,
        category: 'Eficiência'
      },
      {
        type: 'prediction' as const,
        title: 'Previsão para Próximo Período',
        description: 'Com base nos dados atuais, a previsão indica tendência positiva.',
        confidence: 80 + Math.random() * 10,
        impact: 'high' as const,
        category: 'Planejamento'
      }
    ];

    return insightTemplates.slice(0, 2 + Math.floor(Math.random() * 2)).map((template, index) => ({
      id: `insight-${Date.now()}-${index}`,
      ...template,
      data: { period, metrics: metricIds },
      actionable: Math.random() > 0.3,
      relatedMetrics: metricIds.slice(0, 1 + Math.floor(Math.random() * 2)),
      generatedAt: new Date()
    }));
  }, []);

  // Gerar recomendações usando IA
  const generateRecommendations = useCallback(async (metricIds: string[], period: { start: Date; end: Date }): Promise<Recommendation[]> => {
    const recommendationTemplates = [
      {
        title: 'Otimizar Processo de Agendamento',
        description: 'Implementar sistema automatizado para reduzir no-shows e melhorar eficiência.',
        priority: 'high' as const,
        category: 'Operacional',
        estimatedImpact: 'Redução de 25% no no-show',
        effort: 'medium' as const,
        timeline: '1-2 meses'
      },
      {
        title: 'Programa de Capacitação da Equipe',
        description: 'Investir em treinamento para melhorar qualidade do atendimento.',
        priority: 'medium' as const,
        category: 'Recursos Humanos',
        estimatedImpact: 'Aumento de 15% na satisfação',
        effort: 'high' as const,
        timeline: '3-4 meses'
      },
      {
        title: 'Implementar Sistema de Feedback',
        description: 'Criar canal estruturado para coleta de feedback dos pacientes.',
        priority: 'medium' as const,
        category: 'Qualidade',
        estimatedImpact: 'Melhoria contínua da qualidade',
        effort: 'low' as const,
        timeline: '2-3 semanas'
      }
    ];

    return recommendationTemplates.slice(0, 1 + Math.floor(Math.random() * 2)).map((template, index) => ({
      id: `rec-${Date.now()}-${index}`,
      ...template,
      steps: [
        'Análise detalhada da situação atual',
        'Planejamento da implementação',
        'Execução das ações',
        'Monitoramento dos resultados'
      ],
      relatedInsights: [`insight-${Date.now()}-${index}`],
      status: 'pending' as const
    }));
  }, []);

  // Gerar gráficos
  const generateCharts = useCallback(async (chartConfigs: Omit<ChartConfig, 'data'>[], period: { start: Date; end: Date }): Promise<ChartConfig[]> => {
    return chartConfigs.map(config => {
      // Gerar dados mock baseados no tipo de gráfico
      let data: any[] = [];
      
      switch (config.type) {
        case 'line':
        case 'area':
          data = Array.from({ length: 12 }, (_, i) => ({
            month: new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' }),
            value: Math.random() * 100000 + 50000
          }));
          break;
        case 'bar':
          data = Array.from({ length: 6 }, (_, i) => ({
            category: `Categoria ${i + 1}`,
            value: Math.random() * 50000 + 10000
          }));
          break;
        case 'pie':
          data = [
            { name: 'Consultas', value: 40 },
            { name: 'Tratamentos', value: 35 },
            { name: 'Exames', value: 15 },
            { name: 'Outros', value: 10 }
          ];
          break;
        case 'gauge':
          data = [{ value: Math.random() * 40 + 60 }];
          break;
        default:
          data = [];
      }

      return {
        ...config,
        data
      };
    });
  }, []);

  // Exportar relatório
  const exportReport = useCallback(async (reportId: string, options: ExportOptions) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Relatório não encontrado');
    }

    // Simular exportação
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Em produção, gerar arquivo real
    const filename = `${report.title.replace(/\s+/g, '_')}.${options.format}`;
    
    // Mock: criar blob com dados do relatório
    const reportData = {
      ...report,
      exportOptions: options,
      exportedAt: new Date()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [reports]);

  // Agendar relatório automático
  const scheduleReport = useCallback((templateId: string, schedule: { frequency: string; recipients: string[]; enabled: boolean }) => {
    const newSchedule = {
      id: `schedule-${Date.now()}`,
      templateId,
      ...schedule,
      createdAt: new Date(),
      lastGenerated: null,
      nextGeneration: new Date(Date.now() + 24 * 60 * 60 * 1000) // Próximo dia
    };
    
    setScheduledReports(prev => [...prev, newSchedule]);
  }, []);

  // Comparar relatórios
  const compareReports = useCallback((reportIds: string[]) => {
    const reportsToCompare = reports.filter(r => reportIds.includes(r.id));
    
    if (reportsToCompare.length < 2) {
      throw new Error('Selecione pelo menos 2 relatórios para comparar');
    }

    // Gerar comparação
    const comparison = {
      reports: reportsToCompare,
      metrics: compareMetrics(reportsToCompare),
      insights: generateComparisonInsights(reportsToCompare),
      generatedAt: new Date()
    };

    return comparison;
  }, [reports]);

  // Comparar métricas entre relatórios
  const compareMetrics = useCallback((reports: ReportData[]) => {
    const allMetrics = reports.flatMap(r => r.metrics);
    const metricGroups = allMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, ReportMetric[]>);

    return Object.entries(metricGroups).map(([name, metrics]) => ({
      name,
      values: metrics.map(m => ({ reportId: reports.find(r => r.metrics.includes(m))?.id, value: m.value })),
      trend: calculateTrend(metrics.map(m => m.value)),
      variance: calculateVariance(metrics.map(m => m.value))
    }));
  }, []);

  // Gerar insights de comparação
  const generateComparisonInsights = useCallback((reports: ReportData[]): AIInsight[] => {
    return [
      {
        id: `comparison-insight-${Date.now()}`,
        type: 'correlation',
        title: 'Correlação Identificada',
        description: 'Identificada correlação entre métricas dos relatórios comparados.',
        confidence: 82,
        impact: 'medium',
        category: 'Análise Comparativa',
        data: { reports: reports.map(r => r.id) },
        actionable: true,
        relatedMetrics: [],
        generatedAt: new Date()
      }
    ];
  }, []);

  // Utilitários
  const calculateTrend = useCallback((values: number[]) => {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }, []);

  const calculateVariance = useCallback((values: number[]) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }, []);

  // Filtrar relatórios
  const filteredReports = reports.filter(report => {
    if (filters.type && report.type !== filters.type) return false;
    if (filters.status && report.status !== filters.status) return false;
    if (filters.dateRange) {
      const reportDate = report.generatedAt;
      if (reportDate < filters.dateRange.start || reportDate > filters.dateRange.end) return false;
    }
    return true;
  });

  return {
    // Estado
    reports: filteredReports,
    isGenerating,
    selectedReport,
    filters,
    templates,
    customMetrics,
    scheduledReports,
    
    // Ações
    generateReport,
    exportReport,
    scheduleReport,
    compareReports,
    setSelectedReport,
    setFilters,
    
    // Utilitários
    calculateTrend,
    calculateVariance
  };
};

// Utility functions
export const formatMetricValue = (metric: ReportMetric): string => {
  const value = metric.value;
  const unit = metric.unit;
  
  if (unit === 'R$') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  
  return `${value.toLocaleString('pt-BR')} ${unit}`;
};

export const getMetricTrendColor = (trend: ReportMetric['trend']): string => {
  switch (trend) {
    case 'up': return 'text-green-600';
    case 'down': return 'text-red-600';
    case 'stable': return 'text-gray-600';
    default: return 'text-gray-600';
  }
};

export const getInsightTypeIcon = (type: AIInsight['type']): string => {
  switch (type) {
    case 'trend': return '📈';
    case 'anomaly': return '⚠️';
    case 'correlation': return '🔗';
    case 'prediction': return '🔮';
    case 'opportunity': return '💡';
    case 'risk': return '⚡';
    default: return 'ℹ️';
  }
};

export const getPriorityColor = (priority: Recommendation['priority']): string => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 90) return 'text-green-600';
  if (confidence >= 70) return 'text-yellow-600';
  if (confidence >= 50) return 'text-orange-600';
  return 'text-red-600';
};

export const formatPeriod = (period: ReportData['period']): string => {
  const start = period.start.toLocaleDateString('pt-BR');
  const end = period.end.toLocaleDateString('pt-BR');
  return `${start} - ${end}`;
};

export const getReportTypeLabel = (type: ReportData['type']): string => {
  const labels = {
    financial: 'Financeiro',
    clinical: 'Clínico',
    operational: 'Operacional',
    patient: 'Paciente',
    therapist: 'Terapeuta',
    custom: 'Personalizado'
  };
  
  return labels[type] || type;
};