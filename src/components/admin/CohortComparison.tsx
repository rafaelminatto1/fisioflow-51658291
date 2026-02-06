/**
 * Cohort Comparison Component
 *
 * Provides advanced comparative analytics for patient groups based on various
 * criteria such as pathology, age group, treatment type, and outcome.
 *
 * Features:
 * - Dynamic cohort grouping by multiple criteria
 * - Multi-dimensional comparison with radar charts
 * - Export functionality for cohort data
 * - Statistical analysis (success rate, dropout risk, progress)
 * - Interactive filtering and time range selection
 *
 * @module CohortComparison
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, differenceInYears } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts';
import { Search, Filter, Download, TrendingUp, Users, Calendar, Activity, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { db, collection, getDocs, query as firestoreQuery, where, orderBy as fsOrderBy, limit as fsLimit } from '@/integrations/firebase/app';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Available grouping criteria for cohort analysis
 */
export type CohortBy =
  | 'pathology'
  | 'age_group'
  | 'treatment_type'
  | 'session_frequency'
  | 'outcome';

/**
 * Available time ranges for data filtering
 */
export type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all';

/**
 * Cohort statistical data
 */
export interface CohortData {
  /** Display name of the cohort */
  name: string;
  /** Number of patients in this cohort */
  patients: number;
  /** Average number of sessions per patient */
  avgSessions: number;
  /** Estimated average pain reduction percentage */
  avgPainReduction: number;
  /** Average progress percentage */
  avgProgress: number;
  /** Dropout rate percentage */
  dropoutRate: number;
  /** Success rate percentage */
  successRate: number;
  /** Average satisfaction score (1-5) */
  avgSatisfaction?: number;
}

/**
 * Patient data with cohort classification
 */
interface PatientWithCohortData {
  id: string;
  full_name: string;
  created_at: string;
  pathology?: string;
  birth_date?: string;
  total_sessions: number;
  overall_progress: number;
  dropout_risk: number;
  status: string;
}

/**
 * Time range configuration
 */
interface TimeRangeConfig {
  label: string;
  months: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Color palette for charts
 */
const CHART_COLORS = [
  '#6366f1', // Indigo
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
] as const;

/**
 * Risk thresholds for classification
 */
const RISK_THRESHOLDS = {
  poor: 70,
  excellent: 80,
  good: 50,
} as const;

/**
 * Age group boundaries and labels
 */
const AGE_GROUP_RANGES = [
  { max: 17, label: '0-17', displayLabel: '0-17 anos' },
  { max: 29, label: '18-29', displayLabel: '18-29 anos' },
  { max: 49, label: '30-49', displayLabel: '30-49 anos' },
  { max: 64, label: '50-64', displayLabel: '50-64 anos' },
  { max: Infinity, label: '65+', displayLabel: '65+ anos' },
] as const;

/**
 * Session frequency thresholds (sessions per week)
 */
const SESSION_FREQUENCY_THRESHOLDS = {
  high: 2,
  medium: 1,
  low: 0.5,
} as const;

/**
 * Time range configurations
 */
const TIME_RANGE_CONFIGS: Record<TimeRange, TimeRangeConfig> = {
  '30d': { label: 'Últimos 30 dias', months: 1 },
  '90d': { label: 'Últimos 90 dias', months: 3 },
  '6m': { label: 'Últimos 6 meses', months: 6 },
  '1y': { label: 'Último ano', months: 12 },
  'all': { label: 'Todo o período', months: 0 },
};

/**
 * Cohort name translations for display
 */
const COHORT_NAME_MAP: Record<string, string> = {
  '0-17': '0-17 anos',
  '18-29': '18-29 anos',
  '30-49': '30-49 anos',
  '50-64': '50-64 anos',
  '65+': '65+ anos',
  'unknown': 'Não informado',
  '2+/week': '2+/semana',
  '1/week': '1/semana',
  'biweekly': 'Quinzenal',
  'monthly': 'Mensal',
  'excellent': 'Excelente',
  'good': 'Bom',
  'moderate': 'Moderado',
  'poor': 'Ruim',
  'Não especificado': 'Não especificado',
  'Fisioterapia Geral': 'Fisioterapia Geral',
};

/**
 * Ordered lists for proper cohort sorting
 */
const COHORT_SORT_ORDER = {
  age_group: ['0-17', '18-29', '30-49', '50-64', '65+', 'unknown'],
  session_frequency: ['2+/week', '1/week', 'biweekly', 'monthly'],
  outcome: ['excellent', 'good', 'moderate', 'poor'],
} as const;

/**
 * CSV BOM for proper UTF-8 encoding in Excel
 */
const CSV_BOM = '\uFEFF';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates age group category from birth date
 * @param birthDate - Patient's birth date
 * @returns Age group identifier
 */
function getAgeGroup(birthDate?: string): string {
  if (!birthDate) return 'unknown';

  const age = differenceInYears(new Date(), new Date(birthDate));

  for (const range of AGE_GROUP_RANGES) {
    if (age <= range.max) {
      return range.label;
    }
  }
  return 'unknown';
}

/**
 * Calculates session frequency category
 * @param totalSessions - Total number of sessions
 * @param createdAt - Patient registration date
 * @returns Session frequency identifier
 */
function getSessionFrequency(totalSessions: number, createdAt: string): string {
  const daysActive = Math.max(
    1,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );
  const sessionsPerWeek = totalSessions / (daysActive / 7);

  if (sessionsPerWeek >= SESSION_FREQUENCY_THRESHOLDS.high) {
    return '2+/week';
  }
  if (sessionsPerWeek >= SESSION_FREQUENCY_THRESHOLDS.medium) {
    return '1/week';
  }
  if (sessionsPerWeek >= SESSION_FREQUENCY_THRESHOLDS.low) {
    return 'biweekly';
  }
  return 'monthly';
}

/**
 * Categorizes patient outcome based on progress and risk
 * @param progress - Overall progress percentage
 * @param dropoutRisk - Dropout risk score
 * @returns Outcome category identifier
 */
function getOutcomeCategory(progress: number, dropoutRisk: number): string {
  if (dropoutRisk >= RISK_THRESHOLDS.poor) {
    return 'poor';
  }
  if (progress >= RISK_THRESHOLDS.excellent) {
    return 'excellent';
  }
  if (progress >= RISK_THRESHOLDS.good) {
    return 'good';
  }
  return 'moderate';
}

/**
 * Sorts cohorts according to predefined order or alphabetically
 * @param cohorts - Array of cohort data
 * @param sortBy - Grouping criteria
 * @returns Sorted cohort array
 */
function sortCohorts(cohorts: CohortData[], sortBy: CohortBy): CohortData[] {
  return cohorts.sort((a, b) => {
    let order: readonly string[] = [];

    switch (sortBy) {
      case 'age_group':
        order = COHORT_SORT_ORDER.age_group;
        break;
      case 'session_frequency':
        order = COHORT_SORT_ORDER.session_frequency;
        break;
      case 'outcome':
        order = COHORT_SORT_ORDER.outcome;
        break;
      default:
        return a.name.localeCompare(b.name, 'pt-BR');
    }

    const aIndex = order.indexOf(a.name) === -1 ? 999 : order.indexOf(a.name);
    const bIndex = order.indexOf(b.name) === -1 ? 999 : order.indexOf(b.name);

    return aIndex - bIndex;
  });
}

/**
 * Formats cohort name for display
 * @param name - Internal cohort name
 * @returns Localized display name
 */
function formatCohortName(name: string): string {
  return COHORT_NAME_MAP[name] || name;
}

/**
 * Gets dropout rate badge color
 * @param rate - Dropout rate percentage
 * @returns Tailwind CSS classes
 */
function getDropoutRateBadgeClasses(rate: number): string {
  if (rate < 30) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  }
  if (rate < 60) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

/**
 * Calculates weighted average across cohorts
 * @param cohorts - Array of cohort data
 * @param key - Property to average
 * @returns Weighted average value
 */
function calculateWeightedAverage(
  cohorts: CohortData[],
  key: keyof CohortData
): number {
  if (cohorts.length === 0) return 0;

  const totalWeight = cohorts.reduce((sum, c) => sum + c.patients, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = cohorts.reduce(
    (sum, c) => sum + (c[key] as number) * c.patients,
    0
  );

  return Math.round(weightedSum / totalWeight);
}

// ============================================================================
// CUSTOM CHART COMPONENTS
// ============================================================================

/**
 * Custom tooltip for cohort charts
 */
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium mb-2">{formatCohortName(label || '')}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// SUMMARY CARD COMPONENT
// ============================================================================

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'indigo' | 'green' | 'yellow' | 'purple';
}

const COLOR_CLASSES = {
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
} as const;

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  const classes = COLOR_CLASSES[color];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-lg', classes.bg)}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CohortComparisonProps {
  /** Optional initial grouping criteria */
  defaultCohortBy?: CohortBy;
  /** Optional initial time range */
  defaultTimeRange?: TimeRange;
}

export function CohortComparison({
  defaultCohortBy = 'pathology',
  defaultTimeRange = '6m',
}: CohortComparisonProps = {}) {
  const [cohortBy, setCohortBy] = useState<CohortBy>(defaultCohortBy);
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['admin-cohort-patients', timeRange],
    queryFn: async (): Promise<PatientWithCohortData[]> => {
      // Build query for Firebase
      const patientsQuery = firestoreQuery(
        collection(db, 'patients'),
        fsLimit(500)
      );

      // Apply time range filter - note: Firestore doesn't support >= on strings without indexes
      // We'll filter client-side for now
      const startDate = timeRange !== 'all' ? subMonths(new Date(), TIME_RANGE_CONFIGS[timeRange].months) : null;

      const patientsSnap = await getDocs(patientsQuery);
      let data = patientsSnap.docs.map(doc => ({
        id: doc.id,
        full_name: doc.data().full_name || '',
        created_at: doc.data().created_at || new Date().toISOString(),
        birth_date: doc.data().birth_date,
      }));

      // Filter by time range client-side
      if (startDate) {
        data = data.filter(p => new Date(p.created_at) >= startDate);
      }

      // Fetch analytics data for each patient in parallel
      const patientsWithAnalytics = await Promise.all(
        data.map(async (p) => {
          // Get session count
          const appointmentsQuery = firestoreQuery(
            collection(db, 'appointments'),
            where('patient_id', '==', p.id),
            where('status', 'in', ['atendido', 'confirmado'])
          );
          const appointmentsSnap = await getDocs(appointmentsQuery);
          const totalSessions = appointmentsSnap.size;

          // Get latest risk score
          const riskQuery = firestoreQuery(
            collection(db, 'patient_risk_scores'),
            where('patient_id', '==', p.id),
            fsOrderBy('calculated_at', 'desc'),
            fsLimit(1)
          );
          const riskSnap = await getDocs(riskQuery);
          const riskScore = riskSnap.docs[0]?.data();
          const overallProgress = riskScore?.overall_progress_percentage || 0;
          const dropoutRisk = riskScore?.dropout_risk_score || 50;

          // Get pathology from latest evolution
          const evolutionQuery = firestoreQuery(
            collection(db, 'patient_evolution'),
            where('patient_id', '==', p.id),
            fsOrderBy('created_at', 'desc'),
            fsLimit(1)
          );
          const evolutionSnap = await getDocs(evolutionQuery);
          const pathology = evolutionSnap.docs[0]?.data()?.pathology || 'Não especificado';

          return {
            id: p.id,
            full_name: p.full_name,
            created_at: p.created_at,
            pathology,
            birth_date: p.birth_date,
            total_sessions: totalSessions,
            overall_progress: overallProgress,
            dropout_risk: dropoutRisk,
            status: 'active',
          };
        })
      );

      return patientsWithAnalytics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ========================================================================
  // COHORT CALCULATION
  // ========================================================================

  const cohorts = useMemo((): CohortData[] => {
    if (!patients) return [];

    const groups = new Map<string, PatientWithCohortData[]>();

    // Group patients by cohort criteria
    patients.forEach((patient) => {
      let cohortKey = '';

      switch (cohortBy) {
        case 'pathology':
          cohortKey = patient.pathology || 'Não especificado';
          break;
        case 'age_group':
          cohortKey = getAgeGroup(patient.birth_date);
          break;
        case 'session_frequency':
          cohortKey = getSessionFrequency(patient.total_sessions, patient.created_at);
          break;
        case 'outcome':
          cohortKey = getOutcomeCategory(patient.overall_progress, patient.dropout_risk);
          break;
        case 'treatment_type':
        default:
          cohortKey = 'Fisioterapia Geral';
      }

      if (!groups.has(cohortKey)) {
        groups.set(cohortKey, []);
      }
      groups.get(cohortKey)!.push(patient);
    });

    // Calculate cohort metrics
    const cohortData: CohortData[] = Array.from(groups.entries()).map(
      ([name, group]) => {
        const totalSessions = group.reduce((sum, p) => sum + p.total_sessions, 0);
        const totalProgress = group.reduce((sum, p) => sum + p.overall_progress, 0);
        const totalDropoutRisk = group.reduce((sum, p) => sum + p.dropout_risk, 0);
        const groupSize = group.length;

        return {
          name,
          patients: groupSize,
          avgSessions: Math.round(totalSessions / groupSize),
          avgPainReduction: Math.round((totalProgress / groupSize) * 0.8),
          avgProgress: Math.round(totalProgress / groupSize),
          dropoutRate: Math.round(totalDropoutRisk / groupSize),
          successRate: Math.round(100 - totalDropoutRisk / groupSize),
          avgSatisfaction: 4.2,
        };
      }
    );

    return sortCohorts(cohortData, cohortBy);
  }, [patients, cohortBy]);

  // ========================================================================
  // FILTERING
  // ========================================================================

  const filteredCohorts = useMemo(() => {
    if (!searchQuery) return cohorts;
    const searchLower = searchQuery.toLowerCase();
    return cohorts.filter((c) =>
      c.name.toLowerCase().includes(searchLower) ||
      formatCohortName(c.name).toLowerCase().includes(searchLower)
    );
  }, [cohorts, searchQuery]);

  // ========================================================================
  // RADAR CHART DATA
  // ========================================================================

  const radarData = useMemo(() => {
    if (filteredCohorts.length === 0) return [];

    const metrics = [
      { key: 'avgSessions', label: 'Sessões Médias' },
      { key: 'avgPainReduction', label: 'Redução de Dor' },
      { key: 'avgProgress', label: 'Progresso' },
      { key: 'successRate', label: 'Taxa de Sucesso' },
      { key: 'avgSatisfaction', label: 'Satisfação' },
    ] as const;

    const maxSessions = Math.max(...filteredCohorts.map((c) => c.avgSessions), 1);
    const displayCohorts =
      selectedCohorts.length > 0
        ? filteredCohorts.filter((c) => selectedCohorts.includes(c.name))
        : filteredCohorts.slice(0, 3);

    return metrics.map((metric) => {
      const dataPoint: Record<string, string | number> = {
        metric: metric.label,
      };

      displayCohorts.forEach((cohort) => {
        let value = cohort[metric.key] as number;
        if (metric.key === 'avgSessions') {
          value = (value / maxSessions) * 100;
        }
        dataPoint[cohort.name] = Math.round(value);
      });

      return dataPoint;
    });
  }, [filteredCohorts, selectedCohorts]);

  // ========================================================================
  // SUMMARY CALCULATIONS
  // ========================================================================

  const summaryData = useMemo(() => {
    const totalPatients = filteredCohorts.reduce((sum, c) => sum + c.patients, 0);
    const avgProgress = calculateWeightedAverage(filteredCohorts, 'avgProgress');
    const avgSessions = calculateWeightedAverage(filteredCohorts, 'avgSessions');

    return {
      totalCohorts: filteredCohorts.length,
      totalPatients,
      avgProgress,
      avgSessions,
    };
  }, [filteredCohorts]);

  // ========================================================================
  // COHORT SELECTION
  // ========================================================================

  const toggleCohortSelection = useCallback((cohortName: string) => {
    setSelectedCohorts((prev) =>
      prev.includes(cohortName)
        ? prev.filter((c) => c !== cohortName)
        : [...prev, cohortName]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCohorts([]);
  }, []);

  // ========================================================================
  // EXPORT FUNCTIONALITY
  // ========================================================================

  const exportCohortData = useCallback(() => {
    const dataToExport =
      selectedCohorts.length > 0
        ? filteredCohorts.filter((c) => selectedCohorts.includes(c.name))
        : filteredCohorts;

    const headers = [
      'Cohorte',
      'Pacientes',
      'Sessões Médias',
      'Redução de Dor',
      'Progresso',
      'Taxa de Abandono',
      'Taxa de Sucesso',
    ];

    const rows = dataToExport.map((c) => [
      c.name,
      c.patients.toString(),
      c.avgSessions.toString(),
      `${c.avgPainReduction}%`,
      `${c.avgProgress}%`,
      `${c.dropoutRate}%`,
      `${c.successRate}%`,
    ]);

    const csvContent =
      CSV_BOM +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cohortes_${format(new Date(), 'yyyyMMdd_Hmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredCohorts, selectedCohorts]);

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-12 text-center">
          <p className="text-destructive font-medium mb-2">
            Erro ao carregar dados dos cohortes
          </p>
          <p className="text-muted-foreground text-sm">
            {(error as Error).message || 'Tente novamente mais tarde'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Comparação de Cohortes</h2>
          <p className="text-muted-foreground mt-1">
            Analise e compare grupos de pacientes por diferentes critérios
          </p>
        </div>
        <Button onClick={exportCohortData} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Group By */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Agrupar por</label>
              <div className="relative">
                <select
                  value={cohortBy}
                  onChange={(e) => {
                    setCohortBy(e.target.value as CohortBy);
                    setSelectedCohorts([]);
                  }}
                  className="w-full px-3 py-2 pr-8 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring focus:border-ring appearance-none"
                >
                  <option value="pathology">Patologia</option>
                  <option value="age_group">Faixa Etária</option>
                  <option value="session_frequency">Frequência de Sessões</option>
                  <option value="outcome">Desfecho</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Time Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Período</label>
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="w-full px-3 py-2 pr-8 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring focus:border-ring appearance-none"
                >
                  {Object.entries(TIME_RANGE_CONFIGS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar cohortes..."
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>
          </div>

          {/* Selection Controls */}
          {selectedCohorts.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Badge variant="secondary" className="gap-1">
                {selectedCohorts.length} selecionados
              </Badge>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Limpar seleção
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total de Cohortes"
          value={summaryData.totalCohorts}
          icon={<Users className="h-5 w-5" />}
          color="indigo"
        />
        <SummaryCard
          title="Pacientes Analisados"
          value={summaryData.totalPatients}
          icon={<Activity className="h-5 w-5" />}
          color="green"
        />
        <SummaryCard
          title="Progresso Médio"
          value={`${summaryData.avgProgress}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="yellow"
        />
        <SummaryCard
          title="Sessões Médias"
          value={summaryData.avgSessions}
          icon={<Calendar className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Sessions by Cohort */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sessões por Cohorte</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredCohorts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatCohortName}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} formatter={(value: number) => [value, 'Sessões']} />
                <Bar dataKey="avgSessions" radius={[4, 4, 0, 0]}>
                  {filteredCohorts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Progress by Cohort */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso por Cohorte</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredCohorts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatCohortName}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number) => [`${value}%`, 'Progresso']}
                />
                <Bar dataKey="avgProgress" radius={[4, 4, 0, 0]}>
                  {filteredCohorts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Success vs Dropout Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sucesso vs Abandono</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredCohorts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatCohortName}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-xs"
                />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="successRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Taxa de Sucesso"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="dropoutRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Taxa de Abandono"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart - Multi-dimensional Comparison */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparação Multidimensional</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis
                    dataKey="metric"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    angle={90}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  {(selectedCohorts.length > 0
                    ? filteredCohorts
                      .filter((c) => selectedCohorts.includes(c.name))
                      .slice(0, 5)
                    : filteredCohorts.slice(0, 3)
                  ).map((cohort, index) => (
                    <Radar
                      key={cohort.name}
                      name={formatCohortName(cohort.name)}
                      dataKey={cohort.name}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cohort Details Table */}
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Detalhes dos Cohortes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cohorte
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pacientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sessões Médias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Taxa de Sucesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Taxa de Abandono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Comparar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCohorts.map((cohort, index) => (
                <tr
                  key={cohort.name}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    selectedCohorts.includes(cohort.name) && 'bg-muted/50'
                  )}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-sm font-medium">
                        {formatCohortName(cohort.name)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {cohort.patients}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {cohort.avgSessions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${cohort.avgProgress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {cohort.avgProgress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {cohort.successRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getDropoutRateBadgeClasses(cohort.dropoutRate)}>
                      {cohort.dropoutRate}%
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCohorts.includes(cohort.name)}
                      onChange={() => toggleCohortSelection(cohort.name)}
                      className="h-4 w-4 accent-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded border-input"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty State */}
      {filteredCohorts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Filter className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cohorte encontrado</h3>
            <p className="text-muted-foreground text-sm">
              Tente ajustar os filtros ou o período de análise
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CohortComparison;
export type { PatientWithCohortData, TimeRangeConfig, CohortComparisonProps };
