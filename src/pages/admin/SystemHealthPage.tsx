/**
 * System Health Dashboard
 * 
 * Real-time monitoring of system health metrics
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Users, Zap } from 'lucide-react';
import { performanceMonitor } from '@/lib/monitoring/performance';

interface SystemMetrics {
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  memoryUsage: number;
  cpuUsage: number;
  requestsPerMinute: number;
  cacheHitRate: number;
}

export default function SystemHealthPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<SystemMetrics> => {
      // Simulated metrics - replace with real API calls
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      
      return {
        uptime: 99.9,
        errorRate: 0.05,
        avgResponseTime: 245,
        activeUsers: 42,
        memoryUsage: currentMetrics.memory 
          ? (currentMetrics.memory.usedJSHeapSize / currentMetrics.memory.jsHeapSizeLimit) * 100 
          : 0,
        cpuUsage: 0,
        requestsPerMinute: 150,
        cacheHitRate: 85,
      };
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value < threshold ? 'text-green-600' : 'text-red-600';
    }
    return value > threshold ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBadge = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return (
      <Badge variant={isGood ? 'default' : 'destructive'}>
        {isGood ? 'Healthy' : 'Warning'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of system performance and health
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Activity className="w-4 h-4 mr-2" />
          Live
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.uptime}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
            <Progress value={metrics?.uptime} className="mt-2" />
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className={`h-4 w-4 ${getStatusColor(metrics?.errorRate || 0, 1, true)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.errorRate}%</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
            {getStatusBadge(metrics?.errorRate || 0, 1, true)}
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Last 5 minutes</p>
            {getStatusBadge(metrics?.avgResponseTime || 0, 1000, true)}
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
            <div className="flex items-center mt-2 text-xs text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% from yesterday
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>Current system resource utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-muted-foreground">
                  {metrics?.memoryUsage.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics?.memoryUsage} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm text-muted-foreground">
                  {metrics?.cpuUsage}%
                </span>
              </div>
              <Progress value={metrics?.cpuUsage} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Cache Hit Rate</span>
                <span className="text-sm text-muted-foreground">
                  {metrics?.cacheHitRate}%
                </span>
              </div>
              <Progress value={metrics?.cacheHitRate} />
            </div>
          </CardContent>
        </Card>

        {/* Traffic */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Metrics</CardTitle>
            <CardDescription>Request and response statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-600" />
                <span className="text-sm font-medium">Requests/min</span>
              </div>
              <span className="text-2xl font-bold">{metrics?.requestsPerMinute}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium">Avg Response</span>
              </div>
              <span className="text-2xl font-bold">{metrics?.avgResponseTime}ms</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                <span className="text-sm font-medium">Success Rate</span>
              </div>
              <span className="text-2xl font-bold">
                {(100 - (metrics?.errorRate || 0)).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Status of all system services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'API Server', status: 'operational' },
              { name: 'Database', status: 'operational' },
              { name: 'Cache', status: 'operational' },
              { name: 'Storage', status: 'operational' },
              { name: 'Email Service', status: 'operational' },
              { name: 'WhatsApp API', status: 'operational' },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <span className="font-medium">{service.name}</span>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
