import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ExportConfig {
  title: string;
  data: any[];
  columns: { key: string; label: string; format?: (value: any) => string }[];
  summary?: { label: string; value: string }[];
  filters?: { label: string; value: string }[];
}

export class ExportService {
  // Export to PDF
  static async exportToPDF(config: ExportConfig) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.text(config.title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Generated date
    pdf.setFontSize(10);
    pdf.text(
      `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 20;

    // Filters
    if (config.filters && config.filters.length > 0) {
      pdf.setFontSize(12);
      pdf.text('Filtros Aplicados:', 20, yPosition);
      yPosition += 10;
      
      config.filters.forEach(filter => {
        pdf.setFontSize(10);
        pdf.text(`${filter.label}: ${filter.value}`, 25, yPosition);
        yPosition += 8;
      });
      yPosition += 10;
    }

    // Summary
    if (config.summary && config.summary.length > 0) {
      pdf.setFontSize(12);
      pdf.text('Resumo:', 20, yPosition);
      yPosition += 10;
      
      config.summary.forEach(item => {
        pdf.setFontSize(10);
        pdf.text(`${item.label}: ${item.value}`, 25, yPosition);
        yPosition += 8;
      });
      yPosition += 15;
    }

    // Table header
    if (config.data.length > 0) {
      pdf.setFontSize(12);
      pdf.text('Dados:', 20, yPosition);
      yPosition += 10;

      // Simple table implementation
      const startX = 20;
      const colWidth = (pageWidth - 40) / config.columns.length;
      
      // Headers
      pdf.setFontSize(9);
      config.columns.forEach((col, index) => {
        pdf.text(col.label, startX + (index * colWidth), yPosition);
      });
      yPosition += 8;

      // Data rows (first 20 rows to fit on page)
      config.data.slice(0, 20).forEach(row => {
        config.columns.forEach((col, index) => {
          const value = col.format ? col.format(row[col.key]) : row[col.key];
          pdf.text(String(value || ''), startX + (index * colWidth), yPosition);
        });
        yPosition += 6;
        
        if (yPosition > 270) { // Add new page if needed
          pdf.addPage();
          yPosition = 20;
        }
      });
    }

    // Download
    pdf.save(`${config.title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  // Export to Excel
  static exportToExcel(config: ExportConfig) {
    const workbook = XLSX.utils.book_new();
    
    // Create main data worksheet
    const worksheetData = [
      // Headers
      config.columns.map(col => col.label),
      // Data rows
      ...config.data.map(row => 
        config.columns.map(col => {
          const value = row[col.key];
          return col.format ? col.format(value) : value;
        })
      )
    ];
    
    const mainWorksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Dados');

    // Create summary worksheet if available
    if (config.summary && config.summary.length > 0) {
      const summaryData = [
        ['Resumo', ''],
        ...config.summary.map(item => [item.label, item.value])
      ];
      
      if (config.filters && config.filters.length > 0) {
        summaryData.push(['', '']);
        summaryData.push(['Filtros', '']);
        summaryData.push(...config.filters.map(filter => [filter.label, filter.value]));
      }
      
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumo');
    }

    // Download
    XLSX.writeFile(workbook, `${config.title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  // Export to CSV
  static exportToCSV(config: ExportConfig) {
    const headers = config.columns.map(col => col.label);
    const csvRows = [headers.join(',')];
    
    config.data.forEach(row => {
      const values = config.columns.map(col => {
        const value = row[col.key];
        const formattedValue = col.format ? col.format(value) : value;
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(formattedValue || '');
        return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${config.title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  }

  // Format currency for exports
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  // Format percentage
  static formatPercentage(value: number): string {
    return `${(value || 0).toFixed(1)}%`;
  }

  // Format date
  static formatDate(date: string | Date): string {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  }

  // Format date and time
  static formatDateTime(date: string | Date): string {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  }
}