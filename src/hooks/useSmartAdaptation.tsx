import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface AdaptationRule {
  id: string;
  condition_type: 'pain_increase' | 'pain_decrease' | 'functional_improvement' | 'compliance_low';
  threshold_value: number;
  action_type: 'increase_intensity' | 'decrease_intensity' | 'add_exercise' | 'remove_exercise' | 'modify_duration';
  adjustment_percentage: number;
  description: string;
  created_at: string;
}

export interface AdaptationSuggestion {
  id: string;
  patient_id: string;
  exercise_plan_id: string;
  rule_id: string;
  current_metrics: {
    pain_level: number;
    functional_score: number;
    compliance: number;
  };
  suggested_changes: {
    exercise_id?: string;
    new_intensity?: number;
    new_duration?: number;
    new_repetitions?: number;
    action_description: string;
  };
  confidence_score: number;
  status: 'pending' | 'applied' | 'rejected';
  created_at: string;
}

export interface PatientMetrics {
  patient_id: string;
  pain_trend: 'increasing' | 'decreasing' | 'stable';
  functional_trend: 'improving' | 'declining' | 'stable';
  compliance_rate: number;
  last_assessment: string;
}

export function useSmartAdaptation() {
  const [adaptationRules, setAdaptationRules] = useState<AdaptationRule[]>([]);
  const [suggestions, setSuggestions] = useState<AdaptationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch adaptation rules
  const fetchAdaptationRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('adaptation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdaptationRules(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar regras de adaptação');
      toast.error('Erro ao carregar regras de adaptação');
    } finally {
      setLoading(false);
    }
  };

  // Create adaptation rule
  const createAdaptationRule = async (rule: Omit<AdaptationRule, 'id' | 'created_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('adaptation_rules')
        .insert([rule])
        .select()
        .single();

      if (error) throw error;
      
      setAdaptationRules(prev => [data, ...prev]);
      toast.success('Regra de adaptação criada com sucesso');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar regra';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Analyze patient metrics and generate suggestions
  const analyzePatientMetrics = async (patientId: string): Promise<AdaptationSuggestion[]> => {
    try {
      setLoading(true);
      
      // Get recent patient progress
      const { data: progressData, error: progressError } = await supabase
        .from('patient_progress')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (progressError) throw progressError;

      if (!progressData || progressData.length < 2) {
        return [];
      }

      // Calculate trends
      const metrics = calculatePatientMetrics(progressData);
      
      // Get active exercise plans
      const { data: plansData, error: plansError } = await supabase
        .from('exercise_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active');

      if (plansError) throw plansError;

      const newSuggestions: AdaptationSuggestion[] = [];

      // Apply adaptation rules
      for (const rule of adaptationRules) {
        const suggestion = applyAdaptationRule(rule, metrics, plansData || []);
        if (suggestion) {
          newSuggestions.push(suggestion);
        }
      }

      // Save suggestions to database
      if (newSuggestions.length > 0) {
        const { error: insertError } = await supabase
          .from('adaptation_suggestions')
          .insert(newSuggestions);

        if (insertError) throw insertError;
      }

      setSuggestions(prev => [...newSuggestions, ...prev]);
      return newSuggestions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar métricas';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Calculate patient metrics from progress data
  const calculatePatientMetrics = (progressData: any[]): PatientMetrics => {
    const latest = progressData[0];
    const previous = progressData[1];

    const painTrend = latest.pain_level > previous.pain_level + 1 ? 'increasing' :
                     latest.pain_level < previous.pain_level - 1 ? 'decreasing' : 'stable';

    const functionalTrend = latest.functional_score > previous.functional_score + 5 ? 'improving' :
                           latest.functional_score < previous.functional_score - 5 ? 'declining' : 'stable';

    const complianceRate = progressData.reduce((sum, p) => sum + p.exercise_compliance, 0) / progressData.length;

    return {
      patient_id: latest.patient_id,
      pain_trend,
      functional_trend,
      compliance_rate: complianceRate,
      last_assessment: latest.created_at
    };
  };

  // Apply adaptation rule to generate suggestion
  const applyAdaptationRule = (
    rule: AdaptationRule, 
    metrics: PatientMetrics, 
    plans: any[]
  ): AdaptationSuggestion | null => {
    let shouldApply = false;
    let confidenceScore = 0;

    // Check if rule conditions are met
    switch (rule.condition_type) {
      case 'pain_increase':
        shouldApply = metrics.pain_trend === 'increasing';
        confidenceScore = 0.8;
        break;
      case 'pain_decrease':
        shouldApply = metrics.pain_trend === 'decreasing';
        confidenceScore = 0.7;
        break;
      case 'functional_improvement':
        shouldApply = metrics.functional_trend === 'improving';
        confidenceScore = 0.75;
        break;
      case 'compliance_low':
        shouldApply = metrics.compliance_rate < rule.threshold_value;
        confidenceScore = 0.9;
        break;
    }

    if (!shouldApply || plans.length === 0) return null;

    // Generate suggested changes
    const suggestedChanges = generateSuggestedChanges(rule, plans[0]);

    return {
      id: crypto.randomUUID(),
      patient_id: metrics.patient_id,
      exercise_plan_id: plans[0].id,
      rule_id: rule.id,
      current_metrics: {
        pain_level: 0, // Will be filled from latest progress
        functional_score: 0,
        compliance: metrics.compliance_rate
      },
      suggested_changes: suggestedChanges,
      confidence_score: confidenceScore,
      status: 'pending',
      created_at: new Date().toISOString()
    };
  };

  // Generate suggested changes based on rule
  const generateSuggestedChanges = (rule: AdaptationRule, plan: any) => {
    const changes: any = {
      action_description: rule.description
    };

    switch (rule.action_type) {
      case 'increase_intensity':
        changes.new_intensity = Math.min(10, (plan.intensity || 5) * (1 + rule.adjustment_percentage / 100));
        changes.action_description = `Aumentar intensidade em ${rule.adjustment_percentage}%`;
        break;
      case 'decrease_intensity':
        changes.new_intensity = Math.max(1, (plan.intensity || 5) * (1 - rule.adjustment_percentage / 100));
        changes.action_description = `Reduzir intensidade em ${rule.adjustment_percentage}%`;
        break;
      case 'modify_duration':
        changes.new_duration = Math.max(5, (plan.duration || 30) * (1 + rule.adjustment_percentage / 100));
        changes.action_description = `Ajustar duração em ${rule.adjustment_percentage}%`;
        break;
    }

    return changes;
  };

  // Apply suggestion to exercise plan
  const applySuggestion = async (suggestionId: string) => {
    try {
      setLoading(true);
      
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) throw new Error('Sugestão não encontrada');

      // Update exercise plan with suggested changes
      const { error: updateError } = await supabase
        .from('exercise_plans')
        .update({
          intensity: suggestion.suggested_changes.new_intensity,
          duration: suggestion.suggested_changes.new_duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestion.exercise_plan_id);

      if (updateError) throw updateError;

      // Mark suggestion as applied
      const { error: suggestionError } = await supabase
        .from('adaptation_suggestions')
        .update({ status: 'applied' })
        .eq('id', suggestionId);

      if (suggestionError) throw suggestionError;

      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, status: 'applied' as const } : s)
      );

      toast.success('Sugestão aplicada com sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao aplicar sugestão';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Reject suggestion
  const rejectSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('adaptation_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;

      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, status: 'rejected' as const } : s)
      );

      toast.success('Sugestão rejeitada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao rejeitar sugestão';
      setError(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    fetchAdaptationRules();
  }, []);

  return {
    adaptationRules,
    suggestions,
    loading,
    error,
    fetchAdaptationRules,
    createAdaptationRule,
    analyzePatientMetrics,
    applySuggestion,
    rejectSuggestion
  };
}