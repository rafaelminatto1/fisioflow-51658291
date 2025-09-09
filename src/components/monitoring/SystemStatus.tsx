import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { monitoring } from '../../utils/monitoring';

interface SystemStatusProps {
  showDetails?: boolean;
  className?: string;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const [systemStatus, setSystemStatus] = useState(monitoring.getSystemStatus());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Atualizar status periodicamente
  useEffect(() => {
    const updateStatus = () => {
      setSystemStatus(monitoring.getSystemStatus());
      setLastUpdate(new Date());
    };

    // Atualizar a cada 30 segundos
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Executar health checks manualmente
  const runHealthChecks = async () => {
    setIsLoading(true);
    try {
      await monitoring.runHealthChecks();
      setSystemStatus(monitoring.getSystemStatus());
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to run health checks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ícone baseado no status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  // Cor baseada no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Formatação de tempo
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Tempo desde a última verificação
  const getTimeSinceLastCheck = () => {
    if (!systemStatus.lastCheck) return 'Nunca';
    
    const now = Date.now();
    const diff = now - systemStatus.lastCheck;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes === 1) return '1 minuto atrás';
    return `${minutes} minutos atrás`;
  };

  if (!showDetails) {
    // Versão compacta - apenas indicador de status
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {getStatusIcon(systemStatus.overall)}
        <span className="text-sm font-medium capitalize">
          {systemStatus.overall === 'healthy' ? 'Online' : 
           systemStatus.overall === 'degraded' ? 'Lento' : 'Offline'}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Status do Sistema</h3>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
              getStatusColor(systemStatus.overall)
            }`}>
              {systemStatus.overall === 'healthy' ? 'Operacional' :
               systemStatus.overall === 'degraded' ? 'Degradado' : 'Indisponível'}
            </div>
            
            <button
              onClick={runHealthChecks}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Atualizar status"
            >
              <Activity className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="p-4">
        <div className="space-y-3">
          {Array.from(systemStatus.services.entries()).map(([service, check]) => (
            <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <div className="font-medium text-gray-900 capitalize">
                    {service === 'supabase' ? 'Banco de Dados' : 
                     service === 'api' ? 'API' : service}
                  </div>
                  {check.error && (
                    <div className="text-sm text-red-600">
                      {check.error}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right text-sm text-gray-500">
                {check.responseTime && (
                  <div>{check.responseTime}ms</div>
                )}
                <div>{formatTime(check.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Last Update */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Última verificação: {getTimeSinceLastCheck()}</span>
            </div>
            <div>
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;

// Hook para usar o status do sistema
export const useSystemStatus = () => {
  const [status, setStatus] = useState(monitoring.getSystemStatus());

  useEffect(() => {
    const updateStatus = () => {
      setStatus(monitoring.getSystemStatus());
    };

    const interval = setInterval(updateStatus, 10000); // Atualizar a cada 10s
    return () => clearInterval(interval);
  }, []);

  return {
    status,
    isHealthy: status.overall === 'healthy',
    isDegraded: status.overall === 'degraded',
    isUnhealthy: status.overall === 'unhealthy',
    runHealthChecks: () => monitoring.runHealthChecks()
  };
};