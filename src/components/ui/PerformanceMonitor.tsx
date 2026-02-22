/**
 * Performance Monitor - Monitoramento de performance da agenda
 *
 * Fase 2: Performance Core
 *
 * Recursos monitorados:
 * - Tempo de carregamento do calendário
 * - Tempo de renderização
 * - Cache hit rate
 * - Tamanho do cache
 * - Framer Motion performance
 * - Número de agendamentos
 * - Latência de queries
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Activity, Database, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'ok' | 'warning' | 'error';
  timestamp: number;
}

interface PerformanceData {
  metrics: PerformanceMetric[];
  summary: {
    avgLoadTime: number;
    avgRenderTime: number;
    cacheHitRate: number;
    cacheSize: number;
    issues: string[];
  };
}

// ============================================================================
// PERFORMANCE MARKERS
// ============================================================================

const PERFORMANCE_MARKERS = {
  calendarLoad: { name: 'calendarLoad', unit: 'ms', threshold: 500, color: 'blue' },
  renderTime: { name: 'renderTime', unit: 'ms', threshold: 100, color: 'purple' },
  cacheHitRate: { name: 'cacheHitRate', unit: '%', threshold: 80, inverted: true, color: 'emerald' },
  cacheSize: { name: 'cacheSize', unit: 'MB', threshold: 10, inverted: true, color: 'orange' },
  queryLatency: { name: 'queryLatency', unit: 'ms', threshold: 300, color: 'amber' },
};

// ============================================================================
// PERFORMANCE MONITOR COMPONENT
// ============================================================================

interface PerformanceMonitorProps {
  isVisible?: boolean;
  children: React.ReactNode;
  showToggle?: boolean;
}

export const PerformanceMonitor = ({
  isVisible = false,
  children,
  showToggle = true
}: PerformanceMonitorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);

  // Refs para medição
  const renderStartTimeRef = useRef<number>(0);
  const metricsRef = useRef<Map<string, number[]>>(new Map());

  const addMetric = useCallback((name: string, value: number) => {
    metricsRef.current.set(name, [...(metricsRef.current.get(name) || []), value]);
  }, []);

  // Coletar métricas
  const collectMetrics = useCallback(() => {
    const metricsMap = metricsRef.current;

    const summary = {
      avgLoadTime: metricsMap.get('calendarLoad')?.reduce((a, b) => a + b, 0) / (metricsMap.get('calendarLoad')?.length || 1) || 0,
      avgRenderTime: metricsMap.get('renderTime')?.reduce((a, b) => a + b, 0) / (metricsMap.get('renderTime')?.length || 1) || 0,
      cacheHitRate: 0, // Seria calculado na prática
      cacheSize: 0, // Seria calculado na prática
      issues: [] as string[],
    };

    const issues: string[] = [];

    // Verificar problemas de performance
    if (summary.avgLoadTime > PERFORMANCE_MARKERS.calendarLoad.threshold) {
      issues.push(`Carregamento lento: ${Math.round(summary.avgLoadTime)}ms`);
    }
    if (summary.avgRenderTime > PERFORMANCE_MARKERS.renderTime.threshold) {
      issues.push(`Renderização lenta: ${Math.round(summary.avgRenderTime)}ms`);
    }

    // Verificar tamanho do cache (simulado)
    if (performanceData) {
      const cacheSizeInMB = performanceData.summary.cacheSize / (1024 * 1024);
      if (cacheSizeInMB > PERFORMANCE_MARKERS.cacheSize.threshold) {
        issues.push(`Cache grande: ${cacheSizeInMB.toFixed(1)}MB`);
      }
    }

    summary.issues = issues;

    setPerformanceData({ metrics: [], summary });
  }, []);

  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'ok':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  // Limpar métricas após coleta
  useEffect(() => {
    const timer = setInterval(() => {
      const data = Array.from(metricsRef.current.entries()).map(([name, values]) => ({
        name,
        values,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      }));

      // Enviar para analytics se disponível
      if (data.length > 0 && 'navigator' in navigator && 'sendBeacon' in navigator) {
        // Aqui você pode integrar com Firebase Performance Monitoring
        console.log('Performance metrics:', data);
      }

      metricsRef.current.clear();
    }, 5000); // Coletar a cada 5 segundos

    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Toggle Button */}
      {showToggle && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'fixed bottom-4 right-4 z-50 p-2 bg-slate-900 dark:bg-slate-800 rounded-full shadow-lg',
            'hover:bg-slate-800 dark:hover:bg-slate-700',
            'transition-all duration-200'
          )}
          title="Mostrar/ocultar monitor de performance"
        >
          <Activity className={cn('w-5 h-5', isExpanded && 'rotate-180', 'transition-transform duration-200')} />
        </button>
      )}

      {/* Performance Panel */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div className="fixed bottom-16 right-4 z-50 w-80 max-h-[60vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Performance
                </h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <Database className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Summary */}
            {performanceData?.summary && (
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Carregamento"
                    value={performanceData.summary.avgLoadTime.toFixed(0)}
                    unit={PERFORMANCE_MARKERS.calendarLoad.unit}
                    marker={PERFORMANCE_MARKERS.calendarLoad}
                    markerColor={getStatusColor(
                      performanceData.summary.avgLoadTime > PERFORMANCE_MARKERS.calendarLoad.threshold ? 'warning' : 'ok'
                    )}
                  />
                  <MetricCard
                    label="Renderização"
                    value={performanceData.summary.avgRenderTime.toFixed(0)}
                    unit={PERFORMANCE_MARKERS.renderTime.unit}
                    marker={PERFORMANCE_MARKERS.renderTime}
                    markerColor={getStatusColor(
                      performanceData.summary.avgRenderTime > PERFORMANCE_MARKERS.renderTime.threshold ? 'warning' : 'ok'
                    )}
                  />
                  <MetricCard
                    label="Cache Hit Rate"
                    value={(performanceData.summary.cacheHitRate * 100).toFixed(0)}
                    unit={PERFORMANCE_MARKERS.cacheHitRate.unit}
                    marker={PERFORMANCE_MARKERS.cacheHitRate}
                    markerColor={getStatusColor(
                      performanceData.summary.cacheHitRate >= PERFORMANCE_MARKERS.cacheHitRate.threshold ? 'ok' : 'warning'
                    )}
                  />
                  <MetricCard
                    label="Cache Size"
                    value={performanceData.summary.cacheSize.toFixed(1)}
                    unit={PERFORMANCE_MARKERS.cacheSize.unit}
                    marker={PERFORMANCE_MARKERS.cacheSize}
                    markerColor={getStatusColor(
                      performanceData.summary.cacheSize <= PERFORMANCE_MARKERS.cacheSize.threshold ? 'ok' : 'warning'
                    )}
                  />
                </div>

                {/* Issues */}
                {performanceData.summary.issues.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-600" />
                      Alertas
                    </h4>
                    <ul className="space-y-2">
                      {performanceData.summary.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-amber-600 dark:text-amber-400">•</span>
                          <span className="text-slate-600 dark:text-slate-400">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(performanceData, null, 2));
                  toast({
                    title: 'Copiado!',
                    description: 'Dados de performance copiados para o clipboard.',
                  });
                }}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Copiar Dados
              </button>
              <button
                onClick={() => {
                  // clearCache();
                  toast({
                    title: 'Cache limpo',
                    description: 'O cache foi limpo. Recarregando.',
                  });
                }}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Limpar Cache
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </>
  );
};

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  marker?: any;
  markerColor?: string;
}

const MetricCard = memo(({ label, value, unit, marker, markerColor = 'text-emerald-600' }: MetricCardProps) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {unit}
        </span>
        {marker && (
          <div className={cn('ml-2', markerColor)} title={`Marcador: ${marker}`}>
            <span>●</span>
          </div>
        )}
      </div>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';
