/**
 * Admin Analytics Dashboard
 *
 * Administrative dashboard showing all patients with analytics,
 * risk identification, and clinic-wide metrics.
 *
 * @module AdminAnalyticsDashboard
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Activity,
  Target,
  Calendar,
  Search,
  Download,
  Eye,
  Brain,
  ChevronDown,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  TooltipProps,
} from 'recharts';
import { useBatchAnalyticsExport } from '@/hooks/useAnalyticsExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// TYPES
// ============================================================================

interface PatientWithAnalytics {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  created_at: string;
  last_session?: string;
  total_sessions: number;
  overall_progress: number;
  dropout_risk: number;
  success_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'at_risk';
  pathology?: string;
}

interface ClinicMetrics {
  totalPatients: number;
  activePatients: number;
  atRiskPatients: number;
  avgProgress: number;
  avgSessions: number;
  totalSessionsThisMonth: number;
  newPatientsThisMonth: number;
  retentionRate: number;
}

type SortField = 'name' | 'sessions' | 'progress' | 'risk';
type SortOrder = 'asc' | 'desc';
type RiskFilter = 'all' | 'at_risk' | 'high' | 'critical';
type StatusFilter = 'all' | 'active' | 'inactive' | 'at_risk';

// ============================================================================
// CONSTANTS
// ============================================================================

const RISK_THRESHOLDS = {
  critical: 70,
  high: 50,
  medium: 30,
} as const;

const COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
} as const;

// ============================================================================
// CHART UTILITIES
// ============================================================================

const CustomTooltip: React.FC<TooltipProps<number, string> & { active?: boolean; payload?: any }> = ({
  active,
  payload,
}) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-2">
      <p className="text-sm font-medium">{payload[0]?.name}</p>
      <p className="text-lg font-bold">{payload[0]?.value}</p>
    </div>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Custom hook for fetching admin analytics data
 */
function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin-analytics', 'clinic-metrics'],
    queryFn: async (): Promise<{
      patients: PatientWithAnalytics[];
      metrics: ClinicMetrics;
    }> => {
      // Get all patients with their session counts and recent activity
      const { data: patients, error } = await supabase
        .from('patients')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at
        `)
        .order('full_name', { ascending: true })
        .limit(500);

      if (error) throw error;

      // Get session counts per patient
      const patientIds = patients?.map(p => p.id) || [];

      // Get completed sessions count
      const { data: appointments } = await supabase
        .from('appointments')
        .select('patient_id, appointment_date, status')
        .in('patient_id', patientIds.slice(0, 100));

      // Get risk scores
      const { data: riskScores } = await supabase
        .from('patient_risk_scores')
        .select('*')
        .in('patient_id', patientIds.slice(0, 100));

      // Get latest evolution for pathology
      const { data: evolutions } = await supabase
        .from('patient_evolution')
        .select('patient_id, pathology')
        .in('patient_id', patientIds.slice(0, 100))
        .order('created_at', { ascending: false });

      // Process data
      const patientMap = new Map<string, number>();
      const lastSessionMap = new Map<string, string>();
      appointments?.forEach(a => {
        if (a.status === 'completed') {
          const currentCount = patientMap.get(a.patient_id) || 0;
          patientMap.set(a.patient_id, currentCount + 1);

          const currentDate = lastSessionMap.get(a.patient_id);
          if (!currentDate || new Date(a.appointment_date) > new Date(currentDate)) {
            lastSessionMap.set(a.patient_id, a.appointment_date);
          }
        }
      });

      const riskMap = new Map<string, any>();
      riskScores?.forEach(r => {
        // Only keep the most recent risk score per patient
        const existing = riskMap.get(r.patient_id);
        if (!existing || new Date(r.calculated_at) > new Date(existing.calculated_at)) {
          riskMap.set(r.patient_id, r);
        }
      });

      const pathologyMap = new Map<string, string>();
      evolutions?.forEach(e => {
        if (!pathologyMap.has(e.patient_id) && e.pathology) {
          pathologyMap.set(e.patient_id, e.pathology);
        }
      });

      // Calculate risk scores for patients without explicit risk scores
      const calculateDropoutRisk = (sessions: number, daysSinceLastSession?: number): number => {
        let risk = Math.max(0, 100 - sessions * 5); // Base risk from session count

        if (daysSinceLastSession !== undefined) {
          if (daysSinceLastSession > 30) risk += 20;
          else if (daysSinceLastSession > 14) risk += 10;
        }

        return Math.min(100, Math.round(risk));
      };

      const patientsWithAnalytics: PatientWithAnalytics[] = (patients || []).map(p => {
        const riskScore = riskMap.get(p.id);
        const sessions = patientMap.get(p.id) || 0;

        const lastSession = lastSessionMap.get(p.id);
        const daysSinceLastSession = lastSession
          ? Math.floor((Date.now() - new Date(lastSession).getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        const dropoutRisk = riskScore?.dropout_risk_score ?? calculateDropoutRisk(sessions, daysSinceLastSession);
        const successProbability = riskScore?.success_probability ?? Math.max(0, 100 - dropoutRisk);

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (dropoutRisk >= RISK_THRESHOLDS.critical) riskLevel = 'critical';
        else if (dropoutRisk >= RISK_THRESHOLDS.high) riskLevel = 'high';
        else if (dropoutRisk >= RISK_THRESHOLDS.medium) riskLevel = 'medium';

        // Determine status
        let status: 'active' | 'inactive' | 'at_risk' = 'active';
        if (sessions === 0) status = 'inactive';
        else if (dropoutRisk >= RISK_THRESHOLDS.high) status = 'at_risk';

        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          created_at: p.created_at,
          last_session: lastSession,
          total_sessions: sessions,
          overall_progress: Math.min(100, sessions * 8),
          dropout_risk: dropoutRisk,
          success_probability: successProbability,
          risk_level: riskLevel,
          status,
          pathology: pathologyMap.get(p.id),
        };
      });

      // Calculate clinic metrics
      const activePatients = patientsWithAnalytics.filter(p => p.status === 'active').length;
      const atRiskPatients = patientsWithAnalytics.filter(p => p.status === 'at_risk').length;
      const avgProgress = patientsWithAnalytics.reduce((sum, p) => sum + p.overall_progress, 0) / (patientsWithAnalytics.length || 1);
      const avgSessions = patientsWithAnalytics.reduce((sum, p) => sum + p.total_sessions, 0) / (patientsWithAnalytics.length || 1);

      // Sessions this month
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const totalSessionsThisMonth = appointments?.filter(a => {
        const date = new Date(a.appointment_date);
        return date >= monthStart && date <= monthEnd && a.status === 'completed';
      }).length || 0;

      // New patients this month
      const newPatientsThisMonth = patients?.filter(p => {
        const createdDate = new Date(p.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length || 0;

      // Retention rate (patients who had sessions in the last 30 days)
      const thirtyDaysAgo = subMonths(now, 1);
      const activeInLast30Days = new Set(
        appointments
          ?.filter(a => new Date(a.appointment_date) >= thirtyDaysAgo && a.status === 'completed')
          .map(a => a.patient_id) || []
      );
      const retentionRate = activePatients > 0 ? (activeInLast30Days.size / activePatients) * 100 : 0;

      return {
        patients: patientsWithAnalytics,
        metrics: {
          totalPatients: patients?.length || 0,
          activePatients,
          atRiskPatients,
          avgProgress: Math.round(avgProgress),
          avgSessions: Math.round(avgSessions * 10) / 10,
          totalSessionsThisMonth,
          newPatientsThisMonth,
          retentionRate: Math.round(retentionRate),
        },
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  highlight?: boolean;
  trend?: number;
  suffix?: string;
}

function MetricCard({ title, value, icon, color, highlight, trend, suffix = '' }: MetricCardProps) {
  const colors = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    orange: 'bg-orange-500 text-white',
    purple: 'bg-purple-500 text-white',
    red: 'bg-red-500 text-white',
  };

  const bgColors = {
    blue: 'from-blue-50 to-white dark:from-blue-950/20',
    green: 'from-green-50 to-white dark:from-green-950/20',
    orange: 'from-orange-50 to-white dark:from-orange-950/20',
    purple: 'from-purple-50 to-white dark:from-purple-950/20',
    red: 'from-red-50 to-white dark:from-red-950/20',
  };

  const borderColors = {
    blue: 'border-blue-200 dark:border-blue-800',
    green: 'border-green-200 dark:border-green-800',
    orange: 'border-orange-200 dark:border-orange-800',
    purple: 'border-purple-200 dark:border-purple-800',
    red: 'border-red-200 dark:border-red-800',
  };

  return (
    <Card className={cn(
      'bg-gradient-to-br transition-all duration-200',
      bgColors[color],
      'border-2',
      borderColors[color],
      highlight && 'ring-2 ring-red-400 ring-offset-2'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', colors[color])}>
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">
                {value}
                {suffix}
              </p>
              {trend !== undefined && (
                <p className={cn(
                  'text-xs flex items-center mt-1',
                  trend >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  <TrendingUp className={cn('h-3 w-3 mr-1', trend < 0 && 'rotate-180')} />
                  {trend >= 0 ? '+' : ''}{trend}%
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  value: number;
}

function RiskBadge({ level, value }: RiskBadgeProps) {
  const variants = {
    low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
    high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 animate-pulse',
  };

  const labels = {
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto',
    critical: 'Crítico',
  };

  return (
    <Badge className={cn('font-medium', variants[level])} variant="outline">
      {labels[level]} ({value}%)
    </Badge>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'at_risk';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    active: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    inactive: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800',
    at_risk: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  };

  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    at_risk: 'Em Risco',
  };

  const icons = {
    active: <Activity className="h-3 w-3 mr-1" />,
    inactive: <Users className="h-3 w-3 mr-1" />,
    at_risk: <AlertTriangle className="h-3 w-3 mr-1" />,
  };

  return (
    <Badge className={cn('font-medium', variants[status])} variant="outline">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
}

interface SortableHeaderProps {
  field: SortField;
  currentField: SortField;
  order: SortOrder;
  label: string;
  onSort: (field: SortField) => void;
}

function SortableHeader({ field, currentField, order, label, onSort }: SortableHeaderProps) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground hover:text-foreground transition-colors',
        isActive && 'text-foreground'
      )}
    >
      {label}
      {isActive && (
        <ChevronDown className={cn('h-3 w-3', order === 'asc' && 'rotate-180')} />
      )}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AdminAnalyticsDashboardProps {
  className?: string;
}

export function AdminAnalyticsDashboard({ className }: AdminAnalyticsDashboardProps) {
  const { data, isLoading, error, refetch } = useAdminAnalytics();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const batchExport = useBatchAnalyticsExport();

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    if (!data?.patients) return [];

    let filtered = data.patients.filter(patient => {
      // Search filter
      const matchesSearch =
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm);

      // Risk filter
      const matchesRisk =
        riskFilter === 'all' ||
        (riskFilter === 'at_risk' && patient.status === 'at_risk') ||
        (riskFilter === 'high' && patient.risk_level === 'high') ||
        (riskFilter === 'critical' && patient.risk_level === 'critical');

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && patient.status === 'active') ||
        (statusFilter === 'inactive' && patient.status === 'inactive') ||
        (statusFilter === 'at_risk' && patient.status === 'at_risk');

      return matchesSearch && matchesRisk && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'sessions':
          comparison = a.total_sessions - b.total_sessions;
          break;
        case 'progress':
          comparison = a.overall_progress - b.overall_progress;
          break;
        case 'risk':
          comparison = a.dropout_risk - b.dropout_risk;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data?.patients, searchTerm, riskFilter, statusFilter, sortField, sortOrder]);

  // Chart data
  const riskDistribution = useMemo(() => {
    if (!data?.patients) return [];
    const risks = { low: 0, medium: 0, high: 0, critical: 0 };
    data.patients.forEach(p => {
      risks[p.risk_level]++;
    });
    return [
      { name: 'Baixo', value: risks.low, color: COLORS.low },
      { name: 'Médio', value: risks.medium, color: COLORS.medium },
      { name: 'Alto', value: risks.high, color: COLORS.high },
      { name: 'Crítico', value: risks.critical, color: COLORS.critical },
    ];
  }, [data?.patients]);

  const statusDistribution = useMemo(() => {
    if (!data?.metrics) return [];
    const inactiveCount = data.metrics.totalPatients - data.metrics.activePatients - data.metrics.atRiskPatients;
    return [
      { name: 'Ativos', value: data.metrics.activePatients, color: COLORS.low },
      { name: 'Em Risco', value: data.metrics.atRiskPatients, color: COLORS.high },
      { name: 'Inativos', value: Math.max(0, inactiveCount), color: '#94a3b8' },
    ];
  }, [data?.metrics]);

  const progressRanges = useMemo(() => {
    if (!data?.patients) return [];
    const ranges = { '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };
    data.patients.forEach(p => {
      if (p.overall_progress <= 25) ranges['0-25%']++;
      else if (p.overall_progress <= 50) ranges['26-50%']++;
      else if (p.overall_progress <= 75) ranges['51-75%']++;
      else ranges['76-100%']++;
    });
    return [
      { name: '0-25%', value: ranges['0-25%'] },
      { name: '26-50%', value: ranges['26-50%'] },
      { name: '51-75%', value: ranges['51-75%'] },
      { name: '76-100%', value: ranges['76-100%'] },
    ];
  }, [data?.patients]);

  // Handlers
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const handleSelectAll = useCallback(() => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map(p => p.id));
    }
  }, [selectedPatients, filteredPatients]);

  const handleSelectPatient = useCallback((patientId: string) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  }, []);

  const handleExportSelected = useCallback(() => {
    if (selectedPatients.length === 0) return;
    batchExport.batchExport({ patientIds: selectedPatients, format: 'excel' });
  }, [selectedPatients, batchExport]);

  const handleExportAll = useCallback(() => {
    const allIds = data?.patients.map(p => p.id) || [];
    batchExport.batchExport({ patientIds: allIds, format: 'excel' });
  }, [data, batchExport]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    refetch();
  }, [queryClient, refetch]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            Erro ao carregar analytics administrativos
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            {(error as Error).message}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Export handlers
  const exportCsv = () => {
    const csv = [
      ['Nome', 'Email', 'Telefone', 'Sessões', 'Progresso', 'Risco de Abandono', 'Status'],
      ...filteredPatients.map(p => [
        p.full_name,
        p.email || '',
        p.phone || '',
        p.total_sessions,
        `${p.overall_progress}%`,
        `${p.dropout_risk}%`,
        p.status,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin_analytics_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Administrativo</h2>
          <p className="text-muted-foreground">Visão geral de todos os pacientes e analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}>
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAll}>
                Exportar Excel (Todos)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportSelected}
                disabled={selectedPatients.length === 0}
              >
                Exportar Selecionados ({selectedPatients.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Pacientes"
          value={data.metrics.totalPatients}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          trend={data.metrics.newPatientsThisMonth > 0 ? data.metrics.newPatientsThisMonth : undefined}
        />
        <MetricCard
          title="Pacientes Ativos"
          value={data.metrics.activePatients}
          icon={<Activity className="h-5 w-5" />}
          color="green"
        />
        <MetricCard
          title="Em Risco"
          value={data.metrics.atRiskPatients}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="orange"
          highlight={data.metrics.atRiskPatients > 0}
        />
        <MetricCard
          title="Taxa de Retenção"
          value={data.metrics.retentionRate}
          icon={<Target className="h-5 w-5" />}
          color="purple"
          suffix="%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Sessões este Mês"
          value={data.metrics.totalSessionsThisMonth}
          icon={<Calendar className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Progresso Médio"
          value={data.metrics.avgProgress}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
          suffix="%"
        />
        <MetricCard
          title="Média de Sessões"
          value={data.metrics.avgSessions}
          icon={<Brain className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${percent}%`}
                  labelLine={false}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={progressRanges}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Pacientes</CardTitle>
              <CardDescription>
                Mostrando {filteredPatients.length} de {data.patients.length} pacientes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedPatients.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleExportSelected}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar ({selectedPatients.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={riskFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRiskFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={riskFilter === 'at_risk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRiskFilter('at_risk')}
              >
                Em Risco
              </Button>
              <Button
                variant={riskFilter === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRiskFilter('high')}
              >
                Alto
              </Button>
              <Button
                variant={riskFilter === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRiskFilter('critical')}
              >
                Crítico
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Status
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className="h-8"
              />
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
                className="h-8"
              />
              <Button
                variant={statusFilter === 'at_risk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('at_risk')}
                className="h-8"
              />
            </div>
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px] rounded-md border">
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                      onChange={handleSelectAll}
                      className="mr-2"
                    />
                  </th>
                  <th className="p-3">
                    <SortableHeader
                      field="name"
                      currentField={sortField}
                      order={sortOrder}
                      label="Paciente"
                      onSort={handleSort}
                    />
                  </th>
                  <th className="p-3">
                    <SortableHeader
                      field="sessions"
                      currentField={sortField}
                      order={sortOrder}
                      label="Sessões"
                      onSort={handleSort}
                    />
                  </th>
                  <th className="p-3">
                    <SortableHeader
                      field="progress"
                      currentField={sortField}
                      order={sortOrder}
                      label="Progresso"
                      onSort={handleSort}
                    />
                  </th>
                  <th className="p-3">
                    <SortableHeader
                      field="risk"
                      currentField={sortField}
                      order={sortOrder}
                      label="Risco"
                      onSort={handleSort}
                    />
                  </th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 opacity-50" />
                        <p>Nenhum paciente encontrado com os filtros atuais.</p>
                        {searchTerm || riskFilter !== 'all' || statusFilter !== 'all' ? (
                          <Button variant="link" onClick={() => {
                            setSearchTerm('');
                            setRiskFilter('all');
                            setStatusFilter('all');
                          }}>
                            Limpar filtros
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map(patient => (
                    <React.Fragment key={patient.id}>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedPatients.includes(patient.id)}
                            onChange={() => handleSelectPatient(patient.id)}
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{patient.full_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {patient.email && <span>{patient.email}</span>}
                              {patient.pathology && (
                                <Badge variant="outline" className="text-xs">
                                  {patient.pathology}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{patient.total_sessions}</span>
                          {patient.last_session && (
                            <div className="text-xs text-muted-foreground">
                              Últ: {format(new Date(patient.last_session), 'dd/MMM', { locale: ptBR })}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  patient.overall_progress >= 75 ? 'bg-green-500' :
                                  patient.overall_progress >= 50 ? 'bg-yellow-500' :
                                  patient.overall_progress >= 25 ? 'bg-orange-500' : 'bg-red-500'
                                )}
                                style={{ width: `${patient.overall_progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{patient.overall_progress}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <RiskBadge level={patient.risk_level} value={patient.dropout_risk} />
                        </td>
                        <td className="p-3">
                          <StatusBadge status={patient.status} />
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => setExpandedRow(expandedRow === patient.id ? null : patient.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/patients/${patient.id}`}>
                                  <Target className="h-4 w-4 mr-2" />
                                  Ir para perfil
                                </a>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      {expandedRow === patient.id && (
                        <tr className="bg-muted/30">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Email</p>
                                <p className="text-sm">{patient.email || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                                <p className="text-sm">{patient.phone || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Cadastrado em</p>
                                <p className="text-sm">
                                  {format(new Date(patient.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Última sessão</p>
                                <p className="text-sm">
                                  {patient.last_session
                                    ? format(new Date(patient.last_session), 'dd/MM/yyyy', { locale: ptBR })
                                    : 'N/A'}
                                  </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminAnalyticsDashboard;
