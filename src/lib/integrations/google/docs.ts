/**
 * Google Docs API Integration
 * Gerencia documentos Google Docs, templates e geração de relatórios
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { DriveService } from './drive';

// ============================================================================
// Types
// ============================================================================

export interface DocsTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'clinical_report' | 'evolution' | 'certificate' | 'prescription' | 'other';
  placeholders: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TextReplacement {
  placeholder: string;
  value: string;
}

export interface DocsReplaceRequest {
  documentId: string;
  replacements: TextReplacement[];
}

export interface GeneratedReport {
  documentId: string;
  pdfUrl?: string;
  docsUrl?: string;
  name: string;
}

// ============================================================================
// Docs Service Class
// ============================================================================

export class DocsService {
  private docs: any;
  private driveService: DriveService;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
    this.driveService = new DriveService(accessToken);
  }

  // ========================================================================
  // Document Operations
  // ========================================================================

  /**
   * Copia um template de Docs
   */
  async copyTemplate(templateId: string, name: string): Promise<string> {
    const copiedFile = await this.driveService.copyFile(templateId, name);
    return copiedFile.id;
  }

  /**
   * Substitui placeholders no documento
   */
  async replacePlaceholders(
    documentId: string,
    replacements: TextReplacement[]
  ): Promise<void> {
    const requests = replacements.map(({ placeholder, value }) => ({
      replaceAllText: {
        containsText: {
          text: `{{${placeholder}}}`,
          matchCase: true,
        },
        replaceText: value,
      },
    }));

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  /**
   * Substitui placeholder específico
   */
  async replacePlaceholder(
    documentId: string,
    placeholder: string,
    value: string
  ): Promise<void> {
    await this.replacePlaceholders(documentId, [{ placeholder, value }]);
  }

  /**
   * Extrai todos os placeholders do documento
   */
  async extractPlaceholders(documentId: string): Promise<string[]> {
    const response = await this.docs.documents.get({
      documentId,
      fields: 'body(content',
    });

    const placeholders = new Set<string>();
    const body = response.data.body;

    function extractFromContent(content: any) {
      if (!content) return;

      for (const element of content) {
        if ('paragraph' in element) {
          const paragraph = element.paragraph;
          if (paragraph.elements) {
            for (const elem of paragraph.elements) {
              if ('textRun' in elem && elem.textRun?.content) {
                const matches = elem.textRun.content.match(/\{\{([^}]+)\}\}/g);
                if (matches) {
                  matches.forEach((match: string) => {
                    placeholders.add(match.replace(/\{\{|\}\}/g, ''));
                  });
                }
              }
            }
          }
        } else if ('table' in element) {
          const table = element.table;
          if (table.rows) {
            for (const row of table.rows) {
              if (row.tableCells) {
                for (const cell of row.tableCells) {
                  if (cell.content) {
                    extractFromContent(cell.content);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (body?.content) {
      extractFromContent(body.content);
    }

    return Array.from(placeholders);
  }

  // ========================================================================
  // Report Generation
  // ========================================================================

  /**
   * Gera relatório a partir de template
   */
  async generateReport(
    templateId: string,
    reportName: string,
    data: Record<string, string>,
    options: {
      convertToPdf?: boolean;
      saveToFolder?: string;
    } = {}
  ): Promise<GeneratedReport> {
    // 1. Copiar template
    const documentId = await this.copyTemplate(templateId, reportName);

    // 2. Substituir placeholders
    const replacements = Object.entries(data).map(([key, value]) => ({
      placeholder: key,
      value,
    }));
    await this.replacePlaceholders(documentId, replacements);

    // 3. Exportar para PDF se solicitado
    let pdfUrl: string | undefined;
    if (options.convertToPdf) {
      const pdfBuffer = await this.driveService.exportToPdf(documentId);

      if (options.saveToFolder) {
        const uploadResult = await this.driveService.uploadPdf(
          `${reportName}.pdf`,
          pdfBuffer,
          options.saveToFolder
        );
        pdfUrl = uploadResult.webViewLink;
      }
    }

    // 4. Obter URLs
    const file = await this.driveService.getFile(documentId);

    return {
      documentId,
      pdfUrl,
      docsUrl: file.webViewLink,
      name: reportName,
    };
  }

  /**
   * Gera relatório clínico
   */
  async generateClinicalReport(
    templateId: string,
    patientData: {
      nome: string;
      cpf?: string;
      dataNascimento?: string;
      contato?: string;
    },
    clinicalData: {
      dataAvaliacao: string;
      queixaPrincipal: string;
      historia: string;
      diagnostico: string;
      planoTratamento: string;
      observacoes?: string;
    },
    therapistData: {
      nome: string;
      registro?: string;
      assinatura?: string;
    },
    options?: {
      convertToPdf?: boolean;
      saveToFolder?: string;
    }
  ): Promise<GeneratedReport> {
    const reportName = `Relatório_${patientData.nome}_${new Date().toISOString().split('T')[0]}`;

    const data = {
      // Dados do paciente
      PACIENTE_NOME: patientData.nome,
      PACIENTE_CPF: patientData.cpf || 'Não informado',
      PACIENTE_DATA_NASCIMENTO: patientData.dataNascimento || 'Não informado',
      PACIENTE_CONTATO: patientData.contato || 'Não informado',

      // Dados clínicos
      DATA_AVALIACAO: clinicalData.dataAvaliacao,
      QUEIXA_PRINCIPAL: clinicalData.queixaPrincipal,
      HISTORIA: clinicalData.historia,
      DIAGNOSTICO: clinicalData.diagnostico,
      PLANO_TRATAMENTO: clinicalData.planoTratamento,
      OBSERVACOES: clinicalData.observacoes || 'Nenhuma',

      // Dados do terapeuta
      TERAPEUTA_NOME: therapistData.nome,
      TERAPEUTA_REGISTRO: therapistData.registro || 'Não informado',
      TERAPEUTA_ASSINATURA: therapistData.assinatura || '',

      // Data atual
      DATA_RELATORIO: new Date().toLocaleDateString('pt-BR'),
      HORA_RELATORIO: new Date().toLocaleTimeString('pt-BR'),
    };

    return this.generateReport(templateId, reportName, data, options);
  }

  /**
   * Gera certificado de atendimento
   */
  async generateCertificate(
    templateId: string,
    patientData: {
      nome: string;
      cpf?: string;
    },
    certificateData: {
      tipo: string;
      periodoInicio: string;
      periodoFim: string;
      totalSessoes: number;
    },
    therapistData: {
      nome: string;
      registro?: string;
    },
    options?: {
      convertToPdf?: boolean;
      saveToFolder?: string;
    }
  ): Promise<GeneratedReport> {
    const reportName = `Certificado_${certificateData.tipo}_${patientData.nome}`;

    const data = {
      PACIENTE_NOME: patientData.nome,
      PACIENTE_CPF: patientData.cpf || 'Não informado',
      CERTIFICADO_TIPO: certificateData.tipo,
      PERIODO_INICIO: certificateData.periodoInicio,
      PERIODO_FIM: certificateData.periodoFim,
      TOTAL_SESSOES: certificateData.totalSessoes.toString(),
      TERAPEUTA_NOME: therapistData.nome,
      TERAPEUTA_REGISTRO: therapistData.registro || 'Não informado',
      DATA_EMISSAO: new Date().toLocaleDateString('pt-BR'),
    };

    return this.generateReport(templateId, reportName, data, options);
  }

  /**
   * Gera declaração de comparecimento
   */
  async generateAttendanceDeclaration(
    templateId: string,
    patientData: {
      nome: string;
      cpf?: string;
    },
    attendanceData: {
      data: string;
      horario: string;
      tipoAtendimento: string;
    },
    options?: {
      convertToPdf?: boolean;
      saveToFolder?: string;
    }
  ): Promise<GeneratedReport> {
    const reportName = `Declaracao_Comparecimento_${patientData.nome}_${attendanceData.data}`;

    const data = {
      PACIENTE_NOME: patientData.nome,
      PACIENTE_CPF: patientData.cpf || 'Não informado',
      DATA_ATENDIMENTO: attendanceData.data,
      HORARIO_ATENDIMENTO: attendanceData.horario,
      TIPO_ATENDIMENTO: attendanceData.tipoAtendimento,
      DATA_EMISSAO: new Date().toLocaleDateString('pt-BR'),
    };

    return this.generateReport(templateId, reportName, data, options);
  }

  // ========================================================================
  // Document Content
  // ========================================================================

  /**
   * Lê conteúdo do documento
   */
  async getDocumentContent(documentId: string): Promise<string> {
    const response = await this.docs.documents.get({
      documentId,
    });

    const body = response.data.body;
    let content = '';

    function extractText(element: any) {
      if (!element) return;

      for (const item of element) {
        if ('paragraph' in item) {
          const paragraph = item.paragraph;
          if (paragraph.elements) {
            for (const elem of paragraph.elements) {
              if ('textRun' in elem && elem.textRun?.content) {
                content += elem.textRun.content;
              }
            }
          }
        } else if ('table' in item) {
          const table = item.table;
          if (table.rows) {
            for (const row of table.rows) {
              if (row.tableCells) {
                for (const cell of row.tableCells) {
                  if (cell.content) {
                    extractText(cell.content);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (body?.content) {
      extractText(body.content);
    }

    return content.trim();
  }

  /**
   * Insere texto no documento
   */
  async insertText(documentId: string, text: string, index: number = 1): Promise<void> {
    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              text,
              location: { index },
            },
          },
        ],
      },
    });
  }

  /**
   * Adiciona parágrafo ao documento
   */
  async addParagraph(
    documentId: string,
    text: string,
    heading?: 'NORMAL_TEXT' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'TITLE' | 'SUBTITLE'
  ): Promise<void> {
    const requests: any[] = [
      {
        insertText: {
          text: text + '\n',
          location: { segmentId: '', index: -1 },
        },
      },
    ];

    if (heading) {
      requests.push({
        updateParagraphStyle: {
          range: {
            segmentId: '',
            index: -1,
          },
          paragraphStyle: {
            namedStyleType: heading,
          },
          fields: 'namedStyleType',
        },
      });
    }

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  // ========================================================================
  // Template Management
  // ========================================================================

  /**
   * Lista templates do Drive
   */
  async listTemplates(folderId?: string): Promise<DocsTemplate[]> {
    const files = await this.driveService.getGoogleDocs(folderId);
    const templates: DocsTemplate[] = [];

    for (const file of files) {
      if (file.name.toLowerCase().includes('template') ||
          file.name.toLowerCase().includes('modelo')) {
        const placeholders = await this.extractPlaceholders(file.id);

        let category: DocsTemplate['category'] = 'other';
        if (file.name.toLowerCase().includes('relatorio') || file.name.toLowerCase().includes('clinical')) {
          category = 'clinical_report';
        } else if (file.name.toLowerCase().includes('evolucao')) {
          category = 'evolution';
        } else if (file.name.toLowerCase().includes('certificado')) {
          category = 'certificate';
        } else if (file.name.toLowerCase().includes('receita') || file.name.toLowerCase().includes('prescricao')) {
          category = 'prescription';
        }

        templates.push({
          id: file.id,
          name: file.name,
          category,
          placeholders,
          createdAt: new Date(file.createdTime),
          updatedAt: new Date(file.modifiedTime),
        });
      }
    }

    return templates;
  }

  /**
   * Cria novo template
   */
  async createTemplate(
    name: string,
    content: string,
    placeholders: string[],
    folderId?: string
  ): Promise<string> {
    // Criar documento no Google Docs
    const response = await this.docs.documents.create({
      requestBody: {
        title: name,
      },
    });

    const documentId = response.data.documentId;

    // Adicionar conteúdo
    await this.addParagraph(documentId, content);

    // Mover para pasta se especificado
    if (folderId) {
      // TODO: Implementar movimentação de arquivo
    }

    return documentId;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Cria instância do Docs Service
 */
export async function createDocsService(accessToken: string): Promise<DocsService> {
  return new DocsService(accessToken);
}

/**
 * Placeholders comuns para relatórios clínicos
 */
export const CLINICAL_REPORT_PLACEHOLDERS = {
  // Dados do paciente
  PACIENTE_NOME: 'Nome completo do paciente',
  PACIENTE_CPF: 'CPF do paciente',
  PACIENTE_DATA_NASCIMENTO: 'Data de nascimento',
  PACIENTE_IDADE: 'Idade do paciente',
  PACIENTE_CONTATO: 'Telefone/WhatsApp',
  PACIENTE_EMAIL: 'E-mail',
  PACIENTE_ENDERECO: 'Endereço completo',

  // Dados clínicos
  DATA_AVALIACAO: 'Data da avaliação',
  QUEIXA_PRINCIPAL: 'Queixa principal do paciente',
  HISTORIA_DOENCA_ATUAL: 'História da doença atual',
  HISTORIA_PATOLOGICA_PRESENTA: 'História patológica pregressa',
  HISTORIA_FAMILIAR: 'História familiar',
  MEDICACOES_EM_USO: 'Medicações em uso',
  ALERGIAS: 'Alergias conhecidas',
  DIAGNOSTICO: 'Diagnóstico',
  PLANO_TRATAMENTO: 'Plano de tratamento',
  PROGNOSTICO: 'Prognóstico',
  OBSERVACOES: 'Observações adicionais',

  // Dados do terapeuta
  TERAPEUTA_NOME: 'Nome do terapeuta',
  TERAPEUTA_REGISTRO: 'Número de registro profissional',
  TERAPEUTA_ASSINATURA: 'Assinatura digital',
  TERAPEUTA_CONTATO: 'Contato do terapeuta',

  // Dados gerais
  DATA_RELATORIO: 'Data de emissão do relatório',
  HORA_RELATORIO: 'Hora de emissão do relatório',
  NOME_CLINICA: 'Nome da clínica',
  CNPJ_CLINICA: 'CNPJ da clínica',
  ENDERECO_CLINICA: 'Endereço da clínica',
};

/**
 * Placeholders para certificados
 */
export const CERTIFICATE_PLACEHOLDERS = {
  PACIENTE_NOME: 'Nome do paciente',
  PACIENTE_CPF: 'CPF do paciente',
  CERTIFICADO_TIPO: 'Tipo de certificado',
  PERIODO_INICIO: 'Data de início do período',
  PERIODO_FIM: 'Data de fim do período',
  TOTAL_SESSOES: 'Total de sessões realizadas',
  TERAPEUTA_NOME: 'Nome do terapeuta',
  TERAPEUTA_REGISTRO: 'Registro do terapeuta',
  DATA_EMISSAO: 'Data de emissão',
};

/**
 * Placeholders para declarações
 */
export const DECLARATION_PLACEHOLDERS = {
  PACIENTE_NOME: 'Nome do paciente',
  PACIENTE_CPF: 'CPF do paciente',
  DATA_ATENDIMENTO: 'Data do atendimento',
  HORARIO_ATENDIMENTO: 'Horário do atendimento',
  TIPO_ATENDIMENTO: 'Tipo de atendimento realizado',
  TERAPEUTA_NOME: 'Nome do terapeuta',
  TERAPEUTA_REGISTRO: 'Registro do terapeuta',
  DATA_EMISSAO: 'Data de emissão',
};
