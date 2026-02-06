/**
 * Performance Dashboard Component
 *
 * Displays real-time performance metrics for Supabase queries and cache.
 * Only visible in development mode or with specific permissions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { QueryOptimizer } from '@/hooks/database/useOptimizedQuery';
import { PerformanceMonitor, type QueryStatistics, type PerformanceReport } from '@/lib/database/performanceMonitor';
import {

  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Activity, Database, Zap, AlertTriangle, RefreshCw, Trash2, Search, TrendingUp } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

interface TimePoint {
  time: number;
  value: number;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const OverviewTab = ({
  averageTime,
  report,
  history
}: {
  averageTime: number;
  report: PerformanceReport | null;
  history: TimePoint[]
}) => {
  return (
    <div className="space-y-4 h-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Query Time Card with Chart */}
        <Card className="col-span-1 md:col-span-2 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Avg Query Time (Last 60s)
              <Zap className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <div className="text-3xl font-bold">
                {averageTime.toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
              </div>
              {history.length > 2 && (
                <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center ${history[history.length - 1].value < history[history.length - 2].value
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                  <TrendingUp className={`h-3 w-3 mr-1 ${history[history.length - 1].value < history[history.length - 2].value ? 'rotate-180' : ''
                    }`} />
                  {Math.abs(history[history.length - 1].value - history[history.length - 2].value).toFixed(0)}ms
                </div>
              )}
            </div>

            <div className="h-[120px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                    labelStyle={{ display: 'none' }}
                    formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Time']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="space-y-4">
          {/* Slow Queries Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${report?.slowQueries.length ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report?.slowQueries.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Detected in last 24h
              </p>
            </CardContent>
          </Card>

          {/* Large Tables Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Large Tables</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report?.largeTables.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                &gt; 10MB size
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Recommendations */}
      {report && report.recommendations.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center text-amber-700 dark:text-amber-400">
              <Zap className="h-4 w-4 mr-2" />
              Priority Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.recommendations.slice(0, 4).map((rec, i) => (
                <li key={i} className="text-sm flex items-start text-muted-foreground">
                  <span className="mr-2 text-amber-500">•</span> {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const SlowQueriesTab = ({ report }: { report: PerformanceReport | null }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Slowest Queries Analysis</CardTitle>
        <CardDescription>Queries taking longer than 300ms</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Calls</TableHead>
                <TableHead className="w-[100px]">Avg Time</TableHead>
                <TableHead className="w-[100px]">Max Time</TableHead>
                <TableHead>Query Fragment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!report?.slowQueries.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Zap className="h-8 w-8 text-green-500/50" />
                      <p>No slow queries detected recently.</p>
                      <p className="text-xs">Great job! Your database is performing well.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                report.slowQueries.map((query) => (
                  <TableRow key={query.queryId}>
                    <TableCell className="font-medium text-center">{query.calls}</TableCell>
                    <TableCell>
                      <Badge variant={query.meanTime > 500 ? 'destructive' : 'secondary'} className="font-mono">
                        {query.meanTime.toFixed(1)}ms
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{query.maxTime.toFixed(0)}ms</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs block truncate max-w-[400px] cursor-help hover:bg-muted/80 transition-colors">
                              {query.query}
                            </code>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="max-w-[500px] p-4 font-mono text-xs bg-card border-border shadow-xl">
                            <p className="whitespace-pre-wrap break-all">{query.query}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const DatabaseStatsTab = ({ stats }: { stats: QueryStatistics[] }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Table Statistics & Index Usage</CardTitle>
        <CardDescription>Scan usage and size overview</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead>Est. Size</TableHead>
                <TableHead className="text-right">Seq Scans</TableHead>
                <TableHead className="text-right">Index Scans</TableHead>
                <TableHead className="text-right">Index Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No statistics available yet. Run "Analyze Tables" to gather data.
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat) => (
                  <TableRow key={stat.tableName}>
                    <TableCell className="font-medium">{stat.tableName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{stat.tableSize}</TableCell>
                    <TableCell className="text-right font-mono">{stat.seqScan}</TableCell>
                    <TableCell className="text-right font-mono">{stat.idxScan}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stat.idxScanRatio > 80 ? 'bg-green-500' : stat.idxScanRatio > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${stat.idxScanRatio}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{stat.idxScanRatio}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PerformanceIndicator() {
  const [avgTime, setAvgTime] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Update the indicator more frequently for a "live" feel
  useEffect(() => {
    const updateAvg = () => {
      const time = QueryOptimizer.getAverageQueryTime();
      setAvgTime(time);
    };
    updateAvg();
    const interval = setInterval(updateAvg, 1000); // 1s update
    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className={`
            fixed bottom-4 right-20 z-50 
            flex items-center gap-2 px-3 py-1.5 
            rounded-full shadow-lg border backdrop-blur-md transition-all duration-300
            hover:shadow-xl hover:scale-105 active:scale-95
            ${avgTime < 100
              ? 'bg-background/80 border-green-500/30 text-green-600 dark:text-green-400'
              : avgTime < 500
                ? 'bg-background/80 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                : 'bg-background/80 border-red-500/30 text-red-600 dark:text-red-400'
            }
          `}
          title="System Performance Dashboard"
        >
          <Activity className={`h-4 w-4 ${avgTime > 500 ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-semibold tabular-nums">{avgTime.toFixed(0)}ms</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Performance Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/10">
          <PerformanceDashboardContent isOpen={isOpen} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PerformanceDashboardContent({ isOpen }: { isOpen: boolean }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [queryStats, setQueryStats] = useState<QueryStatistics[]>([]);
  const { toast } = useToast();

  // Real-time history for charts
  const [history, setHistory] = useState<TimePoint[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [perfReport, stats] = await Promise.all([
        PerformanceMonitor.generatePerformanceReport(),
        PerformanceMonitor.getQueryStatistics()
      ]);
      setReport(perfReport);
      setQueryStats(stats);

      toast({
        title: "Metrics updated",
        description: "Latest performance data has been loaded.",
        duration: 2000,
      });
    } catch (error) {
      logger.error("Failed to load metrics", error, 'PerformanceDashboard');
      toast({
        title: "Error",
        description: "Failed to load performance metrics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Real-time chart updates
  useEffect(() => {
    if (!isOpen) return;

    const updateChart = () => {
      const val = QueryOptimizer.getAverageQueryTime();
      setHistory(prev => {
        const newHistory = [...prev, { time: Date.now(), value: val }];
        // Keep last 60 points (1 minute approx)
        if (newHistory.length > 60) return newHistory.slice(newHistory.length - 60);
        return newHistory;
      });
    };

    const interval = setInterval(updateChart, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearCache = () => {
    PerformanceMonitor.clearCache();
    // Reset charts too
    setHistory([]);
    toast({
      title: "Cache Cleared",
      description: "Local metrics cache has been reset.",
    });
  };

  const handleAnalyzeTables = async () => {
    setLoading(true);
    const success = await PerformanceMonitor.analyzeTables();
    if (success) {
      toast({
        title: "Analysis Complete",
        description: "Database statistics have been refreshed.",
      });
      loadData();
    } else {
      toast({
        title: "Analysis Failed",
        description: "Could not trigger database analysis.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 border-b flex justify-between items-center bg-muted/20">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8">
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearCache} className="h-8 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Clear Local Cache
          </Button>
          <Button variant="default" size="sm" onClick={handleAnalyzeTables} disabled={loading} className="h-8">
            <Search className="h-3.5 w-3.5 mr-2" />
            Analyze & Optimize DB
          </Button>
        </div>
        <div className="text-xs text-muted-foreground hidden md:block">
          Auto-refreshing charts enabled
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="flex-1 max-w-[200px]">Overview</TabsTrigger>
            <TabsTrigger value="slow-queries" className="flex-1 max-w-[200px]">
              Slow Queries
              {report?.slowQueries.length ? (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {report.slowQueries.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="database" className="flex-1 max-w-[200px]">Database Stats</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto -mx-1 px-1">
            <TabsContent value="overview" className="h-full m-0 focus-visible:ring-0">
              <OverviewTab averageTime={history.length ? history[history.length - 1].value : QueryOptimizer.getAverageQueryTime()} report={report} history={history} />
            </TabsContent>

            <TabsContent value="slow-queries" className="h-full m-0 focus-visible:ring-0">
              <SlowQueriesTab report={report} />
            </TabsContent>

            <TabsContent value="database" className="h-full m-0 focus-visible:ring-0">
              <DatabaseStatsTab stats={queryStats} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
