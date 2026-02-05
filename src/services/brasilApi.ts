import axios from 'axios';

const api = axios.create({
  baseURL: 'https://brasilapi.com.br/api',
});

export interface CepData {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
}

export interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
}

export const BrasilService = {
  /**
   * Busca endereço por CEP
   */
  getCep: async (cep: string): Promise<CepData> => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) throw new Error('CEP inválido');
    
    const { data } = await api.get<CepData>(`/cep/v2/${cleanCep}`);
    return data;
  },

  /**
   * Busca dados de empresa por CNPJ
   */
  getCnpj: async (cnpj: string): Promise<CnpjData> => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) throw new Error('CNPJ inválido');

    const { data } = await api.get<CnpjData>(`/cnpj/v1/${cleanCnpj}`);
    return data;
  },

  /**
   * Lista feriados nacionais de um ano
   */
  getHolidays: async (year: number) => {
    const { data } = await api.get(`/feriados/v1/${year}`);
    return data;
  }
};
