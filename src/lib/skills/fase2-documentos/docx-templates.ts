/**
 * FisioFlow - DOCX Templates Integration
 *
 * Integração da skill DOCX para criação de documentos clínicos editáveis:
 * - Modelos de atestados editáveis
 * - Modelos de receituário
 * - Relatórios de evolução formatados
 * - Documentos de anamnese
 *
 * Baseado na claude-skills DOCX skill usando docx-js
 *
 * NOTA: Este módulo requer a biblioteca 'docx'
 * npm install docx
 */

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Packer,
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos de dados
export interface PatientData {
  name: string;
  cpf?: string;
  rg?: string;
  birthDate?: Date;
  age?: number;
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
  occupation?: string;
  healthInsurance?: string;
}

export interface ProfessionalData {
  name: string;
  crf: string;
  uf: string;
  specialty?: string;
  clinic?: string;
  contact?: string;
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

// Funções auxiliares
function formatDate(date: Date): string {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function formatDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * Gerador de Atestado DOCX
 */
export class AtestadoDocxGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      days: number;
      reason: string;
      cid?: string;
      includeExams?: boolean;
      exams?: string[];
    }
  ): Document {
    const children: Paragraph[] = [];

    // Cabeçalho
    children.push(
      new Paragraph({
        text: clinic.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    if (clinic.cnpj) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `CNPJ: ${clinic.cnpj}`,
              size: 18,
              color: '666666',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    // Linha divisória
    children.push(
      new Paragraph({
        border: {
          bottom: {
            color: '005293',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { after: 300 },
      })
    );

    // Título
    children.push(
      new Paragraph({
        text: 'ATESTADO',
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 },
      })
    );

    // Data e local
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${clinic.city}, ${formatDate(new Date)}.`,
            size: 24,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Corpo do atestado
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Atesto para os devidos fins que o(a) Sr(a). ',
            size: 24,
          }),
          new TextRun({
            text: patient.name,
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    if (patient.cpf) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `inscrito(a) no CPF sob o nº ${patient.cpf}, `,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `foi atendido(a) nesta instituição e necessita de afastamento de suas atividades laborais por período de `,
            size: 24,
          }),
          new TextRun({
            text: `${data.days} dia(s)`,
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: `, a contar de ${formatDate(new Date)}, devido a `,
            size: 24,
          }),
          new TextRun({
            text: data.reason,
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: '.',
            size: 24,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // CID se houver
    if (data.cid) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `CID: ${data.cid}`,
              bold: true,
              size: 24,
              color: '005293',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Exames se houver
    if (data.includeExams && data.exams && data.exams.length > 0) {
      children.push(
        new Paragraph({
          text: 'Exames solicitados:',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 200 },
        })
      );

      data.exams.forEach((exam) => {
        children.push(
          new Paragraph({
            text: `• ${exam}`,
            bullet: {
              level: 0,
            },
            spacing: { after: 100 },
          })
        );
      });
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 400 },
        })
      );
    }

    // Assinatura
    children.push(
      new Paragraph({
        text: '_____________________________________',
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: professional.name,
            bold: true,
            size: 22,
          }),
          new TextRun({
            text: '\n',
          }),
          new TextRun({
            text: `Fisioterapeuta ${professional.crf}-${professional.uf}`,
            size: 20,
            color: '666666',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    if (professional.specialty) {
      children.push(
        new Paragraph({
          text: professional.specialty,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );
    }

    return new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });
  }
}

/**
 * Gerador de Receituário DOCX
 */
export class ReceituarioDocxGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    prescriptions: Array<{
      type: 'exercicio' | 'medicamento' | 'orientacao' | 'procedimento';
      name: string;
      description: string;
      frequency?: string;
      duration?: string;
      observations?: string;
    }>
  ): Document {
    const children: Paragraph[] = [];

    // Cabeçalho
    children.push(
      new Paragraph({
        text: clinic.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    children.push(
      new Paragraph({
        border: {
          bottom: {
            color: '005293',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { after: 300 },
      })
    );

    // Título
    children.push(
      new Paragraph({
        text: 'RECEITUÁRIO',
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 },
      })
    );

    // Data
    children.push(
      new Paragraph({
        text: `Data: ${formatDate(new Date)}`,
        spacing: { after: 300 },
      })
    );

    // Dados do paciente
    children.push(
      new Paragraph({
        text: 'Paciente',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      })
    );

    const patientData = [
      ['Nome:', patient.name],
      ['CPF:', patient.cpf || 'Não informado'],
      ['Data de Nascimento:', patient.birthDate ? formatDate(patient.birthDate) : 'Não informada'],
      ['Telefone:', patient.phone || 'Não informado'],
    ];

    patientData.forEach(([label, value]) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: label,
              bold: true,
              size: 22,
            }),
            new TextRun({
              text: ` ${value}`,
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        })
      );
    });

    children.push(
      new Paragraph({
        text: '',
        spacing: { after: 200 },
      })
    );

    // Prescrições
    prescriptions.forEach((prescription, index) => {
      const typeLabel = {
        exercicio: 'Exercício',
        medicamento: 'Medicamento',
        orientacao: 'Orientação',
        procedimento: 'Procedimento',
      }[prescription.type];

      children.push(
        new Paragraph({
          text: `${index + 1}. ${typeLabel}: ${prescription.name}`,
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 300, after: 200 },
        })
      );

      if (prescription.description) {
        children.push(
          new Paragraph({
            text: prescription.description,
            spacing: { after: 150 },
          })
        );
      }

      if (prescription.frequency) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Frequência: ',
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: prescription.frequency,
                size: 22,
              }),
            ],
            spacing: { after: 150 },
          })
        );
      }

      if (prescription.duration) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Duração: ',
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: prescription.duration,
                size: 22,
              }),
            ],
            spacing: { after: 150 },
          })
        );
      }

      if (prescription.observations) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Observações: ',
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: prescription.observations,
                size: 22,
                italics: true,
              }),
            ],
            spacing: { after: 150 },
          })
        );
      }
    });

    // Assinatura
    children.push(
      new Paragraph({
        text: '',
        spacing: { after: 600 },
      })
    );

    children.push(
      new Paragraph({
        text: '_____________________________________',
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: professional.name,
            bold: true,
            size: 22,
          }),
          new TextRun({
            text: '\n',
          }),
          new TextRun({
            text: `Fisioterapeuta ${professional.crf}-${professional.uf}`,
            size: 20,
            color: '666666',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    return new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });
  }
}

/**
 * Gerador de Relatório de Evolução DOCX
 */
export class EvolucaoDocxGenerator {
  generate(
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    evaluations: Array<{
      date: Date;
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    }>,
    summary?: string
  ): Document {
    const children: Paragraph[] = [];

    // Cabeçalho
    children.push(
      new Paragraph({
        text: clinic.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    children.push(
      new Paragraph({
        border: {
          bottom: {
            color: '005293',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { after: 300 },
      })
    );

    // Título
    children.push(
      new Paragraph({
        text: 'RELATÓRIO DE EVOLUÇÃO CLÍNICA',
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 },
      })
    );

    // Data de emissão
    children.push(
      new Paragraph({
        text: `Emitido em: ${formatDateTime(new Date)}`,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 },
      })
    );

    // Dados do paciente em tabela
    children.push(
      new Paragraph({
        text: 'Dados do Paciente',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Nome: ', bold: true }),
          new TextRun({ text: patient.name }),
        ],
        spacing: { after: 100 },
      })
    );

    if (patient.birthDate) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Idade: ', bold: true }),
            new TextRun({ text: `${patient.age || new Date().getFullYear() - patient.birthDate.getFullYear()} anos` }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    // Resumo se houver
    if (summary) {
      children.push(
        new Paragraph({
          text: 'Resumo Clínico',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 },
        })
      );

      children.push(
        new Paragraph({
          text: summary,
          spacing: { after: 300 },
        })
      );
    }

    // Evoluções
    evaluations.forEach((evaluation, index) => {
      const isFirst = index === 0;
      const isLast = index === evaluations.length - 1;

      if (!isFirst) {
        children.push(
          new Paragraph({
            text: '',
            spacing: { after: 200 },
          })
        );
      }

      children.push(
        new Paragraph({
          text: `Evolução ${index + 1} - ${formatDate(evaluation.date)}`,
          heading: HeadingLevel.HEADING_4,
          spacing: { before: isFirst ? 300 : 0, after: 200 },
        })
      );

      // SOAP
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'S - Subjetivo: ',
              bold: true,
              color: '005293',
            }),
            new TextRun({ text: evaluation.subjective }),
          ],
          spacing: { after: 150 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'O - Objetivo: ',
              bold: true,
              color: '005293',
            }),
            new TextRun({ text: evaluation.objective }),
          ],
          spacing: { after: 150 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'A - Avaliação: ',
              bold: true,
              color: '005293',
            }),
            new TextRun({ text: evaluation.assessment }),
          ],
          spacing: { after: 150 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'P - Plano: ',
              bold: true,
              color: '005293',
            }),
            new TextRun({ text: evaluation.plan }),
          ],
          spacing: { after: isLast ? 400 : 150 },
        })
      );
    });

    // Assinatura
    children.push(
      new Paragraph({
        text: '_____________________________________',
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: professional.name,
            bold: true,
            size: 22,
          }),
          new TextRun({
            text: '\n',
          }),
          new TextRun({
            text: `Fisioterapeuta ${professional.crf}-${professional.uf}`,
            size: 20,
            color: '666666',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    return new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });
  }
}

/**
 * Gerador de Anamnese DOCX
 */
export class AnamneseDocxGenerator {
  generate(
    patient: PatientData,
    data: {
      chiefComplaint: string;
      historyOfPresentIllness: string;
      pastMedicalHistory: string;
      medications?: string[];
      allergies?: string[];
      socialHistory?: string;
      familyHistory?: string;
      physicalExam?: string;
    }
  ): Document {
    const children: Paragraph[] = [];

    // Título
    children.push(
      new Paragraph({
        text: 'FICHA DE ANAMNESE',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Data
    children.push(
      new Paragraph({
        text: `Data: ${formatDate(new Date)}`,
        spacing: { after: 300 },
      })
    );

    // Dados do paciente
    children.push(
      new Paragraph({
        text: 'Identificação do Paciente',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Nome: ', bold: true }),
          new TextRun({ text: patient.name }),
        ],
        spacing: { after: 100 },
      })
    );

    if (patient.birthDate) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Data de Nascimento: ', bold: true }),
            new TextRun({ text: formatDate(patient.birthDate) }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (patient.occupation) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Profissão: ', bold: true }),
            new TextRun({ text: patient.occupation }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (patient.healthInsurance) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Convênio: ', bold: true }),
            new TextRun({ text: patient.healthInsurance }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    // Queixa Principal
    children.push(
      new Paragraph({
        text: 'Queixa Principal',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 400, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        text: data.chiefComplaint,
        spacing: { after: 200 },
      })
    );

    // HDA
    children.push(
      new Paragraph({
        text: 'História da Doença Atual',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        text: data.historyOfPresentIllness,
        spacing: { after: 200 },
      })
    );

    // Histórico Médico
    children.push(
      new Paragraph({
        text: 'Histórico Médico',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        text: data.pastMedicalHistory,
        spacing: { after: 200 },
      })
    );

    // Medicamentos
    if (data.medications && data.medications.length > 0) {
      children.push(
        new Paragraph({
          text: 'Medicações em Uso',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 200 },
        })
      );

      data.medications.forEach((med) => {
        children.push(
          new Paragraph({
            text: `• ${med}`,
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
      });
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 200 },
        })
      );
    }

    // Alergias
    if (data.allergies && data.allergies.length > 0) {
      children.push(
        new Paragraph({
          text: 'Alergias',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 200 },
        })
      );

      data.allergies.forEach((allergy) => {
        children.push(
          new Paragraph({
            text: `• ${allergy}`,
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
      });
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 200 },
        })
      );
    }

    // Histórico Social
    if (data.socialHistory) {
      children.push(
        new Paragraph({
          text: 'Histórico Social',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 200 },
        })
      );

      children.push(
        new Paragraph({
          text: data.socialHistory,
          spacing: { after: 200 },
        })
      );
    }

    // Histórico Familiar
    if (data.familyHistory) {
      children.push(
        new Paragraph({
          text: 'Histórico Familiar',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 200 },
        })
      );

      children.push(
        new Paragraph({
          text: data.familyHistory,
          spacing: { after: 200 },
        })
      );
    }

    // Exame Físico
    if (data.physicalExam) {
      children.push(
        new Paragraph({
          text: 'Exame Físico',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 200 },
        })
      );

      children.push(
        new Paragraph({
          text: data.physicalExam,
          spacing: { after: 200 },
        })
      );
    }

    return new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });
  }
}

/**
 * Factory para criar geradores
 */
export class DocxGeneratorFactory {
  static createAtestado(): AtestadoDocxGenerator {
    return new AtestadoDocxGenerator();
  }

  static createReceituario(): ReceituarioDocxGenerator {
    return new ReceituarioDocxGenerator();
  }

  static createEvolucao(): EvolucaoDocxGenerator {
    return new EvolucaoDocxGenerator();
  }

  static createAnamnese(): AnamneseDocxGenerator {
    return new AnamneseDocxGenerator();
  }

  /**
   * Salva documento como arquivo
   */
  static async saveDocument(doc: Document, filename: string): Promise<void> {
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  }

  /**
   * Obtém documento como base64
   */
  static async toBase64(doc: Document): Promise<string> {
    const blob = await Packer.toBlob(doc);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Obtém documento como blob
   */
  static async toBlob(doc: Document): Promise<Blob> {
    return Packer.toBlob(doc);
  }
}

// Exportar tipos
export type {
  PatientData,
  ProfessionalData,
  ClinicData,
};
