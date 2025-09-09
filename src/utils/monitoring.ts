/**
 * Sistema de Monitoramento - FisioFlow
 * Implementa health checks, error tracking e métricas de performance
 */

import React from 'react';

// Tipos para monitoramento
interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  responseTime?: number;
  error?: string;
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

// Configuração do monitoramento
const MONITORING_CONFIG = {
  healthCheckInterval: 30000, // 30 segundos
  errorReportingEnabled: true,
  performanceTrackingEnabled: true,
  maxErrorReports: 100,
  endpoints: {
    health: '/api/health',
    errors: '/api/errors',
    metrics: '/api/metrics'
  }
};

// Classe principal de monitoramento
class MonitoringService {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private errorReports: ErrorReport[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeErrorTracking();
    this.initializePerformanceTracking();
    this.startHealthChecks();
  }

  // Inicializar rastreamento de erros
  private initializeErrorTracking() {
    if (!MONITORING_CONFIG.errorReportingEnabled) return;

    // Capturar erros JavaScript
    window.addEventListener('error', (event) => {
      this.reportError({
        id: this.generateId(),
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        severity: 'high'
      });
    });

    // Capturar promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        id: this.generateId(),
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        severity: 'medium'
      });
    });
  }

  // Inicializar rastreamento de performance
  private initializePerformanceTracking() {
    if (!MONITORING_CONFIG.performanceTrackingEnabled) return;

    // Métricas de navegação
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        this.trackMetric('page_load_time', nav.loadEventEnd - nav.navigationStart);
        this.trackMetric('dom_content_loaded', nav.domContentLoadedEventEnd - nav.navigationStart);
        this.trackMetric('first_paint', nav.responseStart - nav.navigationStart);
      }
    }

    // Observer para Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.trackMetric('lcp', lastEntry.startTime, { url: window.location.pathname });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.trackMetric('fid', entry.processingStart - entry.startTime, { url: window.location.pathname });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.trackMetric('cls', clsValue, { url: window.location.pathname });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance Observer não suportado:', error);
      }
    }
  }

  // Iniciar health checks
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, MONITORING_CONFIG.healthCheckInterval);

    // Executar primeiro health check imediatamente
    this.performHealthChecks();
  }

  // Executar health checks
  private async performHealthChecks() {
    const services = [
      { name: 'api', url: '/api/health' },
      { name: 'database', url: '/api/health/database' },
      { name: 'auth', url: '/api/health/auth' }
    ];

    for (const service of services) {
      try {
        const startTime = Date.now();
        const response = await fetch(service.url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const responseTime = Date.now() - startTime;

        this.healthChecks.set(service.name, {
          service: service.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          timestamp: Date.now(),
          responseTime
        });
      } catch (error) {
        this.healthChecks.set(service.name, {
          service: service.name,
          status: 'unhealthy',
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  // Reportar erro
  public reportError(error: ErrorReport) {
    this.errorReports.push(error);
    
    // Manter apenas os últimos N relatórios
    if (this.errorReports.length > MONITORING_CONFIG.maxErrorReports) {
      this.errorReports = this.errorReports.slice(-MONITORING_CONFIG.maxErrorReports);
    }

    // Enviar para endpoint se configurado
    this.sendErrorReport(error);
  }

  // Rastrear métrica de performance
  public trackMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.performanceMetrics.push(metric);
    
    // Manter apenas as últimas 1000 métricas
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  // Obter status geral do sistema
  public getSystemStatus() {
    const healthChecks = Array.from(this.healthChecks.values());
    const unhealthyServices = healthChecks.filter(hc => hc.status === 'unhealthy');
    const degradedServices = healthChecks.filter(hc => hc.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      services: healthChecks,
      errorCount: this.errorReports.length,
      lastErrors: this.errorReports.slice(-5)
    };
  }

  // Obter métricas de performance
  public getPerformanceMetrics(timeRange?: number) {
    const cutoff = timeRange ? Date.now() - timeRange : 0;
    return this.performanceMetrics.filter(metric => metric.timestamp > cutoff);
  }

  // Enviar relatório de erro
  private async sendErrorReport(error: ErrorReport) {
    try {
      await fetch(MONITORING_CONFIG.endpoints.errors, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (err) {
      console.warn('Falha ao enviar relatório de erro:', err);
    }
  }

  // Gerar ID único
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Limpar recursos
  public destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Instância singleton
export const monitoring = new MonitoringService();

// Hook React para monitoramento
export const useMonitoring = () => {
  const reportError = (error: Error, severity: ErrorReport['severity'] = 'medium') => {
    monitoring.reportError({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      severity
    });
  };

  const trackMetric = (name: string, value: number, tags?: Record<string, string>) => {
    monitoring.trackMetric(name, value, tags);
  };

  const getSystemStatus = () => monitoring.getSystemStatus();
  const getPerformanceMetrics = (timeRange?: number) => monitoring.getPerformanceMetrics(timeRange);

  return {
    reportError,
    trackMetric,
    getSystemStatus,
    getPerformanceMetrics
  };
};

// Utilitários de monitoramento
export const MonitoringUtils = {
  // Medir tempo de execução de função
  measureExecutionTime: async <T>(fn: () => Promise<T>, metricName: string): Promise<T> => {
    const startTime = Date.now();
    try {
      const result = await fn();
      monitoring.trackMetric(metricName, Date.now() - startTime);
      return result;
    } catch (error) {
      monitoring.trackMetric(`${metricName}_error`, Date.now() - startTime);
      throw error;
    }
  },

  // Wrapper para componentes React com error boundary
  withErrorTracking: (Component: React.ComponentType<any>) => {
    return class extends React.Component {
      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        monitoring.reportError({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: error.message,
          stack: error.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          severity: 'high'
        });
      }

      render() {
        return React.createElement(Component, this.props);
      }
    };
  }
};

export default monitoring;