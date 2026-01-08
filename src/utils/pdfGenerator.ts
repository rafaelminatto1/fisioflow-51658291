import { jsPDF } from 'jspdf';
import { Prescription } from '@/hooks/usePrescriptions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const generatePrescriptionPDF = (prescription: Prescription) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Header
    // Logo placeholder text (replace with image if available)
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('FisioFlow', margin, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Clínica de Fisioterapia & Reabilitação', margin, yPos);

    // Date
    doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), pageWidth - margin - 50, 20);

    // Line
    yPos += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Patient Info
    yPos += 20;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Prescrição de Exercícios', margin, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Paciente: ${prescription.patient?.name || 'Não informado'}`, margin, yPos);

    yPos += 6;
    doc.text(`Título: ${prescription.title}`, margin, yPos);

    if (prescription.valid_until) {
        yPos += 6;
        doc.text(`Válido até: ${format(new Date(prescription.valid_until), 'dd/MM/yyyy')}`, margin, yPos);
    }

    // Exercises
    yPos += 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Exercícios', margin, yPos);

    yPos += 10;
    prescription.exercises.forEach((exercise, index) => {
        // Check page break
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${exercise.name}`, margin, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);

        let details = `${exercise.sets} séries x ${exercise.repetitions} repetições`;
        if (exercise.frequency) details += ` • Freq: ${exercise.frequency}`;

        doc.text(details, margin + 5, yPos);

        if (exercise.description) {
            yPos += 6;
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            const splitDesc = doc.splitTextToSize(exercise.description, pageWidth - margin * 2 - 5);
            doc.text(splitDesc, margin + 5, yPos);
            yPos += (splitDesc.length * 5);
        }

        if (exercise.observations) {
            yPos += 6;
            doc.setTextColor(180, 80, 0); // Orange/Brownish
            doc.text(`Obs: ${exercise.observations}`, margin + 5, yPos);
            doc.setTextColor(60, 60, 60); // Reset
        }

        yPos += 10;
    });

    // Notes
    if (prescription.notes) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);

        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações Gerais:', margin, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const splitNotes = doc.splitTextToSize(prescription.notes, pageWidth - margin * 2);
        doc.text(splitNotes, margin, yPos);
    }

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const link = `${window.location.origin}/prescription/${prescription.qr_code}`;
    doc.text(`Acesse online: ${link}`, margin, footerY);
    doc.text('Gerado por FisioFlow', pageWidth - margin - 30, footerY);

    doc.save(`prescricao-${prescription.patient?.name?.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyyMMdd')}.pdf`);
};
