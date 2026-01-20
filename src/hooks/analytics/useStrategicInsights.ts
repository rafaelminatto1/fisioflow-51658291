/**
 * React Hooks for Strategic Analytics
 * @module hooks/analytics/useStrategicInsights
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

import type {
  TimeSlotInsight,
  AcquisitionGap,
  StrategicInsight,
  SmartAlertHistory,
  SmartAlertConfiguration,
  StrategicDashboardMetrics,
  TimeSlotAnalysisOptions,
  AcquisitionAnalysisOptions,
} from '@/lib/analytics/strategic/types';

// ============================================================================
// TIME SLOT OPPORTUNITIES HOOK
// ============================================================================

export interface UseTimeSlotOpportunitiesOptions extends TimeSlotAnalysisOptions {
  organizationId?: string;
  enabled?: boolean;
}

export function useTimeSlotOpportunities(options: UseTimeSlotOpportunitiesOptions = {}) {
  const { organizationId, enabled = true, ...analysisOptions } = options;

  return useQuery({
    queryKey: ['strategic-analytics', 'time-slot-opportunities', analysisOptions],
    queryFn: async () => {
      let query = supabase
        .from('time_slot_opportunities')
        .select('*')
        .gte('opportunity_score', analysisOptions.minOpportunityScore || 30)
        .order('opportunity_score', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (analysisOptions.daysOfWeek && analysisOptions.daysOfWeek.length > 0) {
        query = query.in('day_of_week', analysisOptions.daysOfWeek);
      }

      if (analysisOptions.hours && analysisOptions.hours.length > 0) {
        query = query.in('hour', analysisOptions.hours);
      }

      if (analysisOptions.limit) {
        query = query.limit(analysisOptions.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to TimeSlotInsight format
      return data.map((row: any): TimeSlotInsight => ({
        dayOfWeek: row.day_name,
        dayName: row.day_name,
        hour: row.hour,
        hourLabel: `${String(row.hour).padStart(2, '0')}:00`,
        occupancyRate: row.occupancy_rate,
        opportunityScore: row.opportunity_score,
        opportunityLevel: row.opportunity_level,
        trend: row.trend_delta > 0.05 ? 'improving' : row.trend_delta < -0.05 ? 'declining' : 'stable',
        suggestedActions: generateSlotActions(row.opportunity_level, row.day_name, row.hour),
      }));
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

function generateSlotActions(level: string, dayName: string, hour: number): string[] {
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;
  const actions: string[] = [];

  if (level === 'high') {
    actions.push(`Oferecer desconto de 20% para ${dayName}s às ${hourLabel}`);
    actions.push(`Lançar campanha "Semana da ${dayName}"`);
    actions.push(`Enviar SMS para pacientes inativos`);
  } else if (level === 'medium') {
    actions.push(`Oferecer desconto de 10% para ${dayName}s às ${hourLabel}`);
    actions.push(`Criar campanha específica para este horário`);
  }

  return actions;
}

// ============================================================================
// ACQUISITION GAPS HOOK
// ============================================================================

export interface UseAcquisitionGapsOptions extends AcquisitionAnalysisOptions {
  organizationId?: string;
  enabled?: boolean;
}

export function useAcquisitionGaps(options: UseAcquisitionGapsOptions = {}) {
  const { organizationId, enabled = true, ...analysisOptions } = options;

  return useQuery({
    queryKey: ['strategic-analytics', 'acquisition-gaps', analysisOptions],
    queryFn: async () => {
      let query = supabase
        .from('patient_acquisition_periods')
        .select('*')
        .gte('period_start', subDays(new Date(), 90).toISOString())
        .order('period_start', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (analysisOptions.classification && analysisOptions.classification.length > 0) {
        query = query.in('period_classification', analysisOptions.classification);
      }

      if (analysisOptions.limit) {
        query = query.limit(analysisOptions.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to AcquisitionGap format
      return data.map((row: any): AcquisitionGap => ({
        period: {
          type: 'week' as const,
          label: row.period_label,
          startDate: new Date(row.period_start),
          endDate: new Date(row.period_end),
        },
        metrics: {
          newPatients: row.new_patients_count,
          evaluations: row.new_evaluations_count,
          conversionRate: row.new_patients_count > 0
            ? (row.new_evaluations_count / row.new_patients_count) * 100
            : 0,
        },
        comparison: {
          vsAverage: row.new_patients_vs_avg_pct,
          zScore: row.new_patients_z_score,
        },
        classification: row.period_classification === 'critical_low' || row.period_classification === 'low'
          ? (row.period_classification === 'critical_low' ? 'critical' : 'low')
          : row.period_classification === 'high' || row.period_classification === 'exceptional'
          ? 'high'
          : 'normal',
        suggestedActions: generateAcquisitionActions(row.period_classification, row.new_patients_vs_avg_pct),
      }));
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

function generateAcquisitionActions(classification: string, vsAvg: number): string[] {
  const actions: string[] = [];

  if (classification === 'critical_low' || vsAvg < -30) {
    actions.push('Lançar campanha agressiva de captação');
    actions.push('Oferecer avaliação gratuita');
    actions.push('Estabelecer parcerias locais');
    actions.push('Programa de indicação com bônus');
  } else if (classification === 'low' || vsAvg < -15) {
    actions.push('Aumentar marketing digital');
    actions.push('Oferecer desconto de 15% primeira consulta');
    actions.push('Recuperar pacientes inativos');
  }

  return actions;
}

// ============================================================================
// STRATEGIC INSIGHTS HOOK
// ============================================================================

export interface UseStrategicInsightsOptions {
  organizationId?: string;
  insightTypes?: string[];
  priorities?: string[];
  status?: string[];
  includeDismissed?: boolean;
  enabled?: boolean;
}

export function useStrategicInsights(options: UseStrategicInsightsOptions = {}) {
  const {
    organizationId,
    insightTypes,
    priorities,
    status = ['detected', 'acknowledged'],
    includeDismissed = false,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['strategic-analytics', 'insights', options],
    queryFn: async () => {
      let query = supabase
        .from('strategic_insights')
        .select('*')
        .in('status', includeDismissed ? ['detected', 'acknowledged', 'addressed', 'dismissed'] : status)
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (insightTypes && insightTypes.length > 0) {
        query = query.in('insight_type', insightTypes);
      }

      if (priorities && priorities.length > 0) {
        query = query.in('priority', priorities);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StrategicInsight[];
    },
    enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

// ============================================================================
// SMART ALERTS HOOK
// ============================================================================

export interface UseSmartAlertsOptions {
  organizationId?: string;
  severity?: string[];
  status?: string[];
  limit?: number;
  enabled?: boolean;
}

export function useSmartAlerts(options: UseSmartAlertsOptions = {}) {
  const {
    organizationId,
    severity,
    status = ['triggered', 'acknowledged'],
    limit = 20,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['strategic-analytics', 'alerts', options],
    queryFn: async () => {
      let query = supabase
        .from('smart_alert_history')
        .select('*')
        .in('status', status)
        .order('alert_date', { ascending: false })
        .limit(limit);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (severity && severity.length > 0) {
        query = query.in('severity', severity);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SmartAlertHistory[];
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useSmartAlertConfigurations(options: { organizationId?: string; enabled?: boolean } = {}) {
  const { organizationId, enabled = true } = options;

  return useQuery({
    queryKey: ['strategic-analytics', 'alert-configurations', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('smart_alert_configurations')
        .select('*')
        .order('severity', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SmartAlertConfiguration[];
    },
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// ============================================================================
// ACKNOWLEDGE INSIGHT MUTATION
// ============================================================================

export function useAcknowledgeInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ insightId, notes }: { insightId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('strategic_insights')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', insightId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-analytics', 'insights'] });
    },
  });
}

// ============================================================================
// DISMISS INSIGHT MUTATION
// ============================================================================

export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ insightId }: { insightId: string }) => {
      const { data, error } = await supabase
        .from('strategic_insights')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', insightId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-analytics', 'insights'] });
    },
  });
}

// ============================================================================
// ACKNOWLEDGE ALERT MUTATION
// ============================================================================

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('smart_alert_history')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-analytics', 'alerts'] });
    },
  });
}

// ============================================================================
// DASHBOARD METRICS HOOK (COMPOSITE)
// ============================================================================

export function useStrategicDashboard(options: { organizationId?: string; enabled?: boolean } = {}) {
  const { organizationId, enabled = true } = options;

  const timeSlots = useTimeSlotOpportunities({
    organizationId,
    enabled,
    limit: 5,
  });

  const acquisitionGaps = useAcquisitionGaps({
    organizationId,
    enabled,
    limit: 5,
    classification: ['critical_low', 'low'],
  });

  const insights = useStrategicInsights({
    organizationId,
    enabled,
    priorities: ['critical', 'high'],
    limit: 10,
  });

  const alerts = useSmartAlerts({
    organizationId,
    enabled,
    status: ['triggered'],
    limit: 5,
  });

  const isLoading = timeSlots.isLoading || acquisitionGaps.isLoading || insights.isLoading || alerts.isLoading;
  const error = timeSlots.error || acquisitionGaps.error || insights.error || alerts.error;

  const summary = {
    totalOpportunities: timeSlots.data?.length || 0,
    criticalInsights: insights.data?.filter(i => i.priority === 'critical').length || 0,
    activeAlerts: alerts.data?.length || 0,
    overallHealthScore: calculateHealthScore({
      opportunities: timeSlots.data || [],
      insights: insights.data || [],
      alerts: alerts.data || [],
    }),
  };

  return {
    data: {
      topOpportunities: timeSlots.data || [],
      acquisitionGaps: acquisitionGaps.data || [],
      activeInsights: insights.data || [],
      recentAlerts: alerts.data || [],
      summary,
    } as StrategicDashboardMetrics,
    isLoading,
    error,
    refetch: () => {
      timeSlots.refetch();
      acquisitionGaps.refetch();
      insights.refetch();
      alerts.refetch();
    },
  };
}

function calculateHealthScore(data: {
  opportunities: TimeSlotInsight[];
  insights: StrategicInsight[];
  alerts: SmartAlertHistory[];
}): number {
  let score = 100;

  // Deduct for critical insights
  const criticalInsights = data.insights.filter(i => i.priority === 'critical').length;
  score -= criticalInsights * 15;

  // Deduct for high insights
  const highInsights = data.insights.filter(i => i.priority === 'high').length;
  score -= highInsights * 5;

  // Deduct for active alerts
  const criticalAlerts = data.alerts.filter(a => a.severity === 'critical').length;
  score -= criticalAlerts * 10;

  // Add bonus for many opportunities (means we can improve)
  const highOpportunities = data.opportunities.filter(o => o.opportunityLevel === 'high').length;
  score += highOpportunities * 2;

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// REFRESH INSIGHTS MUTATION
// ============================================================================

export function useRefreshInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId?: string }) => {
      const { data, error } = await supabase.rpc('generate_strategic_insights', {
        p_organization_id: organizationId || null,
        p_insight_types: null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-analytics'] });
    },
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  useTimeSlotOpportunities,
  useAcquisitionGaps,
  useStrategicInsights,
  useSmartAlerts,
  useSmartAlertConfigurations,
  useStrategicDashboard,
  useAcknowledgeInsight,
  useDismissInsight,
  useAcknowledgeAlert,
  useRefreshInsights,
};

export type {
  UseTimeSlotOpportunitiesOptions,
  UseAcquisitionGapsOptions,
  UseStrategicInsightsOptions,
  UseSmartAlertsOptions,
};
