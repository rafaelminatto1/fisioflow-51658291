import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { loadJsPdfRuntime } from "@/lib/export/jspdfRuntime";
import { GaitMetrics, JumpMetrics } from "../types/biomechanics";

// ===== Types =====

interface ReportData {
    patientName: string;
    date: Date;
    type: 'Gait' | 'Jump' | 'Posture' | 'Functional';
    metrics?: GaitMetrics | JumpMetrics | any;
    snapshots?: string[]; // Base64 images
    asymmetry?: string | null;
}

export interface Assessment {
    date: Date;
    type: 'Gait' | 'Jump' | 'Posture' | 'Functional';
    metrics?: Record<string, number | string | null>;
    asymmetry?: string | null;
    snapshots?: string[];
}

interface ComparativeReportData {
    patientName: string;
    assessments: Assessment[];
}

// ===== Single Assessment Report =====

export const generateBiomechanicsReport = async (data: ReportData) => {
    const { jsPDF, autoTable } = await loadJsPdfRuntime();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Premium Look
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("FISIOFLOW PRO LAB", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`LAUDO DE BIOMECÂNICA: ${data.type.toUpperCase()}`, 14, 30);
    doc.text(format(data.date, "dd/MM/yyyy HH:mm"), pageWidth - 50, 20);

    // Patient Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text(`Paciente: ${data.patientName}`, 14, 50);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 55, pageWidth - 14, 55);

    let currentY = 65;

    // Metrics Table
    if (data.metrics) {
        doc.setFontSize(14);
        doc.text("Métricas de Análise", 14, currentY);
        currentY += 10;

        const tableData = Object.entries(data.metrics)
            .filter(([_, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [
                key.replace(/([A-Z])/g, ' $1').toUpperCase(), 
                String(value)
            ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Parâmetro', 'Valor']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // High Risk / Asymmetry Alert (Phast Style)
    if (data.asymmetry) {
        const asymmetryVal = parseFloat(data.asymmetry);
        const isHighRisk = asymmetryVal > 15;
        
        doc.setFillColor(isHighRisk ? 254 : 240, isHighRisk ? 226 : 253, isHighRisk ? 226 : 244);
        doc.rect(14, currentY, pageWidth - 28, 20, 'F');
        
        doc.setTextColor(isHighRisk ? 185 : 21, isHighRisk ? 28 : 128, isHighRisk ? 28 : 61);
        doc.setFontSize(12);
        doc.text(`ASSIMETRIA CALCULADA: ${data.asymmetry}%`, 20, currentY + 12);
        
        doc.setFontSize(8);
        doc.text(isHighRisk ? "ALERTA: Risco de lesão elevado identificado." : "STATUS: Simetria dentro dos padrões clínicos.", 20, currentY + 17);
        
        currentY += 30;
    }

    // Snapshots
    if (data.snapshots && data.snapshots.length > 0) {
        if (currentY > 200) {
            doc.addPage();
            currentY = 20;
        }
        
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text("Registros Visuais (Keyframes)", 14, currentY);
        currentY += 10;

        const imgWidth = (pageWidth - 40) / 2;
        const imgHeight = (imgWidth * 3) / 4;

        data.snapshots.forEach((img, index) => {
            const x = 14 + (index % 2) * (imgWidth + 10);
            const y = currentY + Math.floor(index / 2) * (imgHeight + 15);
            
            if (y + imgHeight > 280) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);
            doc.setFontSize(8);
            doc.text(`Frame #${index + 1}`, x, y + imgHeight + 5);
        });
    }

    addFooter(doc);
    doc.save(`Fisioflow_Biomecanica_${data.patientName.replace(/\s+/g, '_')}_${format(data.date, "yyyyMMdd")}.pdf`);
};

// ===== Comparative Report (Phast-style) =====

export const generateComparativeReport = async (data: ComparativeReportData) => {
    if (data.assessments.length < 1) return;

    const { jsPDF, autoTable } = await loadJsPdfRuntime();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const sorted = [...data.assessments].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Header
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setFillColor(79, 70, 229); // Indigo strip
    doc.rect(0, 44, pageWidth, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FISIOFLOW PRO LAB", 14, 18);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("RELATÓRIO COMPARATIVO DE BIOMECÂNICA", 14, 30);

    doc.setFontSize(9);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageWidth - 60, 18);

    // Patient & Period Info
    let currentY = 60;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Paciente: ${data.patientName}`, 14, currentY);
    currentY += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
        `Período analisado: ${format(sorted[0].date, "dd/MM/yyyy", { locale: ptBR })} → ${format(sorted[sorted.length - 1].date, "dd/MM/yyyy", { locale: ptBR })}  |  ${sorted.length} avaliações`,
        14,
        currentY,
    );
    currentY += 6;

    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 10;

    // ===== Delta Comparison Table =====
    // For each pair of consecutive assessments of the same type
    const pairs: Array<{ a: Assessment; b: Assessment }> = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].type === sorted[i + 1].type) {
            pairs.push({ a: sorted[i], b: sorted[i + 1] });
        }
    }

    if (pairs.length > 0) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Análise Comparativa — Delta de Métricas", 14, currentY);
        currentY += 8;

        for (const { a, b } of pairs) {
            const allKeys = new Set([
                ...Object.keys(a.metrics ?? {}),
                ...Object.keys(b.metrics ?? {}),
            ]);

            const rows = Array.from(allKeys).map((key) => {
                const va = Number(a.metrics?.[key] ?? 0);
                const vb = Number(b.metrics?.[key] ?? 0);
                const delta = vb - va;
                const deltaStr = delta === 0 ? "—" : delta > 0 ? `+${delta.toFixed(2)}` : `${delta.toFixed(2)}`;
                return [
                    key.replace(/([A-Z])/g, ' $1').toUpperCase(),
                    String(a.metrics?.[key] ?? "—"),
                    String(b.metrics?.[key] ?? "—"),
                    deltaStr,
                ];
            });

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229);
            doc.text(
                `${a.type.toUpperCase()} | ${format(a.date, "dd/MM/yy", { locale: ptBR })} → ${format(b.date, "dd/MM/yy", { locale: ptBR })}`,
                14,
                currentY,
            );
            currentY += 4;

            autoTable(doc, {
                startY: currentY,
                head: [["Métrica", `Sessão A (${format(a.date, "dd/MM")})`, `Sessão B (${format(b.date, "dd/MM")})`, "Δ Delta"]],
                body: rows,
                theme: "grid",
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
                styles: { fontSize: 8 },

                columnStyles: {
                    3: {
                        fontStyle: "bold",
                        textColor: (cell: any) => {
                            const v = cell.text[0];
                            if (v?.startsWith("+")) return [34, 197, 94]; // green
                            if (v?.startsWith("-")) return [239, 68, 68]; // red
                            return [100, 116, 139];
                        },
                    },
                },
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;
        }
    }

    // ===== Asymmetry Summary =====
    const hasAsymmetry = sorted.some((s) => s.asymmetry != null);
    if (hasAsymmetry) {
        if (currentY > 230) { doc.addPage(); currentY = 20; }

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Histórico de Assimetria (%)", 14, currentY);
        currentY += 6;

        autoTable(doc, {
            startY: currentY,
            head: [["Data", "Tipo", "Assimetria (%)", "Status"]],
            body: sorted.map((s) => {
                const asym = s.asymmetry != null ? parseFloat(s.asymmetry) : null;
                const status = asym == null ? "—" : Math.abs(asym) > 15 ? "⚠ Alto Risco" : "✓ Normal";
                return [
                    format(s.date, "dd/MM/yyyy", { locale: ptBR }),
                    s.type,
                    asym != null ? `${Math.abs(asym).toFixed(1)}%` : "—",
                    status,
                ];
            }),
            theme: "striped",
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 9 },
            styles: { fontSize: 9 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Interpretation
    if (currentY > 230) { doc.addPage(); currentY = 20; }
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, pageWidth - 28, 28, 4, 4, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("INTERPRETAÇÃO CLÍNICA", 20, currentY + 8);
    doc.setFontSize(8);
    doc.text(
        "Este relatório foi gerado automaticamente pelo Fisioflow Pro Lab. Os dados apresentados devem ser",
        20, currentY + 15,
    );
    doc.text(
        "interpretados em conjunto com a avaliação clínica do fisioterapeuta responsável.",
        20, currentY + 21,
    );

    addFooter(doc);
    doc.save(
        `Fisioflow_Comparativo_${data.patientName.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}.pdf`,
    );
};

// ===== Helpers =====

function addFooter(doc: jsPDF) {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Fisioflow Pro Lab • ${i}/${pageCount} • Gerado automaticamente`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' },
        );
    }
}
