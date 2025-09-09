/**
 * Componente de Configuração de Analytics - FisioFlow
 * Permite aos administradores configurar e gerenciar o sistema de analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  BarChart3, 
  Shield, 
  Database, 
  Globe, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Trash2
} from 'lucide-react';
import { analytics } from '@/utils/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsConfigProps {
  className?: string;
}

interface ConfigSettings {
  enabled: boolean;
  gaTrackingId: string;
  customEndpoint: string;
  dataRetentionDays: number;
  anonymizeIp: boolean;
  trackPageViews: boolean;
  trackUserInteractions: boolean;
  trackPerformance: boolean;
  trackErrors: boolean;
  batchSize: number;
  flushInterval: number;
}

const AnalyticsConfig: React.FC<AnalyticsConfigProps> = ({ className }) => {
  const { trackInteraction } = useAnalytics();
  const [config, setConfig] = useState<ConfigSettings>({
    enabled: true,
    gaTrackingId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
    customEndpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || '',
    dataRetentionDays: 90,
    anonymizeIp: true,
    trackPageViews: true,
    trackUserInteractions: true,
    trackPerformance: true,
    trackErrors: true,
    batchSize: 10,
    flushInterval: 30000
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [analyticsStatus, setAnalyticsStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [eventCount, setEventCount] = useState(0);
  const [queueSize, setQueueSize] = useState(0);

  // Verificar status do analytics
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Verificar se o analytics está funcionando
        const isWorking = analytics.isInitialized();
        setAnalyticsStatus(isWorking ? 'connected' : 'disconnected');
        
        // Obter métricas da fila
        const metrics = analytics.getQueueMetrics();
        setEventCount(metrics.totalEvents || 0);
        setQueueSize(metrics.queueSize || 0);
      } catch (error) {
        setAnalyticsStatus('error');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (key: keyof ConfigSettings, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    trackInteraction('save_config', 'analytics_settings');
    
    try {
      // Simular salvamento das configurações
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aplicar configurações ao analytics
      if (config.enabled) {
        analytics.updateConfig({
          batchSize: config.batchSize,
          flushInterval: config.flushInterval,
          endpoint: config.customEndpoint
        });
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    trackInteraction('test_connection', 'analytics_config');
    
    try {
      // Enviar evento de teste
      analytics.track('config_test', {
        timestamp: Date.now(),
        source: 'analytics_config'
      });
      
      setAnalyticsStatus('connected');
    } catch (error) {
      setAnalyticsStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlushEvents = () => {
    trackInteraction('flush_events', 'analytics_config');
    analytics.flushEvents();
    setQueueSize(0);
  };

  const handleClearData = async () => {
    if (confirm('Tem certeza que deseja limpar todos os dados de analytics? Esta ação não pode ser desfeita.')) {
      trackInteraction('clear_data', 'analytics_config');
      
      try {
        // Simular limpeza de dados
        await new Promise(resolve => setTimeout(resolve, 1000));
        setEventCount(0);
        setQueueSize(0);
      } catch (error) {
        console.error('Erro ao limpar dados:', error);
      }
    }
  };

  const handleExportData = () => {
    trackInteraction('export_data', 'analytics_config');
    
    // Simular exportação de dados
    const data = {
      config,
      status: analyticsStatus,
      eventCount,
      queueSize,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fisioflow-analytics-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = () => {
    switch (analyticsStatus) {
      case 'connected': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (analyticsStatus) {
      case 'connected': return 'Conectado';
      case 'error': return 'Erro';
      default: return 'Desconectado';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Configuração de Analytics
              </CardTitle>
              <CardDescription>
                Configure e monitore o sistema de analytics do FisioFlow
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                {getStatusText()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Testar Conexão
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{eventCount}</div>
              <div className="text-sm text-blue-600">Eventos Coletados</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{queueSize}</div>
              <div className="text-sm text-orange-600">Na Fila</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {config.dataRetentionDays}d
              </div>
              <div className="text-sm text-green-600">Retenção</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="tracking">Rastreamento</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics-enabled">Habilitar Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar ou desativar completamente o sistema de analytics
                  </p>
                </div>
                <Switch
                  id="analytics-enabled"
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="ga-tracking-id">Google Analytics ID</Label>
                <Input
                  id="ga-tracking-id"
                  placeholder="G-XXXXXXXXXX"
                  value={config.gaTrackingId}
                  onChange={(e) => handleConfigChange('gaTrackingId', e.target.value)}
                  disabled={!config.enabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-endpoint">Endpoint Personalizado</Label>
                <Input
                  id="custom-endpoint"
                  placeholder="https://api.fisioflow.com/analytics"
                  value={config.customEndpoint}
                  onChange={(e) => handleConfigChange('customEndpoint', e.target.value)}
                  disabled={!config.enabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retention-days">Retenção de Dados (dias)</Label>
                <Input
                  id="retention-days"
                  type="number"
                  min="1"
                  max="365"
                  value={config.dataRetentionDays}
                  onChange={(e) => handleConfigChange('dataRetentionDays', parseInt(e.target.value))}
                  disabled={!config.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Settings */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Configurações de Rastreamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'trackPageViews', label: 'Visualizações de Página', desc: 'Rastrear quando usuários visitam páginas' },
                { key: 'trackUserInteractions', label: 'Interações do Usuário', desc: 'Rastrear cliques, formulários e navegação' },
                { key: 'trackPerformance', label: 'Métricas de Performance', desc: 'Rastrear tempos de carregamento e performance' },
                { key: 'trackErrors', label: 'Rastreamento de Erros', desc: 'Capturar e reportar erros da aplicação' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <Label>{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={config[item.key as keyof ConfigSettings] as boolean}
                    onCheckedChange={(checked) => handleConfigChange(item.key as keyof ConfigSettings, checked)}
                    disabled={!config.enabled}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Configurações de Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Anonimizar IP</Label>
                  <p className="text-sm text-muted-foreground">
                    Remover os últimos octetos dos endereços IP para proteção de privacidade
                  </p>
                </div>
                <Switch
                  checked={config.anonymizeIp}
                  onCheckedChange={(checked) => handleConfigChange('anonymizeIp', checked)}
                  disabled={!config.enabled}
                />
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  O FisioFlow está em conformidade com a LGPD. Todos os dados são coletados de forma anônima 
                  e utilizados apenas para melhorar a experiência do usuário.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Configurações Avançadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Tamanho do Lote</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min="1"
                    max="100"
                    value={config.batchSize}
                    onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                    disabled={!config.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de eventos enviados por lote
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="flush-interval">Intervalo de Envio (ms)</Label>
                  <Input
                    id="flush-interval"
                    type="number"
                    min="1000"
                    max="300000"
                    step="1000"
                    value={config.flushInterval}
                    onChange={(e) => handleConfigChange('flushInterval', parseInt(e.target.value))}
                    disabled={!config.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Frequência de envio dos eventos em lote
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFlushEvents}
                  disabled={queueSize === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Enviar Fila ({queueSize})
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Configuração
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearData}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {lastSaved && (
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Salvo em {lastSaved.toLocaleString()}
            </span>
          )}
        </div>
        
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Settings className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default AnalyticsConfig;