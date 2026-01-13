/**
 * Performance Dashboard Component
 *
 * Displays real-time performance metrics for Supabase queries and cache.
 * Only visible in development mode or with specific permissions.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueryOptimizer } from '@/hooks/database/useOptimizedQuery';
import { PerformanceMonitor } from '@/lib/database/performanceMonitor';
import { logger } from '@/lib/errors/logger';

interface QueryMetric {
  queryKey: string;
  duration: number;
  cacheHit: boolean;
  timestamp: number;
}

interface SlowQuery {
  queryId: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  maxTime: number;
  query: string;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<QueryMetric[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [avgTime, setAvgTime] = useState(0);
  const [cacheHitRate, setCacheHitRate] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      const allMetrics = QueryOptimizer.getQueryMetrics();
      const avg = QueryOptimizer.getAverageQueryTime();
      const hitRate = QueryOptimizer.getCacheHitRate();
      const slow = await PerformanceMonitor.getSlowQueries();

      setMetrics(allMetrics.slice(-20)); // Last 20 queries
      setAvgTime(avg);
      setCacheHitRate(hitRate);
      setSlowQueries(slow);
    } catch (error) {
      logger.error('Error refreshing performance metrics', error, 'PerformanceDashboard');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (value: number, type: 'duration' | 'cache') => {
    if (type === 'duration') {
      if (value < 100) return 'text-green-500';
      if (value < 500) return 'text-yellow-500';
      return 'text-red-500';
    } else {
      if (value > 70) return 'text-green-500';
      if (value > 40) return 'text-yellow-500';
      return 'text-red-500';
    }
  };

  // Only show in development
  if (import.meta.env.PROD && process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Performance Dashboard</CardTitle>
            <CardDescription>Real-time Supabase query metrics</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queries">Recent Queries</TabsTrigger>
            <TabsTrigger value="slow">Slow Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Avg Query Time</p>
                <p className={`text-2xl font-bold ${getScoreColor(avgTime, 'duration')}`}>
                  {formatDuration(avgTime)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                <p className={`text-2xl font-bold ${getScoreColor(cacheHitRate, 'cache')}`}>
                  {cacheHitRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{metrics.length}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Slow Queries</p>
                <p className="text-2xl font-bold text-red-500">{slowQueries.length}</p>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Cache Status</h4>
              <div className="flex gap-2">
                <Badge variant={cacheHitRate > 70 ? 'default' : 'secondary'}>
                  {cacheHitRate > 70 ? 'Good' : cacheHitRate > 40 ? 'Fair' : 'Poor'}
                </Badge>
                <Badge variant="outline">
                  {metrics.filter(m => m.cacheHit).length} hits
                </Badge>
                <Badge variant="outline">
                  {metrics.filter(m => !m.cacheHit).length} misses
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="queries" className="space-y-2">
            {metrics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No queries recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {metrics.map((metric, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={metric.cacheHit ? 'default' : 'secondary'}>
                        {metric.cacheHit ? 'CACHE' : 'DB'}
                      </Badge>
                      <code className="text-xs max-w-md truncate">
                        {metric.queryKey.replace(/"/g, '').slice(0, 50)}
                      </code>
                    </div>
                    <span className={metric.cacheHit ? 'text-green-500' : undefined}>
                      {formatDuration(metric.duration)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="slow" className="space-y-2">
            {slowQueries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No slow queries detected - Great job! 🎉
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {slowQueries.map((query, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="destructive">
                          {formatDuration(query.meanTime)} avg
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {query.calls} calls
                        </span>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {query.query}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Mini performance indicator for inline display
 */
export function PerformanceIndicator() {
  const [avgTime, setAvgTime] = useState(0);

  useEffect(() => {
    const updateAvg = () => {
      setAvgTime(QueryOptimizer.getAverageQueryTime());
    };
    updateAvg();
    const interval = setInterval(updateAvg, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DE) return null;

  return (
    <div
      className={`text-xs px-2 py-1 rounded ${
        avgTime < 100 ? 'bg-green-500/20 text-green-500' :
        avgTime < 500 ? 'bg-yellow-500/20 text-yellow-500' :
        'bg-red-500/20 text-red-500'
      }`}
    >
      {avgTime.toFixed(0)}ms
    </div>
  );
}
