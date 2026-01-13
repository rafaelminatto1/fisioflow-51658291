import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PatientData {
  name: string;
  phone?: string;
  email?: string;
  birthDate: string;
}

interface SessionData {
  date: string;
  painLevel: number;
  mobilityScore: number;
  observations: string;
  therapist: string;
  duration: number;
}

interface EvolutionMetrics {
  currentPainLevel: number;
  initialPainLevel: number;
  totalSessions: number;
  averageImprovement: number;
}

export const generateEvolutionPDF = (
  patient: PatientData,
  sessions: SessionData[],
  metrics: EvolutionMetrics
) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Configurações de estilo
  const primaryColor: [number, number, number] = [91, 79, 232]; // #5B4FE8

  // Header com logo e título
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FisioFlow', 20, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Evolução do Paciente', 20, 28);

  // Data de geração
  doc.setFontSize(9);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.text(`Gerado em: ${today}`, 150, 28);

  yPosition = 45;

  // Seção: Dados do Paciente
  doc.setTextColor(...textColor);
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPosition, 180, 8, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('📋 Dados do Paciente', 20, yPosition + 5);
  
  yPosition += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const patientName = patient.name;
  doc.text(`Nome: ${patientName}`, 20, yPosition);
  yPosition += 6;
  
  if (patient.phone) {
    doc.text(`Telefone: ${patient.phone}`, 20, yPosition);
    yPosition += 6;
  }
  
  if (patient.email) {
    doc.text(`E-mail: ${patient.email}`, 20, yPosition);
    yPosition += 6;
  }
  
  const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
  doc.text(`Idade: ${age} anos`, 20, yPosition);
  
  yPosition += 12;

  // Seção: Resumo da Evolução
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPosition, 180, 8, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('📊 Resumo da Evolução', 20, yPosition + 5);
  
  yPosition += 15;

  // Cards de métricas
  const cardWidth = 85;
  const cardHeight = 25;
  const cardSpacing = 10;

  // Card 1: Total de Sessões
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, yPosition, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total de Sessões', 25, yPosition + 8);
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(metrics.totalSessions.toString(), 25, yPosition + 18);

  // Card 2: Dor Inicial vs Atual
  doc.setTextColor(...textColor);
  doc.roundedRect(20 + cardWidth + cardSpacing, yPosition, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Nível de Dor', 25 + cardWidth + cardSpacing, yPosition + 8);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const painReduction = metrics.initialPainLevel - metrics.currentPainLevel;
  const painColor: [number, number, number] = painReduction > 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(...painColor);
  doc.text(
    `${metrics.initialPainLevel.toFixed(1)} → ${metrics.currentPainLevel.toFixed(1)}`,
    25 + cardWidth + cardSpacing,
    yPosition + 18
  );

  yPosition += cardHeight + 15;

  // Card 3: Melhora Média
  doc.setTextColor(...textColor);
  doc.roundedRect(20, yPosition, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Melhora Média por Sessão', 25, yPosition + 8);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`${metrics.averageImprovement.toFixed(1)}%`, 25, yPosition + 18);

  yPosition += cardHeight + 15;

  // Seção: Histórico de Sessões
  doc.setTextColor(...textColor);
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPosition, 180, 8, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('📅 Histórico de Sessões', 20, yPosition + 5);
  
  yPosition += 12;

  // Tabela de sessões
  const tableData = sessions.map((session, index) => [
    `#${sessions.length - index}`,
    format(new Date(session.date), 'dd/MM/yyyy', { locale: ptBR }),
    session.painLevel.toFixed(1),
    `${session.mobilityScore}%`,
    session.therapist,
    session.observations.substring(0, 50) + (session.observations.length > 50 ? '...' : '')
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Data', 'Dor', 'Mobilidade', 'Terapeuta', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 8,
      textColor: textColor
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 70 }
    },
    margin: { left: 15, right: 15 }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      'FisioFlow - Sistema de Gestão de Fisioterapia',
      20,
      doc.internal.pageSize.height - 10
    );
  }

  return doc;
};
