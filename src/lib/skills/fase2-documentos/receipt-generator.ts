/**
 * Gerador de Recibos em PDF
 * Para comprovantes de pagamento
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ReceiptData {
  clinicName: string;
  clinicAddress?: string;
  clinicCNPJ?: string;
  clinicPhone?: string;
  receiptNumber: string;
  date: Date;
  amount: number;
  amountExtensive?: string;
  payerName: string;
  payerCPF?: string;
  paymentMethod: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'transferencia';
  description: string;
  professionalName?: string;
  professionalCRF?: string;
  city: string;
  state: string;
}

export class ReceiptGenerator {
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

  private numberToExtensive(value: number): string {
    const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    if (value === 0) return 'zero';

    const reais = Math.floor(value);
    const centavos = Math.round((value - reais) * 100);

    let result = '';

    if (reais > 0) {
      if (reais >= 1000) {
        const milhares = Math.floor(reais / 1000);
        result += (milhares === 1 ? 'mil' : this.numberToExtensive(milhares) + ' mil') + ' ';
      }
      let resto = reais % 1000;
      if (resto >= 100) {
        result += hundreds[Math.floor(resto / 100)] + ' e ';
        resto = resto % 100;
      }
      if (resto >= 20) {
        result += tens[Math.floor(resto / 10)];
        if (resto % 10 > 0) result += ' e ' + units[resto % 10];
      } else if (resto >= 10) {
        result += teens[resto - 10];
      } else if (resto > 0) {
        result += units[resto];
      }

      result += ' reais';
    }

    if (centavos > 0) {
      if (reais > 0) result += ' e ';
      if (centavos >= 20) {
        result += tens[Math.floor(centavos / 10)];
        if (centavos % 10 > 0) result += ' e ' + units[centavos % 10];
      } else if (centavos >= 10) {
        result += teens[centavos - 10];
      } else if (centavos > 0) {
        result += units[centavos];
      }
      result += centavos === 1 ? ' centavo' : ' centavos';
    }

    return result || 'zero reais';
  }

  private addHeader(data: ReceiptData) {
    // Logo/nome da clínica
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 82, 147);
    this.doc.text(data.clinicName, this.pageWidth / 2, 20, { align: 'center' });

    // CNPJ e contato
    if (data.clinicCNPJ || data.clinicPhone) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(80, 80, 80);
      const info = [data.clinicCNPJ ? `CNPJ: ${data.clinicCNPJ}` : null, data.clinicPhone ? `Tel: ${data.clinicPhone}` : null]
        .filter(Boolean)
        .join(' | ');
      this.doc.text(info, this.pageWidth / 2, 26, { align: 'center' });
    }

    // Endereço
    if (data.clinicAddress) {
      this.doc.setFontSize(8);
      this.doc.text(data.clinicAddress, this.pageWidth / 2, 30, { align: 'center' });
    }

    // Título RECIBO
    this.doc.setFontSize(22);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('RECIBO', this.pageWidth / 2, 45, { align: 'center' });

    // Número do recibo
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(`Nº ${data.receiptNumber}`, this.pageWidth / 2, 52, { align: 'center' });

    // Data e valor
    this.doc.setFontSize(11);
    this.doc.setTextColor(50, 50, 50);
    const dateValue = `${format(data.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} - Valor: R$ ${data.amount.toFixed(2)}`;
    this.doc.text(dateValue, this.pageWidth / 2, 58, { align: 'center' });

    // Linha decorativa
    this.doc.setDrawColor(0, 82, 147);
    this.doc.setLineWidth(0.5);
    this.doc.line(70, 63, this.pageWidth - 70, 63);

    this.yPosition = 75;
  }

  private addBody(data: ReceiptData) {
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0);

    // Texto do recibo
    const textoRecebi = `Recebi(emos) de ${data.payerName}`;
    this.doc.text(textoRecebi, 25, this.yPosition);
    this.yPosition += 6;

    if (data.payerCPF) {
      this.doc.text(`CPF: ${data.payerCPF}`, 30, this.yPosition);
      this.yPosition += 6;
    }

    this.yPosition += 3;

    // Valor por extenso
    const amountExtensive = data.amountExtensive || this.numberToExtensive(data.amount);
    const textoValor = `a quantia de R$ ${data.amount.toFixed(2)} (${amountExtensive})`;
    this.doc.text(textoValor, 25, this.yPosition);
    this.yPosition += 6;

    // Referente a
    this.doc.text('referente a:', 25, this.yPosition);
    this.yPosition += 6;

    // Descrição (com quebra de linha)
    const lines = this.doc.splitTextToSize(data.description, this.pageWidth - 50);
    lines.forEach((line: string) => {
      this.doc.text(line, 30, this.yPosition);
      this.yPosition += 5;
    });

    this.yPosition += 5;

    // Forma de pagamento
    const paymentLabels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      pix: 'PIX',
      transferencia: 'Transferência Bancária',
    };
    this.doc.text(`Forma de pagamento: ${paymentLabels[data.paymentMethod] || data.paymentMethod}`, 25, this.yPosition);
    this.yPosition += 8;

    // Linha de assinatura
    this.doc.setDrawColor(100, 100, 100);
    this.doc.setLineWidth(0.3);
    this.doc.line(50, this.yPosition + 15, 120, this.yPosition + 15);

    // Nome do profissional
    if (data.professionalName) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(data.professionalName, 85, this.yPosition + 20, { align: 'center' });

      if (data.professionalCRF) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(9);
        this.doc.text(data.professionalCRF, 85, this.yPosition + 25, { align: 'center' });
      }
    } else {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(data.clinicName, 85, this.yPosition + 20, { align: 'center' });
    }

    // Local e data
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const localData = `${data.city} - ${data.state}, ${format(data.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    this.doc.text(localData, 85, this.yPosition + 32, { align: 'center' });

    this.yPosition += 45;
  }

  private addFooter() {
    const footerY = 285;

    this.doc.setFontSize(8);
    this.doc.setTextColor(150, 150, 150);

    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy' às 'HH:mm", { locale: ptBR });
    this.doc.text(`Emitido em: ${today}`, this.pageWidth - 20, footerY, { align: 'right' });

    this.doc.text(
      `Página ${this.doc.internal.getNumberOfPages()}`,
      this.pageWidth / 2,
      footerY,
      { align: 'center' }
    );
  }

  public generate(data: ReceiptData): Blob {
    this.addHeader(data);
    this.addBody(data);
    this.addFooter();

    return this.doc.output('blob');
  }

  public save(data: ReceiptData, filename?: string): void {
    const blob = this.generate(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `recibo-${data.receiptNumber}-${format(data.date, 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Funções helper
export function generateReceiptPDF(data: ReceiptData): Blob {
  const generator = new ReceiptGenerator();
  return generator.generate(data);
}

export function saveReceiptPDF(data: ReceiptData, filename?: string): void {
  const generator = new ReceiptGenerator();
  generator.save(data, filename);
}
