import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include lastAutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface PatientReportData {
  patientName: string;
  patientId: string;
  dateOfBirth: string;
  reportDate: string;
  therapistName: string;
  diagnosis?: string;
  treatmentGoals?: string[];
  observations?: string;
  exercisePlan?: {
    name: string;
    sets: number;
    reps: string;
    frequency: string;
  }[];
  nextAppointment?: string;
}

export interface ProgressReportData extends PatientReportData {
  initialAssessment: {
    date: string;
    painLevel: number;
    mobilityScore: number;
    functionalScore: number;
  };
  currentAssessment: {
    date: string;
    painLevel: number;
    mobilityScore: number;
    functionalScore: number;
  };
  improvements: string[];
  challenges: string[];
}

export interface MedicalReportData extends ProgressReportData {
  surgeries?: { name: string; date: string; timeSince: string }[];
  pathologies?: { name: string; status: string }[];
  medications?: string;
  painEvolution?: { date: string; level: number; regions: number }[];
  testResults?: { test: string; initial: string; current: string; progress: string }[];
}

export interface PatientFriendlyReportData {
  patientName: string;
  reportDate: string;
  therapistName: string;
  startDate: string;
  totalSessions: number;
  achievements: string[];
  currentGoals: string[];
  nextSteps: string[];
  painReduction: number;
  motivationalMessage: string;
}

export interface InternalReportData extends MedicalReportData {
  sessionCount: number;
  attendanceRate: number;
  complianceRate: number;
  riskFactors?: string[];
  recommendations?: string[];
}

export class ReportGeneratorService {
  private static readonly HEADER_COLOR = [41, 128, 185] as const;
  private static readonly SECONDARY_COLOR = [52, 152, 219] as const;

  static generateConsultationReport(data: PatientReportData): void {
    const doc = new jsPDF();
    
    // Header
    this.addHeader(doc, 'Relatório de Consulta');
    
    // Patient Info
    this.addPatientInfo(doc, data);
    
    // Diagnosis
    if (data.diagnosis) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnóstico:', 20, 80);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(data.diagnosis, 20, 88, { maxWidth: 170 });
    }
    
    // Treatment Goals
    if (data.treatmentGoals && data.treatmentGoals.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Objetivos do Tratamento:', 20, 108);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      let yPos = 116;
      data.treatmentGoals.forEach((goal, index) => {
        doc.text(`${index + 1}. ${goal}`, 25, yPos);
        yPos += 7;
      });
    }
    
    // Exercise Plan
    if (data.exercisePlan && data.exercisePlan.length > 0) {
      const startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 140;
      
      autoTable(doc, {
        startY,
        head: [['Exercício', 'Séries', 'Repetições', 'Frequência']],
        body: data.exercisePlan.map(ex => [
          ex.name,
          ex.sets.toString(),
          ex.reps.toString(),
          ex.frequency
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 85, 185] as [number, number, number] },
      });
    }
    
    // Observations
    if (data.observations) {
      const yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 180;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 20, yPos);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(data.observations, 20, yPos + 8, { maxWidth: 170 });
    }
    
    // Next Appointment
    if (data.nextAppointment) {
      const yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 220;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Próxima Consulta: ${data.nextAppointment}`, 20, yPos);
    }
    
    // Footer
    this.addFooter(doc, data.therapistName);
    
    // Download
    doc.save(`relatorio-consulta-${data.patientName}-${data.reportDate}.pdf`);
  }

  static generateProgressReport(data: ProgressReportData): void {
    const doc = new jsPDF();
    
    // Header
    this.addHeader(doc, 'Relatório de Progresso');
    
    // Patient Info
    this.addPatientInfo(doc, data);
    
    // Metrics Table
    autoTable(doc, {
      startY: 80,
      head: [['Métrica', 'Inicial', 'Atual', 'Progresso']],
      body: [
        [
          'Nível de Dor (0-10)',
          data.initialAssessment.painLevel.toString(),
          data.currentAssessment.painLevel.toString(),
          this.calculateProgress(data.initialAssessment.painLevel, data.currentAssessment.painLevel, true)
        ],
        [
          'Mobilidade (%)',
          data.initialAssessment.mobilityScore.toString(),
          data.currentAssessment.mobilityScore.toString(),
          this.calculateProgress(data.initialAssessment.mobilityScore, data.currentAssessment.mobilityScore)
        ],
        [
          'Funcionalidade (%)',
          data.initialAssessment.functionalScore.toString(),
          data.currentAssessment.functionalScore.toString(),
          this.calculateProgress(data.initialAssessment.functionalScore, data.currentAssessment.functionalScore)
        ]
      ],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] as [number, number, number] }
    });
    
    // Improvements
    let yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 150;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Melhorias:', 20, yPos);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    data.improvements.forEach(imp => {
      doc.text(`✓ ${imp}`, 25, yPos);
      yPos += 7;
    });
    
    // Challenges
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Desafios:', 20, yPos);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    data.challenges.forEach(ch => {
      doc.text(`• ${ch}`, 25, yPos);
      yPos += 7;
    });
    
    // Observations
    if (data.observations) {
      yPos += 5;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 20, yPos);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(data.observations, 20, yPos + 8, { maxWidth: 170 });
    }
    
    // Footer
    this.addFooter(doc, data.therapistName);
    
    // Download
    doc.save(`relatorio-progresso-${data.patientName}-${data.reportDate}.pdf`);
  }

  private static addHeader(doc: jsPDF, title: string): void {
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Activity Fisioterapia', 20, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 20, 23);
    
    doc.setTextColor(0, 0, 0);
  }

  private static addPatientInfo(doc: jsPDF, data: PatientReportData): void {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Paciente:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(data.patientName, 60, 45);
    
    doc.setFont('helvetica', 'bold');
    doc.text('ID:', 20, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(data.patientId, 60, 52);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Data:', 20, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(data.reportDate, 60, 59);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Fisioterapeuta:', 20, 66);
    doc.setFont('helvetica', 'normal');
    doc.text(data.therapistName, 70, 66);
  }

  private static addFooter(doc: jsPDF, therapistName: string): void {
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, pageHeight - 25, 190, pageHeight - 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Activity Fisioterapia | www.activityfisio.com.br', 105, pageHeight - 18, { align: 'center' });
    doc.text(`Responsável: ${therapistName}`, 105, pageHeight - 13, { align: 'center' });
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, pageHeight - 8, { align: 'center' });
  }

  private static calculateProgress(initial: number, current: number, reverse = false): string {
    const diff = reverse ? initial - current : current - initial;
    const percent = ((diff / initial) * 100).toFixed(1);
    
    if (diff > 0) {
      return `+${percent}% ↑`;
    } else if (diff < 0) {
      return `${percent}% ↓`;
    }
    return '0%';
  }

  // Relatório Técnico para Médico
  static generateMedicalReport(data: MedicalReportData): void {
    const doc = new jsPDF();
    
    // Header
    this.addHeader(doc, 'Relatório Médico - Evolução Fisioterapêutica');
    
    // Patient Info
    this.addPatientInfo(doc, data);
    
    let yPos = 80;

    // Diagnóstico e Patologias
    if (data.diagnosis || (data.pathologies && data.pathologies.length > 0)) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnóstico e Comorbidades:', 20, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      if (data.diagnosis) {
        doc.text(`Diagnóstico Principal: ${data.diagnosis}`, 25, yPos);
        yPos += 7;
      }
      
      if (data.pathologies) {
        data.pathologies.forEach(p => {
          doc.text(`• ${p.name} (${p.status})`, 25, yPos);
          yPos += 6;
        });
        yPos += 5;
      }
    }

    // Histórico Cirúrgico
    if (data.surgeries && data.surgeries.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico Cirúrgico:', 20, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Cirurgia', 'Data', 'Tempo Decorrido']],
        body: data.surgeries.map(s => [s.name, s.date, s.timeSince]),
        theme: 'striped',
        headStyles: { fillColor: [...this.HEADER_COLOR] as [number, number, number] }
      });
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 40;
    }

    // Medicações
    if (data.medications) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Medicações em Uso:', 20, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(data.medications, 25, yPos, { maxWidth: 160 });
      yPos += 15;
    }

    // Evolução Clínica - Métricas
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Evolução Clínica:', 20, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Métrica', 'Inicial', 'Atual', 'Evolução']],
      body: [
        [
          'Dor (EVA 0-10)',
          data.initialAssessment.painLevel.toString(),
          data.currentAssessment.painLevel.toString(),
          this.calculateProgress(data.initialAssessment.painLevel, data.currentAssessment.painLevel, true)
        ],
        [
          'Mobilidade (%)',
          data.initialAssessment.mobilityScore.toString(),
          data.currentAssessment.mobilityScore.toString(),
          this.calculateProgress(data.initialAssessment.mobilityScore, data.currentAssessment.mobilityScore)
        ],
        [
          'Funcionalidade (%)',
          data.initialAssessment.functionalScore.toString(),
          data.currentAssessment.functionalScore.toString(),
          this.calculateProgress(data.initialAssessment.functionalScore, data.currentAssessment.functionalScore)
        ]
      ],
      theme: 'striped',
      headStyles: { fillColor: [...this.HEADER_COLOR] as [number, number, number] }
    });
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;

    // Testes Específicos
    if (data.testResults && data.testResults.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Teste', 'Inicial', 'Atual', 'Progresso']],
        body: data.testResults.map(t => [t.test, t.initial, t.current, t.progress]),
        theme: 'striped',
        headStyles: { fillColor: [...this.SECONDARY_COLOR] as [number, number, number] }
      });
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 40;
    }

    // Nova página se necessário
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Evolução da Dor
    if (data.painEvolution && data.painEvolution.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolução do Quadro Álgico:', 20, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Nível de Dor', 'Regiões Afetadas']],
        body: data.painEvolution.map(p => [
          p.date,
          `${p.level}/10`,
          p.regions.toString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [...this.SECONDARY_COLOR] as [number, number, number] }
      });
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 40;
    }

    // Melhorias e Desafios
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Evolução Funcional:', 20, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    if (data.improvements.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Melhorias Observadas:', 25, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      data.improvements.forEach(imp => {
        doc.text(`✓ ${imp}`, 30, yPos);
        yPos += 6;
      });
      yPos += 5;
    }

    if (data.challenges.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Aspectos que Necessitam Atenção:', 25, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      data.challenges.forEach(ch => {
        doc.text(`• ${ch}`, 30, yPos);
        yPos += 6;
      });
      yPos += 5;
    }

    // Observações Técnicas
    if (data.observations) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Observações Técnicas:', 20, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(data.observations, 25, yPos, { maxWidth: 160 });
    }

    // Footer
    this.addFooter(doc, data.therapistName);
    
    doc.save(`relatorio-medico-${data.patientName}-${data.reportDate}.pdf`);
  }

  // Relatório Simplificado para Paciente
  static generatePatientReport(data: PatientFriendlyReportData): void {
    const doc = new jsPDF();
    
    // Header mais amigável
    doc.setFillColor(52, 152, 219);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Seu Progresso na Fisioterapia', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Olá, ${data.patientName}!`, 105, 25, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    let yPos = 50;

    // Informações Gerais
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Data do Relatório:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.reportDate, 70, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Início do Tratamento:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.startDate, 70, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Total de Sessões:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.totalSessions.toString(), 70, yPos);
    yPos += 15;

    // Conquistas
    doc.setFillColor(46, 204, 113);
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('🎉 Suas Conquistas:', 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    data.achievements.forEach(ach => {
      doc.text(`✓ ${ach}`, 25, yPos);
      yPos += 7;
    });
    yPos += 10;

    // Redução de Dor
    if (data.painReduction > 0) {
      doc.setFillColor(241, 196, 15);
      doc.rect(15, yPos - 5, 180, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('💪 Redução da Dor:', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 204, 113);
      doc.text(`-${data.painReduction.toFixed(0)}%`, 105, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 15;
    }

    // Objetivos Atuais
    doc.setFillColor(155, 89, 182);
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('🎯 Seus Objetivos Atuais:', 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    data.currentGoals.forEach(goal => {
      doc.text(`• ${goal}`, 25, yPos);
      yPos += 7;
    });
    yPos += 10;

    // Próximos Passos
    doc.setFillColor(52, 152, 219);
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📋 Próximos Passos:', 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    data.nextSteps.forEach(step => {
      doc.text(`→ ${step}`, 25, yPos);
      yPos += 7;
    });
    yPos += 15;

    // Mensagem Motivacional
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(52, 152, 219);
    const lines = doc.splitTextToSize(data.motivationalMessage, 170);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 7;

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, pageHeight - 25, 190, pageHeight - 25);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Activity Fisioterapia', 105, pageHeight - 18, { align: 'center' });
    doc.text(`Fisioterapeuta: ${data.therapistName}`, 105, pageHeight - 13, { align: 'center' });
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, pageHeight - 8, { align: 'center' });

    doc.save(`meu-progresso-${data.reportDate}.pdf`);
  }

  // Relatório Interno para Fisioterapeutas
  static generateInternalReport(data: InternalReportData): void {
    const doc = new jsPDF();
    
    this.addHeader(doc, 'Relatório Interno de Evolução');
    this.addPatientInfo(doc, data);

    let yPos = 80;

    // Métricas de Adesão
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Métricas de Adesão ao Tratamento:', 20, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Sessões', data.sessionCount.toString()],
        ['Taxa de Comparecimento', `${data.attendanceRate.toFixed(1)}%`],
        ['Taxa de Adesão aos Exercícios', `${data.complianceRate.toFixed(1)}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [...this.HEADER_COLOR] as [number, number, number] }
    });
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 40;

    // Evolução Clínica
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Evolução Clínica:', 20, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Parâmetro', 'Inicial', 'Atual', 'Variação']],
      body: [
        [
          'Dor',
          data.initialAssessment.painLevel.toString(),
          data.currentAssessment.painLevel.toString(),
          this.calculateProgress(data.initialAssessment.painLevel, data.currentAssessment.painLevel, true)
        ],
        [
          'Mobilidade',
          data.initialAssessment.mobilityScore.toString(),
          data.currentAssessment.mobilityScore.toString(),
          this.calculateProgress(data.initialAssessment.mobilityScore, data.currentAssessment.mobilityScore)
        ],
        [
          'Funcionalidade',
          data.initialAssessment.functionalScore.toString(),
          data.currentAssessment.functionalScore.toString(),
          this.calculateProgress(data.initialAssessment.functionalScore, data.currentAssessment.functionalScore)
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [...this.HEADER_COLOR] as [number, number, number] }
    });
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;

    // Fatores de Risco
    if (data.riskFactors && data.riskFactors.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text('⚠️ Fatores de Risco:', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      data.riskFactors.forEach(risk => {
        doc.text(`• ${risk}`, 25, yPos);
        yPos += 6;
      });
      yPos += 10;
    }

    // Recomendações
    if (data.recommendations && data.recommendations.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 167, 69);
      doc.text('💡 Recomendações:', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      data.recommendations.forEach(rec => {
        doc.text(`→ ${rec}`, 25, yPos);
        yPos += 6;
      });
    }

    this.addFooter(doc, data.therapistName);
    doc.save(`relatorio-interno-${data.patientName}-${data.reportDate}.pdf`);
  }
}
