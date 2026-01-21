/**
 * Notification Analytics Dashboard
 *
 * Displays notification metrics:
 * - Sent vs Delivered vs Failed
 * - By type (appointment, exercise, etc.)
 * - By channel (email, WhatsApp, push)
 * - Over time trends
 * - Delivery rates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Badge } from '@/components/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { notificationManager } from '@/lib/services/NotificationManager';
import { NotificationType } from '@/types/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail,
  MessageCircle,
  Smartphone,
  Send,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationMetrics {
  type: NotificationType;
  sent: number;
  delivered: number;
  failed: number;
}

interface ChannelMetrics {
  channel: 'email' | 'whatsapp' | 'push' | 'sms';
  sent: number;
  delivered: number;
  failed: number;
}

interface TimeSeriesData {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
}

type PeriodType = '7d' | '30d' | '90d' | '1y';

// ============================================================================
// COLORS
// ============================================================================

const COLORS = {
  sent: '#667eea',
  delivered: '#10b981',
  failed: '#ef4444',
  email: '#3b82f6',
  whatsapp: '#25d366',
  push: '#f59e0b',
  sms: '#8b5cf6',
};

const TYPE_COLORS: Record<NotificationType, string> = {
  [NotificationType.APPOINTMENT_REMINDER]: '#667eea',
  [NotificationType.APPOINTMENT_CHANGE]: '#8b5cf6',
  [NotificationType.EXERCISE_REMINDER]: '#10b981',
  [NotificationType.EXERCISE_MILESTONE]: '#f59e0b',
  [NotificationType.PROGRESS_UPDATE]: '#3b82f6',
  [NotificationType.SYSTEM_ALERT]: '#ef4444',
  [NotificationType.THERAPIST_MESSAGE]: '#ec4899',
  [NotificationType.PAYMENT_REMINDER]: '#f97316',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function NotificationAnalytics() {
  const [period, setPeriod] = useState<PeriodType>('30d');
  const [loading, setLoading] = useState(true);
  const [typeMetrics, setTypeMetrics] = useState<NotificationMetrics[]>([]);
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [totals, setTotals] = useState({
    sent: 0,
    delivered: 0,
    failed: 0,
    deliveryRate: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch metrics from notification history
      const { data: historyData, error } = await supabase
        .from('notification_history')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process data
      processData(historyData || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: any[]) => {
    // Aggregate by type
    const typeMap: Record<string, NotificationMetrics> = {};

    // Aggregate by channel
    const channelMap: Record<string, ChannelMetrics> = {
      email: { channel: 'email', sent: 0, delivered: 0, failed: 0 },
      whatsapp: { channel: 'whatsapp', sent: 0, delivered: 0, failed: 0 },
      push: { channel: 'push', sent: 0, delivered: 0, failed: 0 },
      sms: { channel: 'sms', sent: 0, delivered: 0, failed: 0 },
    };

    // Time series data
    const timeSeriesMap: Record<string, TimeSeriesData> = {};

    // Totals
    let totalSent = 0;
    let totalDelivered = 0;
    let totalFailed = 0;

    for (const record of data) {
      const type = record.type as NotificationType;
      const channel = record.channel;
      const status = record.status;
      const date = new Date(record.created_at).toLocaleDateString('pt-BR');

      // Type metrics
      if (!typeMap[type]) {
        typeMap[type] = { type, sent: 0, delivered: 0, failed: 0 };
      }
      typeMap[type].sent++;
      if (status === 'sent' || status === 'delivered') {
        typeMap[type].delivered++;
        totalDelivered++;
      } else if (status === 'failed') {
        typeMap[type].failed++;
        totalFailed++;
      }
      totalSent++;

      // Channel metrics
      if (channelMap[channel]) {
        channelMap[channel].sent++;
        if (status === 'sent' || status === 'delivered') {
          channelMap[channel].delivered++;
        } else if (status === 'failed') {
          channelMap[channel].failed++;
        }
      }

      // Time series
      if (!timeSeriesMap[date]) {
        timeSeriesMap[date] = { date, sent: 0, delivered: 0, failed: 0 };
      }
      timeSeriesMap[date].sent++;
      if (status === 'sent' || status === 'delivered') {
        timeSeriesMap[date].delivered++;
      } else if (status === 'failed') {
        timeSeriesMap[date].failed++;
      }
    }

    setTypeMetrics(Object.values(typeMap));
    setChannelMetrics(Object.values(channelMap));
    setTimeSeries(Object.values(timeSeriesMap).slice(-30)); // Last 30 data points
    setTotals({
      sent: totalSent,
      delivered: totalDelivered,
      failed: totalFailed,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
    });
  };

  const exportData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Convert to CSV
      const csv = [
        ['Data', 'Tipo', 'Canal', 'Status', 'Título', 'Erro'].join(','),
        ...(data || []).map((r) =>
          [
            r.created_at,
            r.type,
            r.channel,
            r.status,
            `"${r.title}"`,
            `"${r.error_message || ''}"`,
          ].join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notificacoes-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getTypeLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      [NotificationType.APPOINTMENT_REMINDER]: 'Lembrete de Consulta',
      [NotificationType.APPOINTMENT_CHANGE]: 'Mudança de Consulta',
      [NotificationType.EXERCISE_REMINDER]: 'Lembrete de Exercício',
      [NotificationType.EXERCISE_MILESTONE]: 'Conquista de Exercício',
      [NotificationType.PROGRESS_UPDATE]: 'Atualização de Progresso',
      [NotificationType.SYSTEM_ALERT]: 'Alerta do Sistema',
      [NotificationType.THERAPIST_MESSAGE]: 'Mensagem do Terapeuta',
      [NotificationType.PAYMENT_REMINDER]: 'Lembrete de Pagamento',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics de Notificações</h2>
          <p className="text-muted-foreground">
            Métricas de envio, entrega e engajamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="1y">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enviado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totals.sent}</div>
              <Send className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totals.delivered}</div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.deliveryRate.toFixed(1)}% de taxa de entrega
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Falharam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totals.failed}</div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.sent > 0 ? ((totals.failed / totals.sent) * 100).toFixed(1) : 0}% de taxa de falha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totals.deliveryRate.toFixed(1)}%</div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="byType">Por Tipo</TabsTrigger>
          <TabsTrigger value="byChannel">Por Canal</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral de Notificações</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tickFormatter={(v) => getTypeLabel(v as NotificationType).substring(0, 15)} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(v) => getTypeLabel(v as NotificationType)}
                    formatter={(value: number, name: string) => [value, name === 'sent' ? 'Enviadas' : name === 'delivered' ? 'Entregues' : 'Falharam']}
                  />
                  <Legend formatter={(v) => v === 'sent' ? 'Enviadas' : v === 'delivered' ? 'Entregues' : 'Falharam'} />
                  <Bar dataKey="sent" fill={COLORS.sent} name="sent" />
                  <Bar dataKey="delivered" fill={COLORS.delivered} name="delivered" />
                  <Bar dataKey="failed" fill={COLORS.failed} name="failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byType" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={typeMetrics}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percent }) => `${getTypeLabel(type)} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="sent"
                  >
                    {typeMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type]} />
                    ))}
                  </Pie>
                  <Tooltip labelFormatter={(v) => getTypeLabel(v as NotificationType)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byChannel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" tickFormatter={(v) => v === 'email' ? 'Email' : v === 'whatsapp' ? 'WhatsApp' : v === 'push' ? 'Push' : 'SMS'} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [value, '']}
                    labelFormatter={(v) => v === 'email' ? 'Email' : v === 'whatsapp' ? 'WhatsApp' : v === 'push' ? 'Push' : 'SMS'}
                  />
                  <Legend />
                  <Bar dataKey="sent" fill={COLORS.sent} name="Enviadas" />
                  <Bar dataKey="delivered" fill={COLORS.delivered} name="Entregues" />
                  <Bar dataKey="failed" fill={COLORS.failed} name="Falharam" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Channel Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {channelMetrics.map((channel) => (
              <Card key={channel.channel}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {channel.channel === 'email' && <Mail className="h-4 w-4 inline mr-2" />}
                      {channel.channel === 'whatsapp' && <MessageCircle className="h-4 w-4 inline mr-2" />}
                      {channel.channel === 'push' && <Smartphone className="h-4 w-4 inline mr-2" />}
                      {channel.channel === 'sms' && <Smartphone className="h-4 w-4 inline mr-2" />}
                      {channel.channel === 'email' ? 'Email' : channel.channel === 'whatsapp' ? 'WhatsApp' : channel.channel === 'push' ? 'Push' : 'SMS'}
                    </CardTitle>
                    <Badge variant={channel.failed === 0 ? 'default' : 'destructive'}>
                      {channel.sent > 0 ? ((channel.delivered / channel.sent) * 100).toFixed(1) : 0}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Enviadas: <span className="font-semibold">{channel.sent}</span></p>
                    <p>Entregues: <span className="font-semibold text-green-600">{channel.delivered}</span></p>
                    <p>Falharam: <span className="font-semibold text-red-600">{channel.failed}</span></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendências ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke={COLORS.sent} name="Enviadas" strokeWidth={2} />
                  <Line type="monotone" dataKey="delivered" stroke={COLORS.delivered} name="Entregues" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" stroke={COLORS.failed} name="Falharam" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
