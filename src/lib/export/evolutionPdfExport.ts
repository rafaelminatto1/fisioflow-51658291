import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  prescribedSessions?: number;
  averageImprovement: number;
  measurementEvolution?: Array<{ name: string; initial: { value: number | string; unit: string; date: string }; current: { value: number | string; unit: string; date: string }; improvement: number | string }>;
}

export const generateEvolutionPDF = (
  patient: PatientData,
  sessions: SessionData[],
  metrics: EvolutionMetrics
) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [0, 121, 107]; // Teal 700
  const secondaryColor: [number, number, number] = [240, 253, 250]; // Teal 50
  const textColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const lightTextColor: [number, number, number] = [100, 116, 139]; // Slate 500

  const addHeader = () => {
    // Top Bar with Gradient-like effect
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('FisioFlow', 20, 22);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    doc.text(`Relatório de Evolução Clínica • ${today}`, 20, 30);

    // Aesthetic accent
    doc.setFillColor(255, 255, 255, 0.2);
    doc.circle(180, 20, 30, 'F');
  };

  addHeader();

  let yPos = 55;

  // --- Patient Info Block ---
  doc.setTextColor(...textColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.name, 20, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...lightTextColor);
  const age = patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 'N/A';
  doc.text(`Idade: ${age} anos | Tel: ${patient.phone || 'N/A'} | Email: ${patient.email || 'N/A'}`, 20, yPos + 6);

  yPos += 20;

  // --- Summary Cards ---
  const drawCard = (x: number, y: number, w: number, h: number, title: string, value: string, _icon: string) => {
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(x, y, w, h, 3, 3, 'FD');

    doc.setTextColor(...lightTextColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), x + 5, y + 8);

    doc.setTextColor(...primaryColor);
    doc.setFontSize(18);
    doc.text(value, x + 5, y + 20);
  };

  const sessionValue = metrics.prescribedSessions && metrics.prescribedSessions > 0
    ? `${metrics.totalSessions} / ${metrics.prescribedSessions}`
    : metrics.totalSessions.toString();

  drawCard(20, yPos, 55, 28, 'Total Sessões', sessionValue, '');
  drawCard(80, yPos, 55, 28, 'Nível de Dor', `${metrics.initialPainLevel} → ${metrics.currentPainLevel}`, '');
  drawCard(140, yPos, 50, 28, 'Melhora Média', `${metrics.averageImprovement.toFixed(1)}%`, '');

  yPos += 45;

  // --- Measurements Evolution Table ---
  if (metrics.measurementEvolution && metrics.measurementEvolution.length > 0) {
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📈 Evolução das Medições (Antes vs Depois)', 20, yPos);
    yPos += 8;

    const measTableData = metrics.measurementEvolution.map((m: { name: string; initial: { value: number | string; unit: string }; current: { value: number | string; unit: string }; improvement: number | string }) => {
      const diff = m.improvement;
      const diffColor = parseFloat(diff) > 0 ? '↑' : parseFloat(diff) < 0 ? '↓' : '-';

      return [
        m.name,
        `${m.initial.value} ${m.initial.unit || ''}`,
        `${m.current.value} ${m.current.unit || ''}`,
        `${diff}% ${diffColor}`
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Parâmetro', 'Admissão', 'Atual', 'Evolução']],
      body: measTableData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // --- Sessions History Table ---
  if (yPos > 240) { doc.addPage(); addHeader(); yPos = 55; }

  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('📅 Histórico de Sessões', 20, yPos);
  yPos += 8;

  const sessionTableData = sessions.map((s, i) => [
    `#${sessions.length - i}`,
    format(new Date(s.date), 'dd/MM/yyyy'),
    s.painLevel.toString(),
    `${s.mobilityScore}%`,
    s.observations.length > 80 ? s.observations.substring(0, 80) + '...' : s.observations
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Nº', 'Data', 'Dor', 'Mobilidade', 'Conduta/Observações']],
    body: sessionTableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 10 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 15 },
      3: { cellWidth: 25 },
      4: { cellWidth: 'auto' }
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // --- Scientific References ---
  if (yPos > 240) { doc.addPage(); addHeader(); yPos = 55; }

  doc.setFillColor(...secondaryColor);
  doc.roundedRect(20, yPos, 170, 45, 3, 3, 'F');

  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('📚 Referências e Escalas Utilizadas:', 25, yPos + 10);

  doc.setTextColor(...lightTextColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const refs = [
    '• EVA: Escala Visual Analógica de Dor (Huskisson, 1974).',
    '• Goniometria: Measurement of Joint Motion (Norkin & White, 2016).',
    '• Testes Funcionais: Baseados em protocolos da American Physical Therapy Association (APTA).',
    '• Sinais Vitais: Parâmetros da Sociedade Brasileira de Cardiologia (SBC).',
  ];
  refs.forEach((ref, i) => {
    doc.text(ref, 25, yPos + 18 + (i * 5));
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`FisioFlow - Gerenciamento de Fisioterapia de Alta Performance | Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  }

  return doc;
};
