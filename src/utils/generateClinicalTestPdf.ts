
// Type extension for jsPDF with getNumberOfPages method

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface jsPDFWithPageCount extends jsPDF {
  getNumberOfPages(): number;
}

interface ClinicalTest {
    id: string;
    name: string;
    name_en?: string;
    category: string;
    target_joint: string;
    purpose: string;
    execution: string;
    positive_sign?: string;
    reference?: string;
    sensitivity_specificity?: string;
    regularity_sessions?: number | null;
}

export const generateClinicalTestPdf = (test: ClinicalTest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(20, 100, 100); // Teal color
    doc.text('FisioFlow - Teste Clínico', margin, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Base de Dados de Testes Clínicos Baseados em Evidências', margin, yPos);

    // Date
    doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), pageWidth - margin - 50, 20);

    // Divider
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Test Title
    yPos += 15;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(test.name, margin, yPos);

    if (test.name_en) {
        yPos += 7;
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.text(test.name_en, margin, yPos);
        doc.setFont('helvetica', 'normal');
    }

    // Info Table
    yPos += 10;
    autoTable(doc, {
        startY: yPos,
        body: [
            ['Categoria', test.category],
            ['Articulação Atvo', test.target_joint],
            ['Regularidade', test.regularity_sessions ? `A cada ${test.regularity_sessions} sessões` : 'Sob demanda']
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold', textColor: [100, 100, 100] },
            1: { cellWidth: 'auto' }
        },
        margin: { left: margin }
    });

    yPos = (doc.lastAutoTable?.finalY || yPos) + 15;

    // Purpose
    doc.setFontSize(14);
    doc.setTextColor(20, 100, 100);
    doc.text('Objetivo', margin, yPos);
    yPos += 7;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    const purposeLines = doc.splitTextToSize(test.purpose, pageWidth - margin * 2);
    doc.text(purposeLines, margin, yPos);
    yPos += (purposeLines.length * 6) + 10;

    // Execution
    doc.setFontSize(14);
    doc.setTextColor(20, 100, 100);
    doc.text('Execução', margin, yPos);
    yPos += 7;
    doc.setFontSize(11);
    const executionLines = doc.splitTextToSize(test.execution, pageWidth - margin * 2);
    doc.text(executionLines, margin, yPos);
    yPos += (executionLines.length * 6) + 15;

    // Positive Sign
    if (test.positive_sign) {
        doc.setDrawColor(230, 230, 230);
        doc.setFillColor(245, 250, 250);
        doc.rect(margin - 5, yPos - 10, pageWidth - margin * 2 + 10, 30, 'F');

        doc.setFontSize(14);
        doc.setTextColor(20, 80, 150); // Blueish
        doc.text('Interpretação Positiva', margin, yPos);
        yPos += 7;
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        const signLines = doc.splitTextToSize(test.positive_sign, pageWidth - margin * 2);
        doc.text(signLines, margin, yPos);
        yPos += (signLines.length * 6) + 15;
    }

    // Evidence / Reference
    if (test.reference || test.sensitivity_specificity) {
        if (yPos > 240) {
            doc.addPage();
            yPos = 25;
        }

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Evidência Científica', margin, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, margin + 40, yPos);
        yPos += 10;

        if (test.sensitivity_specificity) {
            doc.setFontSize(10);
            doc.text(`Sensibilidade/Especificidade: ${test.sensitivity_specificity}`, margin, yPos);
            yPos += 7;
        }

        if (test.reference) {
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            const refLines = doc.splitTextToSize(`Referência: ${test.reference}`, pageWidth - margin * 2);
            doc.text(refLines, margin, yPos);
        }
    }

    // Footer
    const pageCount = (doc as jsPDFWithPageCount).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(`FisioFlow - Gerenciamento Inteligente para Fisioterapia | Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`teste-clinico-${test.id.substring(0, 8)}.pdf`);
};
