/**
 * Gerador de Relatórios Financeiros em PDF
 * Para uso nas páginas de gestão financeira
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface FinancialReportData {
  clinicName: string;
  clinicAddress?: string;
  period: { start: Date; end: Date };
  summary: {
    totalRevenue: number;
    pendingPayments: number;
    paidCount: number;
    totalCount: number;
    averageTicket: number;
    monthlyGrowth?: number;
  };
  transactions: Array<{
    id: string;
    tipo: 'receita' | 'despesa' | 'pacote';
    descricao: string;
    valor: number;
    status: 'pendente' | 'concluido' | 'cancelado';
    data_vencimento: string | Date;
    data_pagamento?: string | Date;
    patient_name?: string;
  }>;
}

export class FinancialReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private yPosition: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.yPosition = 20;
  }

  private addHeader(clinicName: string, period: { start: Date; end: Date }) {
    // Nome da clínica
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 82, 147);
    this.doc.text(clinicName, 20, 15);

    // Título do relatório
    this.doc.setFontSize(14);
    this.doc.text('Relatório Financeiro', 20, 25);

    // Período
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    const periodText = `Período: ${format(period.start, 'dd/MM/yyyy', { locale: ptBR })} a ${format(period.end, 'dd/MM/yyyy', { locale: ptBR })}`;
    this.doc.text(periodText, 20, 32);

    // Data de emissão
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    this.doc.text(`Emitido em: ${today}`, 20, 38);

    // Linha divisória
    this.doc.setDrawColor(0, 82, 147);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 42, this.pageWidth - 20, 42);

    this.yPosition = 52;
  }

  private addSummary(data: FinancialReportData['summary']) {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 82, 147);
    this.doc.text('Resumo Financeiro', 20, this.yPosition);
    this.yPosition += 8;

    // Dados do resumo em tabela
    const summaryData = [
      ['Receita Total', `R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Pagamentos Pendentes', `R$ ${data.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Transações Concluídas', data.paidCount.toString()],
      ['Total de Transações', data.totalCount.toString()],
      ['Ticket Médio', `R$ ${data.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ];

    if (data.monthlyGrowth !== undefined) {
      summaryData.push(['Crescimento Mensal', `${data.monthlyGrowth > 0 ? '+' : ''}${data.monthlyGrowth.toFixed(1)}%`]);
    }

    autoTable(this.doc, {
      startY: this.yPosition,
      head: [['Descrição', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 82, 147],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 50, halign: 'right' },
      },
      margin: { top: 0, left: 20, right: 20 },
    });

    this.yPosition = (this.doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  private checkPageBreak(requiredSpace: number = 20) {
    if (this.yPosition + requiredSpace > 270) {
      this.doc.addPage();
      this.yPosition = 20;
    }
  }

  private addTransactions(transactions: FinancialReportData['transactions']) {
    this.checkPageBreak(40);

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 82, 147);
    this.doc.text('Transações', 20, this.yPosition);
    this.yPosition += 8;

    // Dados das transações
    const tableData = transactions.map((t) => [
      format(new Date(t.data_vencimento), 'dd/MM/yyyy'),
      t.descricao.substring(0, 30),
      t.patient_name || '-',
      `R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      this.getStatusLabel(t.status),
    ]);

    autoTable(this.doc, {
      startY: this.yPosition,
      head: [['Data', 'Descrição', 'Paciente', 'Valor', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 82, 147],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 55 },
        2: { cellWidth: 45 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 25 },
      },
      margin: { top: 0, left: 20, right: 20 },
      didDrawPage: (data) => {
        // Adicionar número da página
        this.doc.setFontSize(8);
        this.doc.setTextColor(128, 128, 128);
        this.doc.text(
          `Página ${this.doc.internal.getNumberOfPages()}`,
          this.pageWidth / 2,
          285,
          { align: 'center' }
        );
      },
    });

    this.yPosition = (this.doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pendente': 'Pendente',
      'concluido': 'Pago',
      'cancelado': 'Cancelado',
    };
    return labels[status] || status;
  }

  private addFooter(clinicAddress?: string) {
    const footerY = 285;

    this.doc.setFontSize(8);
    this.doc.setTextColor(128, 128, 128);

    if (clinicAddress) {
      this.doc.text(clinicAddress, 20, footerY, { align: 'left' });
    }

    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy' às 'HH:mm", { locale: ptBR });
    this.doc.text(`Gerado em: ${today}`, this.pageWidth - 20, footerY, { align: 'right' });
  }

  public generate(data: FinancialReportData): Blob {
    // Adiciona cabeçalho
    this.addHeader(data.clinicName, data.period);

    // Adiciona resumo
    this.addSummary(data.summary);

    // Adiciona transações
    this.addTransactions(data.transactions);

    // Adiciona rodapé
    this.addFooter(data.clinicAddress);

    return this.doc.output('blob');
  }

  public save(data: FinancialReportData, filename?: string): void {
    const blob = this.generate(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Função helper para gerar relatório financeiro
export function generateFinancialReportPDF(data: FinancialReportData): Blob {
  const generator = new FinancialReportGenerator();
  return generator.generate(data);
}

// Função helper para salvar relatório financeiro
export function saveFinancialReportPDF(data: FinancialReportData, filename?: string): void {
  const generator = new FinancialReportGenerator();
  generator.save(data, filename);
}
