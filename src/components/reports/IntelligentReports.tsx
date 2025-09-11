import React, { useState, useEffect } from 'react';
import { useIntelligentReports, formatMetricValue, getMetricTrendColor, getInsightTypeIcon, getPriorityColor, getConfidenceColor, formatPeriod, getReportTypeLabel } from '../../hooks/useIntelligentReports';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, Calendar, Filter, TrendingUp, TrendingDown, Minus, AlertCircle, Lightbulb, Target, Clock, Users, DollarSign, Activity, Settings, Plus, Eye, Share2, RefreshCw, Zap } from 'lucide-react';

interface IntelligentReportsProps {
  userId: string;
}

// Componente para exibir métricas
const MetricCard: React.FC<{ metric: any }> = ({ metric }) => {
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{metric.name}</h3>
        <div className={`flex items-center space-x-1 ${getMetricTrendColor(metric.trend)}`}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {metric.changePercent ? `${metric.changePercent > 0 ? '+' : ''}${metric.changePercent.toFixed(1)}%` : ''}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-2xl font-bold text-gray-900">
          {formatMetricValue(metric)}
        </div>
        
        {metric.target && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Target className="h-4 w-4" />
            <span>Meta: {formatMetricValue({ ...metric, value: metric.target })}</span>
          </div>
        )}
        
        {metric.previousValue && (
          <div className="text-sm text-gray-500">
            Anterior: {formatMetricValue({ ...metric, value: metric.previousValue })}
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">{metric.description}</p>
      </div>
    </div>
  );
};

// Componente para exibir insights
const InsightCard: React.FC<{ insight: any }> = ({ insight }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getInsightTypeIcon(insight.type)}</div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                {insight.confidence}% confiança
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {insight.impact === 'high' ? 'Alto Impacto' : insight.impact === 'medium' ? 'Médio Impacto' : 'Baixo Impacto'}
              </span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-3">{insight.description}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{insight.category}</span>
            {insight.actionable && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Acionável
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para exibir recomendações
const RecommendationCard: React.FC<{ recommendation: any; onUpdateStatus: (id: string, status: string) => void }> = ({ recommendation, onUpdateStatus }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(recommendation.priority)}`}>
              {recommendation.priority === 'urgent' ? 'Urgente' :
               recommendation.priority === 'high' ? 'Alta' :
               recommendation.priority === 'medium' ? 'Média' : 'Baixa'}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3">{recommendation.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Target className="h-4 w-4" />
              <span>{recommendation.estimatedImpact}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{recommendation.timeline}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              <span>Esforço: {recommendation.effort === 'low' ? 'Baixo' : recommendation.effort === 'medium' ? 'Médio' : 'Alto'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>{recommendation.category}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Passos para Implementação:</h4>
            <ul className="space-y-1">
              {recommendation.steps.map((step: string, index: number) => (
                <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <select
          value={recommendation.status}
          onChange={(e) => onUpdateStatus(recommendation.id, e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluída</option>
          <option value="dismissed">Dispensada</option>
        </select>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para exibir gráficos
const ChartWidget: React.FC<{ chart: any }> = ({ chart }) => {
  const renderChart = () => {
    switch (chart.type) {
      case 'line':
        return (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xAxis || 'month'} />
            <YAxis />
            <Tooltip formatter={(value) => [value.toLocaleString('pt-BR'), 'Valor']} />
            <Legend />
            <Line type="monotone" dataKey={chart.yAxis || 'value'} stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        );
      
      case 'bar':
        return (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xAxis || 'category'} />
            <YAxis />
            <Tooltip formatter={(value) => [value.toLocaleString('pt-BR'), 'Valor']} />
            <Legend />
            <Bar dataKey={chart.yAxis || 'value'} fill="#3B82F6" />
          </BarChart>
        );
      
      case 'area':
        return (
          <AreaChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xAxis || 'month'} />
            <YAxis />
            <Tooltip formatter={(value) => [value.toLocaleString('pt-BR'), 'Valor']} />
            <Legend />
            <Area type="monotone" dataKey={chart.yAxis || 'value'} stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
          </AreaChart>
        );
      
      case 'pie':
        const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        return (
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chart.data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      
      default:
        return <div className="flex items-center justify-center h-64 text-gray-500">Tipo de gráfico não suportado</div>;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${
      chart.size === 'small' ? 'col-span-1' :
      chart.size === 'medium' ? 'col-span-2' :
      chart.size === 'large' ? 'col-span-3' :
      'col-span-4'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{chart.title}</h3>
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Settings className="h-4 w-4" />
        </button>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Componente para filtros
const ReportFilters: React.FC<{ filters: any; onFiltersChange: (filters: any) => void; templates: any }> = ({ filters, onFiltersChange, templates }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: { ...filters.dateRange, start: new Date(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: { ...filters.dateRange, end: new Date(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
          <select
            value={filters.type || ''}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os tipos</option>
            <option value="financial">Financeiro</option>
            <option value="clinical">Clínico</option>
            <option value="operational">Operacional</option>
            <option value="patient">Paciente</option>
            <option value="therapist">Terapeuta</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="generating">Gerando</option>
            <option value="ready">Pronto</option>
            <option value="error">Erro</option>
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={() => onFiltersChange({
              dateRange: {
                start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                end: new Date()
              }
            })}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente principal
const IntelligentReports: React.FC<IntelligentReportsProps> = ({ userId }) => {
  const {
    reports,
    isGenerating,
    selectedReport,
    filters,
    templates,
    generateReport,
    exportReport,
    scheduleReport,
    compareReports,
    setSelectedReport,
    setFilters
  } = useIntelligentReports();

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'insights' | 'recommendations' | 'templates'>('overview');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [newReportConfig, setNewReportConfig] = useState({
    templateId: '',
    title: '',
    description: '',
    period: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date()
    },
    autoGenerate: false,
    recipients: []
  });

  // Atualizar status de recomendação
  const handleUpdateRecommendationStatus = (recommendationId: string, status: string) => {
    // Em produção, fazer chamada para API
    console.log('Atualizando status da recomendação:', recommendationId, status);
  };

  // Gerar novo relatório
  const handleGenerateReport = async () => {
    if (!newReportConfig.templateId) return;
    
    try {
      await generateReport(newReportConfig.templateId, newReportConfig.period, {
        title: newReportConfig.title,
        description: newReportConfig.description,
        autoGenerate: newReportConfig.autoGenerate,
        recipients: newReportConfig.recipients
      });
      
      setShowNewReportModal(false);
      setNewReportConfig({
        templateId: '',
        title: '',
        description: '',
        period: {
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          end: new Date()
        },
        autoGenerate: false,
        recipients: []
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    }
  };

  // Exportar relatório
  const handleExportReport = async (reportId: string) => {
    try {
      await exportReport(reportId, {
        format: 'pdf',
        includeCharts: true,
        includeInsights: true,
        includeRecommendations: true,
        branding: true
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
    }
  };

  // Comparar relatórios selecionados
  const handleCompareReports = () => {
    if (selectedReports.length < 2) {
      alert('Selecione pelo menos 2 relatórios para comparar');
      return;
    }
    
    try {
      const comparison = compareReports(selectedReports);
      console.log('Comparação gerada:', comparison);
      // Abrir modal de comparação ou navegar para página de comparação
    } catch (error) {
      console.error('Erro ao comparar relatórios:', error);
    }
  };

  // Obter estatísticas gerais
  const getOverviewStats = () => {
    const totalReports = reports.length;
    const readyReports = reports.filter(r => r.status === 'ready').length;
    const totalInsights = reports.reduce((sum, r) => sum + r.insights.length, 0);
    const totalRecommendations = reports.reduce((sum, r) => sum + r.recommendations.length, 0);
    const pendingRecommendations = reports.reduce((sum, r) => sum + r.recommendations.filter(rec => rec.status === 'pending').length, 0);
    
    return {
      totalReports,
      readyReports,
      totalInsights,
      totalRecommendations,
      pendingRecommendations
    };
  };

  const stats = getOverviewStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios Inteligentes</h1>
            <p className="text-gray-600 mt-2">Insights automáticos e análises avançadas dos seus dados</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNewReportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Novo Relatório</span>
            </button>
            
            {selectedReports.length > 1 && (
              <button
                onClick={handleCompareReports}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Eye className="h-5 w-5" />
                <span>Comparar ({selectedReports.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Visão Geral', icon: Activity },
            { id: 'reports', label: 'Relatórios', icon: FileText },
            { id: 'insights', label: 'Insights', icon: Lightbulb },
            { id: 'recommendations', label: 'Recomendações', icon: Target },
            { id: 'templates', label: 'Templates', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo das abas */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Estatísticas gerais */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Relatórios</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Relatórios Prontos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.readyReports}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Lightbulb className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Insights Gerados</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalInsights}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recomendações</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalRecommendations}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ações Pendentes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingRecommendations}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Relatórios recentes */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Relatórios Recentes</h3>
              <div className="space-y-4">
                {reports.slice(0, 3).map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        report.type === 'financial' ? 'bg-green-100 text-green-600' :
                        report.type === 'clinical' ? 'bg-blue-100 text-blue-600' :
                        report.type === 'operational' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{report.title}</h4>
                        <p className="text-sm text-gray-500">
                          {getReportTypeLabel(report.type)} • {formatPeriod(report.period)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'ready' ? 'bg-green-100 text-green-800' :
                        report.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.status === 'ready' ? 'Pronto' :
                         report.status === 'generating' ? 'Gerando' : 'Erro'}
                      </span>
                      
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleExportReport(report.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <ReportFilters filters={filters} onFiltersChange={setFilters} templates={templates} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {reports.map(report => (
                <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(report.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReports(prev => [...prev, report.id]);
                            } else {
                              setSelectedReports(prev => prev.filter(id => id !== report.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{report.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        <span>{getReportTypeLabel(report.type)}</span>
                        <span>•</span>
                        <span>{formatPeriod(report.period)}</span>
                        <span>•</span>
                        <span>{report.generatedAt.toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Lightbulb className="h-4 w-4" />
                          <span>{report.insights.length} insights</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Target className="h-4 w-4" />
                          <span>{report.recommendations.length} recomendações</span>
                        </div>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      report.status === 'ready' ? 'bg-green-100 text-green-800' :
                      report.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.status === 'ready' ? 'Pronto' :
                       report.status === 'generating' ? 'Gerando' : 'Erro'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Visualizar</span>
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleExportReport(report.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reports.flatMap(report => report.insights).map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reports.flatMap(report => report.recommendations).map(recommendation => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onUpdateStatus={handleUpdateRecommendationStatus}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(templates).map(template => (
                <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                      <p className="text-gray-600 mb-3">{template.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        <span>{getReportTypeLabel(template.type)}</span>
                        <span>•</span>
                        <span>{template.defaultPeriod === 'daily' ? 'Diário' :
                               template.defaultPeriod === 'weekly' ? 'Semanal' :
                               template.defaultPeriod === 'monthly' ? 'Mensal' :
                               template.defaultPeriod === 'quarterly' ? 'Trimestral' : 'Anual'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Activity className="h-4 w-4" />
                          <span>{template.metrics.length} métricas</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <BarChart className="h-4 w-4" />
                          <span>{template.charts.length} gráficos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {template.autoInsights && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          IA
                        </span>
                      )}
                      {template.customizable && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Personalizável
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setNewReportConfig(prev => ({ ...prev, templateId: template.id }));
                        setShowNewReportModal(true);
                      }}
                      className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Usar Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de visualização de relatório */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedReport.title}</h2>
                    <p className="text-gray-600 mt-1">{selectedReport.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExportReport(selectedReport.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exportar</span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Métricas */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas Principais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedReport.metrics.map(metric => (
                      <MetricCard key={metric.id} metric={metric} />
                    ))}
                  </div>
                </div>
                
                {/* Gráficos */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualizações</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {selectedReport.charts.map(chart => (
                      <ChartWidget key={chart.id} chart={chart} />
                    ))}
                  </div>
                </div>
                
                {/* Insights */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights da IA</h3>
                  <div className="space-y-4">
                    {selectedReport.insights.map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </div>
                
                {/* Recomendações */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendações</h3>
                  <div className="space-y-4">
                    {selectedReport.recommendations.map(recommendation => (
                      <RecommendationCard
                        key={recommendation.id}
                        recommendation={recommendation}
                        onUpdateStatus={handleUpdateRecommendationStatus}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de novo relatório */}
        {showNewReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Gerar Novo Relatório</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                  <select
                    value={newReportConfig.templateId}
                    onChange={(e) => setNewReportConfig(prev => ({ ...prev, templateId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um template</option>
                    {Object.values(templates).map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                  <input
                    type="text"
                    value={newReportConfig.title}
                    onChange={(e) => setNewReportConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Título do relatório"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <textarea
                    value={newReportConfig.description}
                    onChange={(e) => setNewReportConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descrição do relatório"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                    <input
                      type="date"
                      value={newReportConfig.period.start.toISOString().split('T')[0]}
                      onChange={(e) => setNewReportConfig(prev => ({
                        ...prev,
                        period: { ...prev.period, start: new Date(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                    <input
                      type="date"
                      value={newReportConfig.period.end.toISOString().split('T')[0]}
                      onChange={(e) => setNewReportConfig(prev => ({
                        ...prev,
                        period: { ...prev.period, end: new Date(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoGenerate"
                    checked={newReportConfig.autoGenerate}
                    onChange={(e) => setNewReportConfig(prev => ({ ...prev, autoGenerate: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoGenerate" className="text-sm text-gray-700">
                    Gerar automaticamente no futuro
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-4">
                <button
                  onClick={() => setShowNewReportModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleGenerateReport}
                  disabled={!newReportConfig.templateId || isGenerating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isGenerating && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>{isGenerating ? 'Gerando...' : 'Gerar Relatório'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligentReports;