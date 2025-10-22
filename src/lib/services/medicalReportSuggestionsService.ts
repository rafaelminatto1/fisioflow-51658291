import type { MedicalInsight, TestStatistics } from '@/types/evolution';
import { TestEvolutionService } from './testEvolutionService';

export class MedicalReportSuggestionsService {
  static async generateInsights(patientId: string, testNames: string[]): Promise<MedicalInsight[]> {
    const insights: MedicalInsight[] = [];

    for (const testName of testNames) {
      const stats = await TestEvolutionService.getTestStatistics(patientId, testName);
      
      if (stats.count < 2) continue;

      const insight = this.createInsightFromStats(patientId, testName, stats);
      if (insight) insights.push(insight);
    }

    return insights;
  }

  private static createInsightFromStats(
    patientId: string,
    testName: string,
    stats: TestStatistics
  ): MedicalInsight | null {
    const variation = stats.total_variation;
    const percentage = stats.improvement_percentage;

    if (Math.abs(percentage) < 5) return null; // Insignificant change

    let insightType: MedicalInsight['insight_type'];
    let insightText: string;

    if (testName.toLowerCase().includes('dor') || testName.toLowerCase().includes('eva')) {
      insightType = 'pain_reduction';
      if (variation < 0) {
        insightText = `Redução de dor de ${stats.first_value}/10 para ${stats.last_value}/10 (${Math.abs(percentage).toFixed(1)}% de melhora) em ${stats.count} sessões.`;
      } else {
        insightText = `Aumento de dor de ${stats.first_value}/10 para ${stats.last_value}/10 em ${stats.count} sessões. Requer atenção.`;
      }
    } else if (testName.toLowerCase().includes('amplitude') || testName.toLowerCase().includes('rom')) {
      insightType = 'range_improvement';
      insightText = `Amplitude de movimento ${variation > 0 ? 'aumentou' : 'diminuiu'} de ${stats.first_value}° para ${stats.last_value}° (${Math.abs(percentage).toFixed(1)}% de variação).`;
    } else if (testName.toLowerCase().includes('força') || testName.toLowerCase().includes('strength')) {
      insightType = 'strength_gain';
      insightText = `Força muscular evoluiu de grau ${stats.first_value} para grau ${stats.last_value} (${Math.abs(percentage).toFixed(1)}% de ganho).`;
    } else {
      insightType = 'functional_milestone';
      insightText = `${testName}: evolução de ${stats.first_value} para ${stats.last_value} (${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%).`;
    }

    return {
      id: `insight_${Date.now()}_${testName}`,
      patient_id: patientId,
      insight_type: insightType,
      insight_text: insightText,
      data_points: {
        initial_value: stats.first_value,
        final_value: stats.last_value,
        variation: stats.total_variation,
        percentage: stats.improvement_percentage,
        period_days: stats.count * 2 // Assuming sessions every 2 days
      },
      created_at: new Date().toISOString()
    };
  }

  static formatInsightsForReport(insights: MedicalInsight[]): string {
    if (insights.length === 0) {
      return 'Nenhuma evolução significativa registrada no período.';
    }

    let report = '## Evolução do Paciente\n\n';
    
    const byType = insights.reduce((acc, insight) => {
      if (!acc[insight.insight_type]) acc[insight.insight_type] = [];
      acc[insight.insight_type].push(insight);
      return acc;
    }, {} as Record<string, MedicalInsight[]>);

    if (byType.pain_reduction) {
      report += '### Controle de Dor\n';
      byType.pain_reduction.forEach(i => report += `- ${i.insight_text}\n`);
      report += '\n';
    }

    if (byType.range_improvement) {
      report += '### Amplitude de Movimento\n';
      byType.range_improvement.forEach(i => report += `- ${i.insight_text}\n`);
      report += '\n';
    }

    if (byType.strength_gain) {
      report += '### Força Muscular\n';
      byType.strength_gain.forEach(i => report += `- ${i.insight_text}\n`);
      report += '\n';
    }

    if (byType.functional_milestone) {
      report += '### Funcionalidade\n';
      byType.functional_milestone.forEach(i => report += `- ${i.insight_text}\n`);
      report += '\n';
    }

    return report;
  }
}
