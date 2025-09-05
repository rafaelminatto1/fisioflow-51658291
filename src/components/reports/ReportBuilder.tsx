import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import { 
  Plus, 
  X, 
  GripVertical, 
  BarChart3, 
  Table, 
  PieChart,
  LineChart,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Save,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportBuilderProps {
  onSave: (config: ReportConfig) => void;
  onPreview: (config: ReportConfig) => void;
  initialConfig?: ReportConfig;
}

export interface ReportConfig {
  name: string;
  description: string;
  template_type: string;
  query_config: {
    metrics: string[];
    charts: ChartConfig[];
    filters: FilterConfig[];
    groupBy?: string;
    orderBy?: string;
    period: string;
  };
  schedule_config?: {
    frequency: string;
    day?: number;
    time?: string;
    recipients: string[];
  };
}

interface ChartOptions {
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
  height?: number;
  width?: number;
  [key: string]: unknown;
}

interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'table';
  title: string;
  metric: string;
  options?: ChartOptions;
}

interface FilterConfig {
  field: string;
  operator: string;
  value: string | number | Date | [string | number | Date, string | number | Date];
  label: string;
}

const AVAILABLE_METRICS = [
  { value: 'total_revenue', label: 'Receita Total', category: 'financial' },
  { value: 'avg_ticket', label: 'Ticket Médio', category: 'financial' },
  { value: 'patient_count', label: 'Total de Pacientes', category: 'patients' },
  { value: 'new_patients', label: 'Novos Pacientes', category: 'patients' },
  { value: 'appointment_count', label: 'Total de Consultas', category: 'appointments' },
  { value: 'occupancy_rate', label: 'Taxa de Ocupação', category: 'operational' },
  { value: 'no_show_rate', label: 'Taxa de No-Show', category: 'operational' },
  { value: 'treatment_sessions', label: 'Sessões de Tratamento', category: 'clinical' },
  { value: 'avg_pain_level', label: 'Nível Médio de Dor', category: 'clinical' },
];

const CHART_TYPES = [
  { value: 'line', label: 'Linha', icon: LineChart },
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'pie', label: 'Pizza', icon: PieChart },
  { value: 'table', label: 'Tabela', icon: Table },
];

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Igual a' },
  { value: 'not_equals', label: 'Diferente de' },
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
  { value: 'contains', label: 'Contém' },
  { value: 'between', label: 'Entre' },
];

export function ReportBuilder({ onSave, onPreview, initialConfig }: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>(initialConfig || {
    name: '',
    description: '',
    template_type: 'custom',
    query_config: {
      metrics: [],
      charts: [],
      filters: [],
      period: 'monthly'
    }
  });

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    config.query_config.metrics || []
  );

  const updateConfig = (path: string, value: unknown) => {
    const keys = path.split('.');
    const newConfig = { ...config };
    
    let current: Record<string, unknown> = newConfig as Record<string, unknown>;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setConfig(newConfig);
  };

  const addChart = (type: ChartConfig['type']) => {
    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      type,
      title: `Novo Gráfico ${type}`,
      metric: selectedMetrics[0] || 'total_revenue'
    };

    updateConfig('query_config.charts', [...config.query_config.charts, newChart]);
  };

  const removeChart = (chartId: string) => {
    updateConfig(
      'query_config.charts',
      config.query_config.charts.filter(c => c.id !== chartId)
    );
  };

  const updateChart = (chartId: string, updates: Partial<ChartConfig>) => {
    updateConfig(
      'query_config.charts',
      config.query_config.charts.map(c => 
        c.id === chartId ? { ...c, ...updates } : c
      )
    );
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(config.query_config.charts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateConfig('query_config.charts', items);
  };

  const addFilter = () => {
    const newFilter: FilterConfig = {
      field: 'created_at',
      operator: 'between',
      value: '',
      label: 'Novo Filtro'
    };

    updateConfig('query_config.filters', [...config.query_config.filters, newFilter]);
  };

  const removeFilter = (index: number) => {
    updateConfig(
      'query_config.filters',
      config.query_config.filters.filter((_, i) => i !== index)
    );
  };

  const handleMetricToggle = (metric: string) => {
    const newMetrics = selectedMetrics.includes(metric)
      ? selectedMetrics.filter(m => m !== metric)
      : [...selectedMetrics, metric];
    
    setSelectedMetrics(newMetrics);
    updateConfig('query_config.metrics', newMetrics);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Construtor de Relatórios</h2>
          <p className="text-muted-foreground">
            Crie relatórios personalizados arrastando e configurando elementos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onPreview(config)}>
            <Play className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button onClick={() => onSave(config)}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Relatório
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Configurações Básicas</TabsTrigger>
          <TabsTrigger value="metrics">Métricas e Dados</TabsTrigger>
          <TabsTrigger value="charts">Gráficos e Visualizações</TabsTrigger>
          <TabsTrigger value="filters">Filtros</TabsTrigger>
          <TabsTrigger value="schedule">Agendamento</TabsTrigger>
        </TabsList>

        {/* Basic Configuration */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Relatório</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => updateConfig('name', e.target.value)}
                  placeholder="Digite o nome do relatório"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => updateConfig('description', e.target.value)}
                  placeholder="Descreva o propósito e conteúdo do relatório"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="period">Período Padrão</Label>
                <Select
                  value={config.query_config.period}
                  onValueChange={(value) => updateConfig('query_config.period', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Selection */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Métricas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Escolha quais métricas deseja incluir no relatório
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['financial', 'patients', 'appointments', 'operational', 'clinical'].map(category => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium capitalize">{category}</h4>
                    <div className="space-y-2">
                      {AVAILABLE_METRICS
                        .filter(metric => metric.category === category)
                        .map(metric => (
                          <div key={metric.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={metric.value}
                              checked={selectedMetrics.includes(metric.value)}
                              onCheckedChange={() => handleMetricToggle(metric.value)}
                            />
                            <Label 
                              htmlFor={metric.value}
                              className="text-sm cursor-pointer"
                            >
                              {metric.label}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedMetrics.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Métricas Selecionadas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMetrics.map(metric => {
                      const metricInfo = AVAILABLE_METRICS.find(m => m.value === metric);
                      return (
                        <Badge key={metric} variant="secondary">
                          {metricInfo?.label || metric}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Configuration */}
        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Gráficos e Visualizações
                <div className="flex gap-2">
                  {CHART_TYPES.map(chartType => {
                    const Icon = chartType.icon;
                    return (
                      <Button
                        key={chartType.value}
                        variant="outline"
                        size="sm"
                        onClick={() => addChart(chartType.value as ChartConfig['type'])}
                        className="gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        {chartType.label}
                      </Button>
                    );
                  })}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="charts">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {config.query_config.charts.map((chart, index) => (
                        <Draggable key={chart.id} draggableId={chart.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "bg-card border rounded-lg p-4 space-y-4",
                                snapshot.isDragging && "shadow-lg"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <Badge variant="outline" className="capitalize">
                                    {chart.type}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeChart(chart.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Título do Gráfico</Label>
                                  <Input
                                    value={chart.title}
                                    onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                                    placeholder="Nome do gráfico"
                                  />
                                </div>
                                <div>
                                  <Label>Métrica</Label>
                                  <Select
                                    value={chart.metric}
                                    onValueChange={(value) => updateChart(chart.id, { metric: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectedMetrics.map(metric => {
                                        const metricInfo = AVAILABLE_METRICS.find(m => m.value === metric);
                                        return (
                                          <SelectItem key={metric} value={metric}>
                                            {metricInfo?.label || metric}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {config.query_config.charts.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum gráfico adicionado ainda</p>
                          <p className="text-sm">Use os botões acima para adicionar visualizações</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filters Configuration */}
        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Filtros de Dados
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Filtro
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.query_config.filters.map((filter, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <Label>Campo</Label>
                      <Select
                        value={filter.field}
                        onValueChange={(value) => {
                          const newFilters = [...config.query_config.filters];
                          newFilters[index] = { ...filter, field: value };
                          updateConfig('query_config.filters', newFilters);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at">Data de Criação</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="therapist_id">Profissional</SelectItem>
                          <SelectItem value="patient_id">Paciente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Operador</Label>
                      <Select
                        value={filter.operator}
                        onValueChange={(value) => {
                          const newFilters = [...config.query_config.filters];
                          newFilters[index] = { ...filter, operator: value };
                          updateConfig('query_config.filters', newFilters);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_OPERATORS.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Valor</Label>
                      <Input
                        value={filter.value}
                        onChange={(e) => {
                          const newFilters = [...config.query_config.filters];
                          newFilters[index] = { ...filter, value: e.target.value };
                          updateConfig('query_config.filters', newFilters);
                        }}
                        placeholder="Valor do filtro"
                      />
                    </div>

                    <div>
                      <Label>Rótulo</Label>
                      <Input
                        value={filter.label}
                        onChange={(e) => {
                          const newFilters = [...config.query_config.filters];
                          newFilters[index] = { ...filter, label: e.target.value };
                          updateConfig('query_config.filters', newFilters);
                        }}
                        placeholder="Nome do filtro"
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {config.query_config.filters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum filtro configurado</p>
                  <p className="text-sm">Filtros permitem segmentar os dados do relatório</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Configuration */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agendamento Automático</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure quando e para quem o relatório deve ser enviado automaticamente
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Frequência</Label>
                <Select
                  value={config.schedule_config?.frequency || ''}
                  onValueChange={(value) => updateConfig('schedule_config.frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.schedule_config?.frequency && (
                <>
                  <div>
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={config.schedule_config?.time || '09:00'}
                      onChange={(e) => updateConfig('schedule_config.time', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Destinatários (emails separados por vírgula)</Label>
                    <Textarea
                      value={config.schedule_config?.recipients?.join(', ') || ''}
                      onChange={(e) => updateConfig('schedule_config.recipients', e.target.value.split(', ').filter(Boolean))}
                      placeholder="email1@example.com, email2@example.com"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}