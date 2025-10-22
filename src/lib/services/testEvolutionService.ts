import { supabase } from '@/integrations/supabase/client';
import type { TestEvolutionData, TestResult, TestStatistics, AssessmentTestConfig } from '@/types/evolution';

export class TestEvolutionService {
  static async getTestEvolutionData(patientId: string, testName: string): Promise<TestEvolutionData[]> {
    const { data, error } = await supabase
      .from('evolution_measurements')
      .select('*')
      .eq('patient_id', patientId)
      .eq('measurement_name', testName)
      .order('measured_at', { ascending: true });

    if (error) throw error;

    // Transform to TestEvolutionData format
    return (data || []).map((item, index) => ({
      id: item.id,
      patient_id: item.patient_id,
      test_name: item.measurement_name,
      date: item.measured_at.split('T')[0],
      value: Number(item.value),
      unit: item.unit || undefined,
      session_number: index + 1,
      variation: index > 0 ? Number(item.value) - Number(data[index - 1].value) : 0
    }));
  }

  static async getTestHistory(patientId: string): Promise<Map<string, TestEvolutionData[]>> {
    const { data, error } = await supabase
      .from('evolution_measurements')
      .select('*')
      .eq('patient_id', patientId)
      .order('measured_at', { ascending: true });

    if (error) throw error;

    const historyMap = new Map<string, TestEvolutionData[]>();
    
    (data || []).forEach((item, index, arr) => {
      const testName = item.measurement_name;
      if (!historyMap.has(testName)) {
        historyMap.set(testName, []);
      }

      const previousTests = arr.filter((t, i) => i < index && t.measurement_name === testName);
      const sessionNumber = previousTests.length + 1;
      const previousValue = previousTests.length > 0 ? Number(previousTests[previousTests.length - 1].value) : null;

      historyMap.get(testName)!.push({
        id: item.id,
        patient_id: item.patient_id,
        test_name: item.measurement_name,
        date: item.measured_at.split('T')[0],
        value: Number(item.value),
        unit: item.unit || undefined,
        session_number: sessionNumber,
        variation: previousValue !== null ? Number(item.value) - previousValue : 0
      });
    });

    return historyMap;
  }

  static async addTestResult(patientId: string, sessionId: string, result: Omit<TestResult, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('evolution_measurements')
      .insert({
        patient_id: patientId,
        soap_record_id: sessionId,
        measurement_name: result.test_name,
        measurement_type: result.test_type,
        value: result.value,
        unit: result.unit,
        notes: result.notes,
        measured_at: result.measured_at,
        created_by: result.measured_by
      });

    if (error) throw error;
  }

  static async getMandatoryTests(patientId: string, sessionNumber: number): Promise<AssessmentTestConfig[]> {
    // Get patient pathologies
    const { data: pathologies, error: pathError } = await supabase
      .from('patient_pathologies')
      .select('pathology_name')
      .eq('patient_id', patientId)
      .eq('status', 'em_tratamento');

    if (pathError) throw pathError;

    if (!pathologies || pathologies.length === 0) return [];

    const pathologyNames = pathologies.map(p => p.pathology_name);

    // Get mandatory tests for these pathologies
    const { data: tests, error: testError } = await supabase
      .from('pathology_required_measurements')
      .select('*')
      .in('pathology_name', pathologyNames);

    if (testError) throw testError;

    // Filter by frequency (check if test should be done at this session)
    return (tests || [])
      .map(test => ({
        id: test.id,
        pathology_name: test.pathology_name,
        test_name: test.measurement_name,
        test_type: 'measurement',
        frequency_sessions: 1, // Default
        is_mandatory: true,
        alert_level: test.alert_level as 'critico' | 'importante' | 'leve',
        instructions: test.instructions || undefined,
        unit: test.measurement_unit || undefined,
        min_value: undefined,
        max_value: undefined
      }))
      .filter(test => sessionNumber % test.frequency_sessions === 0);
  }

  static async checkMandatoryTestsCompleted(patientId: string, sessionId: string): Promise<boolean> {
    const { data: measurements, error } = await supabase
      .from('evolution_measurements')
      .select('measurement_name')
      .eq('patient_id', patientId)
      .eq('soap_record_id', sessionId);

    if (error) throw error;

    // Get mandatory tests for this session
    const mandatoryTests = await this.getMandatoryTests(patientId, 1); // Simplified

    const completedTests = new Set((measurements || []).map(m => m.measurement_name));
    const criticalTests = mandatoryTests
      .filter(t => t.alert_level === 'critico')
      .map(t => t.test_name);

    return criticalTests.every(test => completedTests.has(test));
  }

  static async getTestStatistics(patientId: string, testName: string): Promise<TestStatistics> {
    const evolutionData = await this.getTestEvolutionData(patientId, testName);

    if (evolutionData.length === 0) {
      return {
        test_name: testName,
        count: 0,
        min_value: 0,
        max_value: 0,
        avg_value: 0,
        last_value: 0,
        first_value: 0,
        total_variation: 0,
        improvement_percentage: 0
      };
    }

    const values = evolutionData.map(d => d.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    return {
      test_name: testName,
      count: values.length,
      min_value: Math.min(...values),
      max_value: Math.max(...values),
      avg_value: values.reduce((a, b) => a + b, 0) / values.length,
      last_value: lastValue,
      first_value: firstValue,
      total_variation: lastValue - firstValue,
      improvement_percentage: firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
    };
  }
}
