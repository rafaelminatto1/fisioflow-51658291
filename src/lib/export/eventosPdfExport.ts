import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialReport } from '@/hooks/useEventoFinancialReport';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function exportEventoFinancialReportPDF(report: FinancialReport) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Financeiro - Evento', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Informações do evento
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Evento: ${report.evento.nome}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Categoria: ${report.evento.categoria}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Local: ${report.evento.local}`, 14, yPosition);
  yPosition += 6;
  doc.text(
    `Período: ${format(new Date(report.evento.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(report.evento.data_fim), 'dd/MM/yyyy', { locale: ptBR })}`,
    14,
    yPosition
  );
  yPosition += 12;

  // Resumo Financeiro
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Financeiro', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Categoria', 'Valor (R$)']],
    body: [
      ['Prestadores', report.resumo.custo_prestadores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
      ['Checklist/Insumos', report.resumo.custo_checklist.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
      ['Outros Pagamentos', report.resumo.outros_pagamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
      ['TOTAL', report.resumo.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  // Prestadores
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Prestadores', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Quantidade', 'Valor (R$)']],
    body: [
      ['Total de Prestadores', report.prestadores.total.toString(), report.prestadores.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
      ['Pagos', report.prestadores.pagos.toString(), report.prestadores.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
      ['Pendentes', report.prestadores.pendentes.toString(), report.prestadores.valor_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  // Checklist
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist / Insumos', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Quantidade']],
    body: [
      ['Total de Itens', report.checklist.total_itens.toString()],
      ['Itens Concluídos', report.checklist.itens_ok.toString()],
      ['Itens Pendentes', report.checklist.itens_abertos.toString()],
      ['Custo Total', `R$ ${report.checklist.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  // Pagamentos por Tipo
  if (Object.keys(report.pagamentos.por_tipo).length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Outros Pagamentos por Tipo', 14, yPosition);
    yPosition += 8;

    const pagamentosBody = Object.entries(report.pagamentos.por_tipo).map(([tipo, data]) => [
      tipo,
      data.count.toString(),
      `R$ ${data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Tipo', 'Quantidade', 'Valor Total']],
      body: pagamentosBody,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  doc.save(`relatorio_financeiro_${report.evento.nome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}
