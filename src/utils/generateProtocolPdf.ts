import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { Organization } from '@/hooks/useOrganizations';

export const generateProtocolPdf = (protocol: ExerciseProtocol, organization?: Organization | null) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Header / Branding
    if (organization?.name) {
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(organization.name, margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Protocolo de Tratamento Fisioterapêutico', margin, yPos);
    } else {
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('FisioFlow', margin, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Protocolo de Tratamento', margin, yPos);
    }

    // Date
    doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), pageWidth - margin - 50, 20);

    // Divider
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Protocol Info
    yPos += 15;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(protocol.name, margin, yPos);

    yPos += 8;
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Condição: ${protocol.condition_name}`, margin, yPos);

    if (protocol.weeks_total) {
        yPos += 6;
        doc.text(`Duração Estimada: ${protocol.weeks_total} semanas`, margin, yPos);
    }

    const typeLabel = protocol.protocol_type === 'pos_operatorio' ? 'Pós-Operatório' : 'Patologia';
    yPos += 6;
    doc.text(`Tipo: ${typeLabel}`, margin, yPos);


    // Macros Info
    yPos += 15;

    // Milestones Table
    const milestones = Array.isArray(protocol.milestones) ? protocol.milestones : [];
    if (milestones.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Marcos de Progressão', margin, yPos);

        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Semana', 'Descrição']],
            body: milestones.map((m) => [`Semana ${m.week}`, m.description] as [string, string]),
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] }, // Green-500
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 30, fontStyle: 'bold' },
                1: { cellWidth: 'auto' },
            },
            margin: { left: margin, right: margin }
        });

        yPos = (doc.lastAutoTable?.finalY || yPos) + 15;
    }

    // Restrictions Table
    const restrictions = Array.isArray(protocol.restrictions) ? protocol.restrictions : [];
    if (restrictions.length > 0) {
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Restrições', margin, yPos);

        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Período', 'Restrição']],
            body: restrictions.map((r) => [
                `Semana ${r.week_start}${r.week_end ? ` - ${r.week_end}` : ''}`,
                r.description
            ]),
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] }, // Amber-500
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 40, fontStyle: 'bold' },
                1: { cellWidth: 'auto' },
            },
            margin: { left: margin, right: margin }
        });

        yPos = (doc.lastAutoTable?.finalY || yPos) + 15;
    }

    // Footer
    const pageCount = (doc as { getNumberOfPages?: () => number }).getNumberOfPages?.() || 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('documento gerado por FisioFlow', margin, footerY);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, footerY);
    }

    doc.save(`protocolo-${protocol.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};
