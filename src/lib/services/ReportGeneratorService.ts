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
        headStyles: { fillColor: [41, 85, 185] as any },
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
      headStyles: { fillColor: [41, 128, 185] as any }
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
}
