/**
 * FisioFlow - PDF Generator Integration
 *
 * Integração da skill PDF para geração de documentos clínicos:
 * - Atestados
 * - Declarações de Comparecimento
 * - Receituários
 * - Relatórios de Evolução
 * - Planos de Tratamento
 *
 * Baseado na claude-skills PDF skill
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configurações do documento
const CONFIG = {
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  lineHeight: 7,
  fonts: {
    normal: 'helvetica',
    bold: 'helvetica',
    italic: 'helvetica',
  },
  colors: {
    primary: [0, 82, 147],    // Azul FisioFlow
    secondary: [0, 150, 136],  // Verde teal
    text: [51, 51, 51],        // Cinza escuro
    light: [245, 245, 245],    // Cinza claro
  },
};

export interface PatientData {
  name: string;
  cpf?: string;
  birthDate?: Date;
  phone?: string;
  email?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface ProfessionalData {
  name: string;
  crf: string; // Registro do Fisioterapeuta
  uf: string;
  signature?: string; // Base64 da assinatura digital
  logo?: string; // Base64 do logo da clínica
}

export interface ClinicData {
  name: string;
  cnpj?: string;
  phone: string;
  email: string;
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
  logo?: string; // Base64
}

/**
 * Classe base para geração de PDFs
 */
abstract class BasePDFGenerator {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected yPosition: number;
  protected pageNumber: number;

  constructor(orientation: 'p' | 'l' = 'p') {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.yPosition = CONFIG.margins.top;
    this.pageNumber = 1;
  }

  /**
   * Adiciona cabeçalho com logo da clínica
   */
  protected addHeader(clinic: ClinicData): void {
    // Logo
    if (clinic.logo) {
      this.doc.addImage(clinic.logo, 'PNG', 20, 10, 30, 15);
    }

    // Nome da clínica
    this.doc.setFontSize(16);
    this.doc.setFont(...CONFIG.fonts.bold);
    this.doc.setTextColor(...CONFIG.colors.primary);
    this.doc.text(clinic.name, clinic.logo ? 55 : 20, 15);

    // Contato
    this.doc.setFontSize(9);
    this.doc.setFont(...CONFIG.fonts.normal);
    this.doc.setTextColor(...CONFIG.colors.text);
    const contact = `${clinic.phone} | ${clinic.email}`;
    this.doc.text(contact, clinic.logo ? 55 : 20, 20);

    // Endereço
    const address = `${clinic.address.street}, ${clinic.address.number} - ${clinic.address.district}`;
    this.doc.text(address, clinic.logo ? 55 : 20, 24);
    const cityState = `${clinic.address.city} - ${clinic.address.state} | CEP: ${clinic.address.zipCode}`;
    this.doc.text(cityState, clinic.logo ? 55 : 20, 28);

    // Linha divisória
    this.doc.setDrawColor(...CONFIG.colors.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 33, this.pageWidth - 20, 33);

    this.yPosition = 43;
  }

  /**
   * Adiciona rodapé com número de página e data
   */
  protected addFooter(): void {
    const footerY = this.pageHeight - 15;

    // Linha superior
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.line(20, footerY - 5, this.pageWidth - 20, footerY - 5);

    // Número da página
    this.doc.setFontSize(8);
    this.doc.setFont(...CONFIG.fonts.normal);
    this.doc.setTextColor(128, 128, 128);
    this.doc.text(
      `Página ${this.pageNumber}`,
      this.pageWidth / 2,
      footerY,
      { align: 'center' }
    );

    // Data de emissão
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    this.doc.text(
      `Emitido em: ${today}`,
      this.pageWidth - 20,
      footerY,
      { align: 'right' }
    );
  }

  /**
   * Adiciona título da seção
   */
  protected addSectionTitle(title: string): void {
    if (this.yPosition > this.pageHeight - 50) {
      this.doc.addPage();
      this.pageNumber++;
      this.yPosition = CONFIG.margins.top;
    }

    this.doc.setFontSize(14);
    this.doc.setFont(...CONFIG.fonts.bold);
    this.doc.setTextColor(...CONFIG.colors.primary);
    this.doc.text(title, 20, this.yPosition);
    this.yPosition += 8;

    this.doc.setFontSize(11);
    this.doc.setFont(...CONFIG.fonts.normal);
    this.doc.setTextColor(...CONFIG.colors.text);
  }

  /**
   * Adiciona texto com quebra automática de linha
   */
  protected addText(text: string, maxWidth: number = this.pageWidth - 40): void {
    const lines = this.doc.splitTextToSize(text, maxWidth);
    const neededSpace = lines.length * CONFIG.lineHeight + 10;

    if (this.yPosition + neededSpace > this.pageHeight - 30) {
      this.doc.addPage();
      this.pageNumber++;
      this.yPosition = CONFIG.margins.top;
    }

    for (const line of lines) {
      this.doc.text(line, 20, this.yPosition);
      this.yPosition += CONFIG.lineHeight;
    }
    this.yPosition += 3;
  }

  /**
   * Adiciona dados do paciente
   */
  protected addPatientData(patient: PatientData): void {
    this.addSectionTitle('Dados do Paciente');

    const data = [
      ['Nome:', patient.name],
      ['CPF:', patient.cpf || 'Não informado'],
      ['Data de Nascimento:', patient.birthDate
        ? format(patient.birthDate, 'dd/MM/yyyy')
        : 'Não informada'],
      ['Telefone:', patient.phone || 'Não informado'],
      ['E-mail:', patient.email || 'Não informado'],
    ];

    if (patient.address) {
      data.push([
        'Endereço:',
        `${patient.address.street}, ${patient.address.number} ` +
        `${patient.address.complement || ''} - ${patient.address.district}`
      ]);
      data.push([
        '',
        `${patient.address.city} - ${patient.address.state} | CEP: ${patient.address.zipCode}`
      ]);
    }

    this.doc.setFontSize(10);
    for (const [label, value] of data) {
      this.doc.setFont(...CONFIG.fonts.bold);
      this.doc.text(label, 25, this.yPosition);
      this.doc.setFont(...CONFIG.fonts.normal);
      this.doc.text(value, 50, this.yPosition);
      this.yPosition += 6;
    }
    this.yPosition += 5;
  }

  /**
   * Adiciona assinatura do profissional
   */
  protected addSignature(professional: ProfessionalData, city: string): void {
    const signatureY = this.yPosition + 20;

    if (signatureY > this.pageHeight - 40) {
      this.doc.addPage();
      this.pageNumber++;
      this.yPosition = CONFIG.margins.top;
    }

    const signatureYFinal = Math.max(this.yPosition + 30, this.pageHeight - 60);

    // Linha de assinatura
    this.doc.setDrawColor(...CONFIG.colors.text);
    this.doc.setLineWidth(0.5);
    this.doc.line(50, signatureYFinal, 120, signatureYFinal);

    // Nome e CRF
    this.doc.setFontSize(10);
    this.doc.setFont(...CONFIG.fonts.bold);
    this.doc.text(professional.name, 85, signatureYFinal + 5, { align: 'center' });
    this.doc.setFont(...CONFIG.fonts.normal);
    this.doc.text(`Fisioterapeuta ${professional.crf}-${professional.uf}`, 85, signatureYFinal + 10, { align: 'center' });

    // Local e data
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    this.doc.text(`${city}, ${today}`, 85, signatureYFinal + 15, { align: 'center' });

    // Assinatura digital se houver
    if (professional.signature) {
      this.doc.addImage(professional.signature, 'PNG', 65, signatureYFinal - 20, 40, 15);
    }

    this.yPosition = signatureYFinal + 25;
  }

  /**
   * Gera o PDF como blob
   */
  protected generate(filename: string): Blob {
    this.addFooter();
    return this.doc.output('blob');
  }

  /**
   * Salva o PDF
   */
  public save(filename: string): void {
    this.addFooter();
    this.doc.save(filename);
  }

  /**
   * Obtém o PDF como base64
   */
  public getBase64(): string {
    this.addFooter();
    return this.doc.output('datauristring');
  }
}

/**
 * Gerador de Atestado
 */
export class AtestadoGenerator extends BasePDFGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      days: number;
      reason: string;
      cid?: string;
      city: string;
    }
  ): Blob {
    this.addHeader(clinic);

    // Título
    this.doc.setFontSize(18);
    this.doc.setFont(...CONFIG.fonts.bold);
    this.doc.setTextColor(...CONFIG.colors.primary);
    this.doc.text('ATESTADO', this.pageWidth / 2, this.yPosition, { align: 'center' });
    this.yPosition += 15;

    // Texto do atestado
    this.doc.setFontSize(12);
    this.doc.setFont(...CONFIG.fonts.normal);
    this.doc.setTextColor(...CONFIG.colors.text);

    const texto = `Atesto para os devidos fins que o(a) Sr(a). ${patient.name}${
      patient.cpf ? `, inscrito(a) no CPF sob o n° ${patient.cpf}` : ''
    }, foi atendido(a) nesta instituição e necessita de afastamento de suas atividades laborais por período de ${data.days} dia(s), a contar de ${format(new Date(), 'dd/MM/yyyy')}, devido a ${data.reason.toLowerCase()}.`;

    this.addText(texto);

    if (data.cid) {
      this.yPosition += 5;
      this.doc.setFont(...CONFIG.fonts.bold);
      this.doc.text(`CID: ${data.cid}`, this.pageWidth / 2, this.yPosition, { align: 'center' });
      this.yPosition += 10;
    }

    this.addSignature(professional, data.city);

    return this.generate(`atestado-${patient.name.replace(/\s+/g, '-')}.pdf`);
  }
}

/**
 * Gerador de Declaração de Comparecimento
 */
export class DeclaracaoComparecimentoGenerator extends BasePDFGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      date: Date;
      startTime: string;
      endTime: string;
      type: string;
      city: string;
    }
  ): Blob {
    this.addHeader(clinic);

    // Título
    this.doc.setFontSize(18);
    this.doc.setFont(...CONFIG.fonts.bold);
    this.doc.setTextColor(...CONFIG.colors.primary);
    this.doc.text('DECLARAÇÃO DE COMPARECIMENTO', this.pageWidth / 2, this.yPosition, { align: 'center' });
    this.yPosition += 15;

    // Texto da declaração
    this.doc.setFontSize(12);
    this.doc.setFont(...CONFIG.fonts.normal);
    this.doc.setTextColor(...CONFIG.colors.text);

    const texto = `Declaro para os devidos fins que o(a) Sr(a). ${patient.name}${
      patient.cpf ? `, CPF n° ${patient.cpf}` : ''
    }, esteve presente nesta clínica no dia ${format(data.date, 'dd/MM/yyyy')}, no horário das ${data.startTime} às ${data.endTime}, para realizar sessão de ${data.type}.`;

    this.addText(texto);

    this.addSignature(professional, data.city);

    return this.generate(`declaracao-${patient.name.replace(/\s+/g, '-')}.pdf`);
  }
}

/**
 * Gerador de Receituário
 */
export class ReceituarioGenerator extends BasePDFGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      prescriptions: Array<{
        type: 'exercicio' | 'medicamento' | 'orientacao';
        description: string;
        frequency?: string;
        duration?: string;
      }>;
      city: string;
    }
  ): Blob {
    this.addHeader(clinic);
    this.addPatientData(patient);

    this.addSectionTitle('Prescrições');

    for (const prescription of data.prescriptions) {
      const tipo = prescription.type === 'exercicio' ? 'Exercício' :
                   prescription.type === 'medicamento' ? 'Medicamento' :
                   'Orientação';

      this.doc.setFont(...CONFIG.fonts.bold);
      this.doc.text(`${tipo}:`, 25, this.yPosition);
      this.yPosition += 6;

      this.doc.setFont(...CONFIG.fonts.normal);
      this.addText(prescription.description);

      if (prescription.frequency) {
        this.doc.text(`Frequência: ${prescription.frequency}`, 30, this.yPosition);
        this.yPosition += 6;
      }

      if (prescription.duration) {
        this.doc.text(`Duração: ${prescription.duration}`, 30, this.yPosition);
        this.yPosition += 6;
      }

      this.yPosition += 5;
    }

    this.addSignature(professional, data.city);

    return this.generate(`receituario-${patient.name.replace(/\s+/g, '-')}.pdf`);
  }
}

/**
 * Gerador de Relatório de Evolução Clínica
 */
export class EvolucaoGenerator extends BasePDFGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      evaluations: Array<{
        date: Date;
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
      }>;
      summary: string;
      city: string;
    }
  ): Blob {
    this.addHeader(clinic);
    this.addPatientData(patient);

    // Resumo
    if (data.summary) {
      this.addSectionTitle('Resumo Clínico');
      this.addText(data.summary);
    }

    // Evoluções
    for (const evaluation of data.evaluations) {
      this.addSectionTitle(`Evolução - ${format(evaluation.date, 'dd/MM/yyyy')}`);

      this.doc.setFont(...CONFIG.fonts.bold);
      this.doc.text('S - Subjetivo:', 25, this.yPosition);
      this.yPosition += 6;
      this.doc.setFont(...CONFIG.fonts.normal);
      this.addText(evaluation.subjective);

      this.doc.setFont(...CONFIG.fonts.bold);
      this.doc.text('O - Objetivo:', 25, this.yPosition);
      this.yPosition += 6;
      this.doc.setFont(...CONFIG.fonts.normal);
      this.addText(evaluation.objective);

      this.doc.setFont(...CONFIG.fonts.bold);
      this.doc.text('A - Avaliação:', 25, this.yPosition);
      this.yPosition += 6;
      this.doc.setFont(...CONFIG.fonts.normal);
      this.addText(evaluation.assessment);

      this.doc.setFont(...CONFIG.fonts.bold);
      this.doc.text('P - Plano:', 25, this.yPosition);
      this.yPosition += 6;
      this.doc.setFont(...CONFIG.fonts.normal);
      this.addText(evaluation.plan);
    }

    this.addSignature(professional, data.city);

    return this.generate(`evolucao-${patient.name.replace(/\s+/g, '-')}.pdf`);
  }
}

/**
 * Gerador de Plano de Tratamento
 */
export class PlanoTratamentoGenerator extends BasePDFGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      diagnosis: string;
      objectives: string[];
    procedures: Array<{
        name: string;
        sessions: number;
        frequency: string;
      }>;
      estimatedDuration: string;
      city: string;
    }
  ): Blob {
    this.addHeader(clinic);
    this.addPatientData(patient);

    // Diagnóstico
    this.addSectionTitle('Diagnóstico');
    this.addText(data.diagnosis);

    // Objetivos
    this.addSectionTitle('Objetivos do Tratamento');
    for (const objective of data.objectives) {
      this.doc.text(`• ${objective}`, 25, this.yPosition);
      this.yPosition += 6;
    }
    this.yPosition += 5;

    // Procedimentos em tabela
    this.addSectionTitle('Procedimentos');

    const tableData = data.procedures.map(p => [
      p.name,
      p.sessions.toString(),
      p.frequency,
    ]);

    autoTable(this.doc, {
      startY: this.yPosition,
      head: [['Procedimento', 'Sessões', 'Frequência']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: CONFIG.colors.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      margin: { top: 10, left: 20, right: 20 },
    });

    this.yPosition = (this.doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // Duração estimada
    this.doc.setFont(...CONFIG.fonts.bold);
    this.doc.text(`Duração estimada: ${data.estimatedDuration}`, 25, this.yPosition);

    this.addSignature(professional, data.city);

    return this.generate(`plano-tratamento-${patient.name.replace(/\s+/g, '-')}.pdf`);
  }
}

/**
 * Factory para criar geradores
 */
export class PDFGeneratorFactory {
  static createAtestado(): AtestadoGenerator {
    return new AtestadoGenerator();
  }

  static createDeclaracao(): DeclaracaoComparecimentoGenerator {
    return new DeclaracaoComparecimentoGenerator();
  }

  static createReceituario(): ReceituarioGenerator {
    return new ReceituarioGenerator();
  }

  static createEvolucao(): EvolucaoGenerator {
    return new EvolucaoGenerator();
  }

  static createPlanoTratamento(): PlanoTratamentoGenerator {
    return new PlanoTratamentoGenerator();
  }
}

// Exportar tipos para uso em componentes React
export type {
  PatientData,
  ProfessionalData,
  ClinicData,
};
