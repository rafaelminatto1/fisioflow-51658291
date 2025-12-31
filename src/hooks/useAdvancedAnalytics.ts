import { useState, useEffect, useMemo } from 'react';

// Interfaces para Analytics
interface MetricData {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  unit: string;
  category: 'patients' | 'appointments' | 'revenue' | 'performance' | 'satisfaction';
  description: string;
  trend: number[]; // Últimos 30 dias
}

interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
  title: string;
  dataKey: string;
  color: string;
  showGrid: boolean;
  showLegend: boolean;
  height: number;
}

interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'progress' | 'gauge';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  isVisible: boolean;
  refreshInterval?: number; // em segundos
}

interface CustomDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isPublic: boolean;
}

interface AnalyticsFilter {
  dateRange: {
    start: Date;
    end: Date;
  };
  categories: string[];
  therapists: string[];
  patients: string[];
  treatments: string[];
}

interface PredictiveInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'forecast' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedActions: string[];
  dataPoints: unknown[];
  createdAt: Date;
}

interface RealtimeMetric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
  threshold?: {
    warning: number;
    critical: number;
  };
}

// Mock data
const mockMetrics: MetricData[] = [
  {
    id: 'total-patients',
    name: 'Total de Pacientes',
    value: 1247,
    previousValue: 1198,
    change: 4.1,
    changeType: 'increase',
    unit: 'pacientes',
    category: 'patients',
    description: 'Número total de pacientes ativos',
    trend: [1150, 1165, 1180, 1195, 1210, 1225, 1240, 1247]
  },
  {
    id: 'monthly-revenue',
    name: 'Receita Mensal',
    value: 89750,
    previousValue: 82300,
    change: 9.1,
    changeType: 'increase',
    unit: 'R$',
    category: 'revenue',
    description: 'Receita total do mês atual',
    trend: [75000, 78000, 81000, 79500, 82300, 85600, 87200, 89750]
  },
  {
    id: 'appointment-completion',
    name: 'Taxa de Conclusão',
    value: 94.2,
    previousValue: 91.8,
    change: 2.6,
    changeType: 'increase',
    unit: '%',
    category: 'performance',
    description: 'Percentual de consultas concluídas',
    trend: [89, 90, 91, 92, 91.8, 93, 94, 94.2]
  },
  {
    id: 'patient-satisfaction',
    name: 'Satisfação do Paciente',
    value: 4.7,
    previousValue: 4.5,
    change: 4.4,
    changeType: 'increase',
    unit: '/5',
    category: 'satisfaction',
    description: 'Avaliação média dos pacientes',
    trend: [4.3, 4.4, 4.5, 4.4, 4.5, 4.6, 4.6, 4.7]
  },
  {
    id: 'no-show-rate',
    name: 'Taxa de Faltas',
    value: 8.3,
    previousValue: 12.1,
    change: -31.4,
    changeType: 'decrease',
    unit: '%',
    category: 'appointments',
    description: 'Percentual de faltas em consultas',
    trend: [15, 14, 13, 12.5, 12.1, 10.8, 9.5, 8.3]
  }
];

const mockInsights: PredictiveInsight[] = [
  {
    id: 'revenue-forecast',
    type: 'forecast',
    title: 'Projeção de Receita',
    description: 'Com base no crescimento atual, a receita pode atingir R$ 95.000 no próximo mês',
    confidence: 87,
    impact: 'high',
    actionable: true,
    suggestedActions: [
      'Aumentar capacidade de atendimento',
      'Implementar pacotes promocionais',
      'Expandir horários de funcionamento'
    ],
    dataPoints: [],
    createdAt: new Date()
  },
  {
    id: 'patient-retention',
    type: 'trend',
    title: 'Melhoria na Retenção',
    description: 'Taxa de retenção de pacientes aumentou 15% nos últimos 3 meses',
    confidence: 92,
    impact: 'high',
    actionable: false,
    suggestedActions: [],
    dataPoints: [],
    createdAt: new Date()
  },
  {
    id: 'peak-hours',
    type: 'recommendation',
    title: 'Otimização de Horários',
    description: 'Horários entre 14h-16h têm menor ocupação. Considere promoções para este período',
    confidence: 78,
    impact: 'medium',
    actionable: true,
    suggestedActions: [
      'Criar desconto para horários alternativos',
      'Oferecer sessões de grupo no período',
      'Implementar agendamento flexível'
    ],
    dataPoints: [],
    createdAt: new Date()
  }
];

const mockRealtimeMetrics: RealtimeMetric[] = [
  {
    id: 'active-sessions',
    name: 'Sessões Ativas',
    value: 12,
    timestamp: new Date(),
    status: 'normal',
    threshold: { warning: 15, critical: 20 }
  },
  {
    id: 'waiting-patients',
    name: 'Pacientes Aguardando',
    value: 3,
    timestamp: new Date(),
    status: 'normal',
    threshold: { warning: 5, critical: 8 }
  },
  {
    id: 'system-load',
    name: 'Carga do Sistema',
    value: 67,
    timestamp: new Date(),
    status: 'normal',
    threshold: { warning: 80, critical: 95 }
  }
];

const defaultDashboard: CustomDashboard = {
  id: 'default-dashboard',
  name: 'Dashboard Principal',
  description: 'Visão geral dos principais indicadores',
  widgets: [
    {
      id: 'metrics-overview',
      type: 'metric',
      title: 'Métricas Principais',
      position: { x: 0, y: 0, w: 12, h: 4 },
      config: { metrics: ['total-patients', 'monthly-revenue', 'appointment-completion', 'patient-satisfaction'] },
      isVisible: true
    },
    {
      id: 'revenue-chart',
      type: 'chart',
      title: 'Evolução da Receita',
      position: { x: 0, y: 4, w: 8, h: 6 },
      config: { type: 'line', dataKey: 'revenue', color: '#0ea5e9' },
      isVisible: true
    },
    {
      id: 'patient-distribution',
      type: 'chart',
      title: 'Distribuição de Pacientes',
      position: { x: 8, y: 4, w: 4, h: 6 },
      config: { type: 'pie', dataKey: 'patients', color: '#10b981' },
      isVisible: true
    }
  ],
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'current-user',
  isPublic: false
};

export const useAdvancedAnalytics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>(mockMetrics);
  const [insights, setInsights] = useState<PredictiveInsight[]>(mockInsights);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetric[]>(mockRealtimeMetrics);
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([defaultDashboard]);
  const [activeDashboard, setActiveDashboard] = useState<string>('default-dashboard');
  const [filters, setFilters] = useState<AnalyticsFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
      end: new Date()
    },
    categories: [],
    therapists: [],
    patients: [],
    treatments: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Métricas filtradas
  const filteredMetrics = useMemo(() => {
    if (filters.categories.length === 0) return metrics;
    return metrics.filter(metric => filters.categories.includes(metric.category));
  }, [metrics, filters.categories]);

  // Dashboard ativo
  const currentDashboard = useMemo(() => {
    return dashboards.find(d => d.id === activeDashboard) || defaultDashboard;
  }, [dashboards, activeDashboard]);

  // Insights por impacto
  const insightsByImpact = useMemo(() => {
    return {
      high: insights.filter(i => i.impact === 'high'),
      medium: insights.filter(i => i.impact === 'medium'),
      low: insights.filter(i => i.impact === 'low')
    };
  }, [insights]);

  // Atualizar métricas em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.value + (Math.random() - 0.5) * 2,
        timestamp: new Date(),
        status: metric.value > (metric.threshold?.critical || 100) ? 'critical' :
                metric.value > (metric.threshold?.warning || 80) ? 'warning' : 'normal'
      })));
    }, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  // Funções de gerenciamento
  const refreshMetrics = async (): Promise<void> => {
    setLoading(true);
    try {
      // Simular chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar métricas com novos dados
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        previousValue: metric.value,
        value: metric.value + (Math.random() - 0.5) * metric.value * 0.1,
        change: Math.random() * 10 - 5,
        changeType: Math.random() > 0.5 ? 'increase' : 'decrease'
      })));
      
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError('Erro ao atualizar métricas');
      logger.error('Erro ao atualizar métricas de analytics', error, 'useAdvancedAnalytics');
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<AnalyticsFilter>): void => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const createDashboard = (dashboard: Omit<CustomDashboard, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const newDashboard: CustomDashboard = {
      ...dashboard,
      id: `dashboard-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setDashboards(prev => [...prev, newDashboard]);
    return newDashboard.id;
  };

  const updateDashboard = (id: string, updates: Partial<CustomDashboard>): void => {
    setDashboards(prev => prev.map(dashboard => 
      dashboard.id === id 
        ? { ...dashboard, ...updates, updatedAt: new Date() }
        : dashboard
    ));
  };

  const deleteDashboard = (id: string): void => {
    if (id === 'default-dashboard') return; // Não permitir deletar dashboard padrão
    
    setDashboards(prev => prev.filter(d => d.id !== id));
    
    if (activeDashboard === id) {
      setActiveDashboard('default-dashboard');
    }
  };

  const duplicateDashboard = (id: string): string => {
    const dashboard = dashboards.find(d => d.id === id);
    if (!dashboard) return '';
    
    return createDashboard({
      ...dashboard,
      name: `${dashboard.name} (Cópia)`,
      isDefault: false
    });
  };

  const addWidget = (dashboardId: string, widget: Omit<DashboardWidget, 'id'>): void => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`
    };
    
    updateDashboard(dashboardId, {
      widgets: [...(currentDashboard.widgets || []), newWidget]
    });
  };

  const updateWidget = (dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>): void => {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (!dashboard) return;
    
    const updatedWidgets = dashboard.widgets.map(widget => 
      widget.id === widgetId ? { ...widget, ...updates } : widget
    );
    
    updateDashboard(dashboardId, { widgets: updatedWidgets });
  };

  const removeWidget = (dashboardId: string, widgetId: string): void => {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (!dashboard) return;
    
    const updatedWidgets = dashboard.widgets.filter(widget => widget.id !== widgetId);
    updateDashboard(dashboardId, { widgets: updatedWidgets });
  };

  const exportDashboard = (id: string): string => {
    const dashboard = dashboards.find(d => d.id === id);
    if (!dashboard) return '';
    
    return JSON.stringify(dashboard, null, 2);
  };

  const importDashboard = (dashboardJson: string): string | null => {
    try {
      const dashboard = JSON.parse(dashboardJson) as CustomDashboard;
      return createDashboard({
        ...dashboard,
        name: `${dashboard.name} (Importado)`,
        isDefault: false
      });
    } catch {
      setError('Erro ao importar dashboard');
      return null;
    }
  };

  const generateInsights = async (): Promise<void> => {
    setLoading(true);
    try {
      // Simular análise de IA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newInsights: PredictiveInsight[] = [
        {
          id: `insight-${Date.now()}`,
          type: 'anomaly',
          title: 'Anomalia Detectada',
          description: 'Aumento incomum de cancelamentos nas terças-feiras',
          confidence: 85,
          impact: 'medium',
          actionable: true,
          suggestedActions: [
            'Investigar causas específicas das terças',
            'Implementar lembretes adicionais',
            'Oferecer reagendamento facilitado'
          ],
          dataPoints: [],
          createdAt: new Date()
        }
      ];
      
      setInsights(prev => [...newInsights, ...prev]);
      setError(null);
    } catch (err) {
      setError('Erro ao gerar insights');
    } finally {
      setLoading(false);
    }
  };

  const getMetricsByCategory = (category: string): MetricData[] => {
    return metrics.filter(metric => metric.category === category);
  };

  const getTopPerformingMetrics = (limit: number = 5): MetricData[] => {
    return [...metrics]
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, limit);
  };

  const calculateTotalChange = (): number => {
    const totalChange = metrics.reduce((sum, metric) => sum + metric.change, 0);
    return totalChange / metrics.length;
  };

  return {
    // Data
    metrics: filteredMetrics,
    insights,
    realtimeMetrics,
    dashboards,
    currentDashboard,
    insightsByImpact,
    
    // State
    activeDashboard,
    filters,
    loading,
    error,
    
    // Actions
    setActiveDashboard,
    refreshMetrics,
    updateFilters,
    generateInsights,
    
    // Dashboard management
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    exportDashboard,
    importDashboard,
    
    // Widget management
    addWidget,
    updateWidget,
    removeWidget,
    
    // Utility functions
    getMetricsByCategory,
    getTopPerformingMetrics,
    calculateTotalChange
  };
};

// Utility functions
export const formatMetricValue = (value: number, unit: string): string => {
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

export const getChangeColor = (changeType: 'increase' | 'decrease' | 'neutral'): string => {
  switch (changeType) {
    case 'increase': return 'text-green-600';
    case 'decrease': return 'text-red-600';
    case 'neutral': return 'text-gray-600';
    default: return 'text-gray-600';
  }
};

export const getChangeIcon = (changeType: 'increase' | 'decrease' | 'neutral'): string => {
  switch (changeType) {
    case 'increase': return '↗';
    case 'decrease': return '↘';
    case 'neutral': return '→';
    default: return '→';
  }
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 90) return 'text-green-600';
  if (confidence >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

export const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
  switch (impact) {
    case 'high': return 'text-red-600';
    case 'medium': return 'text-yellow-600';
    case 'low': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

export const getStatusColor = (status: 'normal' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'normal': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};