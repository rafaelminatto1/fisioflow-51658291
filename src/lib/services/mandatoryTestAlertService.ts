import { supabase } from '@/integrations/supabase/client';
import type { MandatoryTestAlert, AssessmentTestConfig } from '@/types/evolution';
import { TestEvolutionService } from './testEvolutionService';
import { PathologyService } from './pathologyService';
import { logger } from '@/lib/errors/logger';

export interface AlertCheckResult {
  canSave: boolean;
  criticalAlerts: MandatoryTestAlert[];
  importantAlerts: MandatoryTestAlert[];
  lightAlerts: MandatoryTestAlert[];
  allCompleted: boolean;
}

export class MandatoryTestAlertService {
  /**
   * Verifica todos os testes obrigatórios para um paciente em uma sessão específica
   */
  static async checkMandatoryTests(
    patientId: string,
    sessionNumber: number,
    completedTests: string[]
  ): Promise<AlertCheckResult> {
    try {
      // 1. Buscar patologias ativas do paciente
      await PathologyService.getActivePathologies(patientId);

      // 2. Buscar testes obrigatórios baseados nas patologias
      const mandatoryTests = await TestEvolutionService.getMandatoryTests(patientId, sessionNumber);
      
      // 3. Verificar quais testes foram completados
      const alerts: MandatoryTestAlert[] = mandatoryTests.map(test => ({
        id: `alert_${test.id}_${sessionNumber}`,
        patient_id: patientId,
        session_number: sessionNumber,
        test_config: test,
        is_completed: completedTests.includes(test.test_name),
        alert_level: test.alert_level,
      }));

      // 4. Separar por nível de alerta
      const criticalAlerts = alerts.filter(a => a.alert_level === 'critico' && !a.is_completed);
      const importantAlerts = alerts.filter(a => a.alert_level === 'importante' && !a.is_completed);
      const lightAlerts = alerts.filter(a => a.alert_level === 'leve' && !a.is_completed);

      // 5. Verificar se pode salvar (críticos bloqueiam)
      const canSave = criticalAlerts.length === 0;
      const allCompleted = alerts.every(a => a.is_completed);

      return {
        canSave,
        criticalAlerts,
        importantAlerts,
        lightAlerts,
        allCompleted,
      };
    } catch (error) {
      logger.error('Erro ao verificar testes obrigatórios', error, 'MandatoryTestAlertService');
      // Em caso de erro, permite salvar para não bloquear o fluxo
      return {
        canSave: true,
        criticalAlerts: [],
        importantAlerts: [],
        lightAlerts: [],
        allCompleted: true,
      };
    }
  }

  /**
   * Registra uma exceção para um teste obrigatório não realizado
   */
  static async registerException(
    patientId: string,
    sessionId: string,
    testName: string,
    reason: string
  ): Promise<void> {
    // Registrar no audit log
    const { error } = await supabase.from('audit_log').insert({
      action: 'MANDATORY_TEST_EXCEPTION',
      table_name: 'evolution_measurements',
      user_id: (await supabase.auth.getUser()).data.user?.id,
      new_data: {
        patient_id: patientId,
        session_id: sessionId,
        test_name: testName,
        exception_reason: reason,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      logger.error('Erro ao registrar exceção de teste obrigatório', error, 'MandatoryTestAlertService');
      throw error;
    }
  }

  /**
   * Obtém as configurações de testes obrigatórios por patologia
   */
  static getTestConfigsByPathology(pathologyName: string): AssessmentTestConfig[] {
    // Configurações padrão de testes por patologia
    const defaultConfigs: Record<string, Partial<AssessmentTestConfig>[]> = {
      'Reconstrução LCA': [
        {
          test_name: 'Amplitude de Flexão do Joelho',
          test_type: 'range_of_motion',
          frequency_sessions: 1,
          is_mandatory: true,
          alert_level: 'critico',
          unit: 'graus',
          min_value: 0,
          max_value: 160,
        },
        {
          test_name: 'Amplitude de Extensão do Joelho',
          test_type: 'range_of_motion',
          frequency_sessions: 1,
          is_mandatory: true,
          alert_level: 'critico',
          unit: 'graus',
          min_value: -10,
          max_value: 10,
        },
        {
          test_name: 'Circunferência da Coxa',
          test_type: 'measurement',
          frequency_sessions: 5,
          is_mandatory: true,
          alert_level: 'importante',
          unit: 'cm',
        },
        {
          test_name: 'EVA (Escala Visual Analógica)',
          test_type: 'pain_scale',
          frequency_sessions: 1,
          is_mandatory: true,
          alert_level: 'importante',
          min_value: 0,
          max_value: 10,
        },
      ],
      'Síndrome do Manguito Rotador': [
        {
          test_name: 'Flexão do Ombro',
          test_type: 'range_of_motion',
          frequency_sessions: 1,
          is_mandatory: true,
          alert_level: 'critico',
          unit: 'graus',
          min_value: 0,
          max_value: 180,
        },
        {
          test_name: 'Abdução do Ombro',
          test_type: 'range_of_motion',
          frequency_sessions: 1,
          is_mandatory: true,
          alert_level: 'critico',
          unit: 'graus',
          min_value: 0,
          max_value: 180,
        },
        {
          test_name: 'EVA (Escala Visual Analógica)',
          test_type: 'pain_scale',
          frequency_sessions: 1,
          is_mandatory: true,
          alert_level: 'importante',
          min_value: 0,
          max_value: 10,
        },
      ],
      'Lombalgia': [
        {
          test_name: 'EVA (Escala Visual Analógica)',
          test_type: 'pain_scale',
          frequency_sessions: 1,
          is_mandatory: true,
          alert_level: 'importante',
          min_value: 0,
          max_value: 10,
        },
        {
          test_name: 'Teste de Schober',
          test_type: 'functional',
          frequency_sessions: 3,
          is_mandatory: true,
          alert_level: 'leve',
          unit: 'cm',
        },
      ],
    };

    const configs = defaultConfigs[pathologyName] || [];
    
    return configs.map((config, index) => ({
      id: `config_${pathologyName}_${index}`,
      pathology_name: pathologyName,
      test_name: config.test_name || '',
      test_type: config.test_type || 'measurement',
      frequency_sessions: config.frequency_sessions || 1,
      is_mandatory: config.is_mandatory ?? true,
      alert_level: config.alert_level || 'leve',
      instructions: config.instructions,
      min_value: config.min_value,
      max_value: config.max_value,
      unit: config.unit,
    }));
  }

  /**
   * Verifica se um teste específico deve ser realizado nesta sessão
   */
  static shouldPerformTest(config: AssessmentTestConfig, sessionNumber: number): boolean {
    return sessionNumber % config.frequency_sessions === 0;
  }

  /**
   * Retorna mensagem de alerta formatada
   */
  static getAlertMessage(alert: MandatoryTestAlert): string {
    const levelText = {
      critico: '⛔ CRÍTICO',
      importante: '⚠️ IMPORTANTE',
      leve: 'ℹ️ RECOMENDADO',
    };

    return `${levelText[alert.alert_level]}: ${alert.test_config.test_name} não foi realizado.`;
  }
}
