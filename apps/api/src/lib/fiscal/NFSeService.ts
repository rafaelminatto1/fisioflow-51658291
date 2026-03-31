import type { Env } from '../../types/env';

export interface NFSeData {
  numero?: string;
  serie?: string;
  valor: number;
  dataEmissao: Date;
  destinatario: {
    cpf_cnpj: string;
    nome: string;
    email?: string;
    endereco?: any;
  };
  servico: {
    codigo: string;
    discriminacao: string;
    valor_iss?: number;
    aliquota_iss?: number;
  };
}

/**
 * NFSe Service (Integration with FocusNFe)
 */
export class NFSeService {
  private baseUrl = 'https://api.focusnfe.com.br/v2';

  constructor(private env: Env) {}

  private get authHeader() {
    return {
      'Authorization': `Basic ${btoa(this.env.FOCUS_NFE_TOKEN + ':')}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Emits a new NFSe (Draft/Authorized)
   */
  async emit(data: NFSeData) {
    if (!this.env.FOCUS_NFE_TOKEN) {
      // Mock for development if token is missing
      console.warn('[NFSe] FOCUS_NFE_TOKEN missing, returning mock');
      return {
        status: 'authorized',
        protocolo: 'MOCK-' + Math.random().toString(36).substring(7),
        url_pdf: 'https://example.com/mock-nfse.pdf',
      };
    }

    const isProduction = this.env.FOCUS_NFE_ENVIRONMENT === 'production';
    const endpoint = `${this.baseUrl}/nfse?ambiente=${isProduction ? '1' : '2'}`;

    const body = {
      data_emissao: data.dataEmissao.toISOString().split('T')[0],
      prestador: {
        cnpj: this.env.WHATSAPP_PHONE_NUMBER_ID, // Example: reuse some ID if needed or add new env
      },
      tomador: {
        cpf_cnpj: data.destinatario.cpf_cnpj,
        razao_social: data.destinatario.nome,
        email: data.destinatario.email,
      },
      servico: {
        aliquota: data.servico.aliquota_iss || 5, // Default 5%
        discriminacao: data.servico.discriminacao,
        iss_retido: false,
        item_lista_servico: data.servico.codigo,
        valor_servicos: data.valor,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.authHeader,
      body: JSON.stringify(body),
    });

    const result = await response.json() as any;
    if (!response.ok) {
      console.error('[NFSe Error]', result);
      throw new Error(result.mensagem || 'NFSe API error');
    }

    return result;
  }

  /**
   * Consults an NFSe status
   */
  async getStatus(id: string) {
    if (!this.env.FOCUS_NFE_TOKEN) return { status: 'authorized' };

    const response = await fetch(`${this.baseUrl}/nfse/${id}`, {
      method: 'GET',
      headers: this.authHeader,
    });

    return await response.json();
  }
}
