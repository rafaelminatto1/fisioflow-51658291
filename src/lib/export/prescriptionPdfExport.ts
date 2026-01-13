import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';

interface PrescriptionExercise {
  id: string;
  name: string;
  description?: string;
  sets: number;
  repetitions: number;
  frequency: string;
  observations?: string;
}

interface PrescriptionData {
  id: string;
  qr_code: string;
  title: string;
  patient_name: string;
  therapist_name: string;
  created_at: string;
  valid_until: string;
  exercises: PrescriptionExercise[];
  notes?: string;
}

export const generatePrescriptionPDF = async (prescription: PrescriptionData): Promise<Blob> => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Cores
  const primaryColor: [number, number, number] = [91, 79, 232]; // #5B4FE8
  const textColor: [number, number, number] = [30, 30, 30];
  const successColor: [number, number, number] = [16, 185, 129];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('FisioFlow', 20, 18);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Prescrição de Reabilitação', 20, 28);

  doc.setFontSize(9);
  const today = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.text(`Emitido em: ${today}`, 20, 36);

  yPosition = 50;

  // Dados do paciente e fisioterapeuta
  doc.setTextColor(...textColor);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(15, yPosition, 180, 35, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Paciente:', 20, yPosition + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(prescription.patient_name, 50, yPosition + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Fisioterapeuta:', 20, yPosition + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(prescription.therapist_name || 'Não informado', 60, yPosition + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Validade:', 120, yPosition + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    format(new Date(prescription.valid_until), 'dd/MM/yyyy', { locale: ptBR }),
    150,
    yPosition + 10
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Data:', 120, yPosition + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(
    format(new Date(prescription.created_at), 'dd/MM/yyyy', { locale: ptBR }),
    145,
    yPosition + 20
  );

  yPosition += 45;

  // Título da seção
  doc.setFillColor(...primaryColor);
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EXERCÍCIOS PRESCRITOS', 20, yPosition + 6);

  yPosition += 15;

  // Tabela de exercícios
  const exerciseRows = prescription.exercises.map((ex, index) => [
    (index + 1).toString(),
    ex.name,
    `${ex.sets} séries`,
    `${ex.repetitions} reps`,
    ex.frequency,
    ex.observations || '-',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Exercício', 'Séries', 'Repetições', 'Frequência', 'Observações']],
    body: exerciseRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 50 },
    },
    margin: { left: 15, right: 15 },
  });

  // @ts-expect-error - autoTable adds this property
  yPosition = doc.lastAutoTable.finalY + 10;

  // Observações gerais
  if (prescription.notes) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setTextColor(...textColor);
    doc.setFillColor(255, 251, 235); // Amarelo claro
    doc.roundedRect(15, yPosition, 180, 25, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('📝 Observações:', 20, yPosition + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(prescription.notes, 170);
    doc.text(splitNotes, 20, yPosition + 15);

    yPosition += 30;
  }

  // QR Code
  const publicUrl = `${window.location.origin}/prescricoes/publica/${prescription.qr_code}`;
  
  try {
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 100,
      margin: 1,
      color: {
        dark: '#1a1a1a',
        light: '#ffffff',
      },
    });

    // Posicionar QR Code no rodapé
    const qrY = 250;
    
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(15, qrY, 180, 40, 3, 3, 'F');

    doc.addImage(qrDataUrl, 'PNG', 20, qrY + 3, 34, 34);

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Acesse sua prescrição online', 60, qrY + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Escaneie o QR Code para:', 60, qrY + 20);
    doc.text('• Ver vídeos demonstrativos', 60, qrY + 26);
    doc.text('• Marcar exercícios concluídos', 60, qrY + 32);

    doc.setTextColor(...successColor);
    doc.setFontSize(7);
    doc.text(publicUrl, 120, qrY + 35);

  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
  }

  // Retornar como Blob
  return doc.output('blob');
};

export const downloadPrescriptionPDF = async (prescription: PrescriptionData) => {
  const blob = await generatePrescriptionPDF(prescription);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `prescricao-${prescription.patient_name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
