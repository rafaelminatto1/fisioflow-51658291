/**
 * Performance Dashboard Component
 *
 * Displays real-time performance metrics for Supabase queries and cache.
 * Only visible in development mode or with specific permissions.
 */

import { useState, useEffect, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Activity, Database, Zap, AlertTriangle, RefreshCw, Trash2, Search } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

/**
 * Mini performance indicator for inline display
 */
export function PerformanceIndicator() {
  const [avgTime, setAvgTime] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateAvg = () => {
      setAvgTime(QueryOptimizer.getAverageQueryTime());
    };
    updateAvg();
    const interval = setInterval(updateAvg, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div
          className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${avgTime < 100 ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' :
            avgTime < 500 ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' :
              'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
          title="Click to open Performance Dashboard"
        >
          <Activity className="h-3 w-3" />
          {avgTime.toFixed(0)}ms
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Performance Dashboard
          </DialogTitle>
        </DialogHeader>

        <PerformanceDashboardContent />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Content of the Dashboard
 */
function PerformanceDashboardContent() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [queryStats, setQueryStats] = useState<QueryStatistics[]>([]);
  const { toast } = useToast();

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
      });
    } catch (error) {
      console.error("Failed to load metrics", error);
      toast({
        title: "Error",
        description: "Failed to load performance metrics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearCache = () => {
    PerformanceMonitor.clearCache();
    toast({
      title: "Cache Cleared",
      description: "All cached query data has been removed.",
    });
  };

  const handleAnalyzeTables = async () => {
    setLoading(true);
    const success = await PerformanceMonitor.analyzeTables();
    if (success) {
      toast({
        title: "Analysis Complete",
        description: "Database statistics have been updated.",
      });
      loadData();
    } else {
      toast({
        title: "Analysis Failed",
        description: "Could not run ANLAYZE command.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
          <Button variant="outline" size="sm" onClick={handleAnalyzeTables} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Analyze Tables
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="slow-queries">Slow Queries</TabsTrigger>
          <TabsTrigger value="database">Database Stats</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto mt-4">
          <TabsContent value="overview" className="h-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {QueryOptimizer.getAverageQueryTime().toFixed(0)}ms
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Client-side measured average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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

            {report?.recommendations.length ? (
              <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardHeader>
                  <CardTitle className="text-yellow-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Top Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1">
                    {report.recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i} className="text-sm text-yellow-700 dark:text-yellow-400">{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="slow-queries" className="h-full">
            <Card>
              <CardHeader>
                <CardTitle>Slowest Queries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Calls</TableHead>
                        <TableHead>Mean Time</TableHead>
                        <TableHead>Max Time</TableHead>
                        <TableHead>Query Fragment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report?.slowQueries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No slow queries detected
                          </TableCell>
                        </TableRow>
                      ) : (
                        report?.slowQueries.map((query) => (
                          <TableRow key={query.queryId}>
                            <TableCell>{query.calls}</TableCell>
                            <TableCell className={query.meanTime > 500 ? 'text-red-500 font-bold' : ''}>
                              {query.meanTime.toFixed(2)}ms
                            </TableCell>
                            <TableCell>{query.maxTime.toFixed(2)}ms</TableCell>
                            <TableCell className="font-mono text-xs max-w-[300px] truncate" title={query.query}>
                              {query.query}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="h-full space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Table Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Seq Scans</TableHead>
                        <TableHead>Idx Scans</TableHead>
                        <TableHead>Idx Ratio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No statistics available. Try "Analyze Tables".
                          </TableCell>
                        </TableRow>
                      ) : (
                        queryStats.map((stat) => (
                          <TableRow key={stat.tableName}>
                            <TableCell className="font-medium">{stat.tableName}</TableCell>
                            <TableCell>{stat.tableSize}</TableCell>
                            <TableCell>{stat.seqScan}</TableCell>
                            <TableCell>{stat.idxScan}</TableCell>
                            <TableCell>
                              <Badge variant={stat.idxScanRatio > 90 ? 'secondary' : stat.idxScanRatio < 50 ? 'destructive' : 'outline'}>
                                {stat.idxScanRatio}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="h-full">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {report?.recommendations.length === 0 && report?.missingIndexes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recommendations at this time. Good job!
                  </div>
                ) : (
                  <div className="space-y-6">
                    {report?.recommendations.length ? (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Zap className="h-4 w-4 mr-2 text-yellow-500" /> General Improvements
                        </h4>
                        <ul className="space-y-2">
                          {report.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm p-2 bg-muted rounded flex items-start">
                              <span className="mr-2">•</span> {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {report?.missingIndexes.length ? (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Database className="h-4 w-4 mr-2 text-blue-500" /> Missing Indexes
                        </h4>
                        <ul className="space-y-2">
                          {report.missingIndexes.map((rec, i) => (
                            <li key={i} className="text-sm p-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-700 dark:text-blue-300">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
