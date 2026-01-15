/**
 * Utilitários para formatação de inputs (CPF, telefone, etc)
 */

import { cleanCPF, cleanPhone } from '@/lib/validations';

/**
 * Formata CPF com máscara: 000.000.000-00
 * @param value - Valor a ser formatado (aceita string, null ou undefined)
 * @returns String formatada ou string vazia se input inválido
 * @example
 * formatCPF('12345678901') // '123.456.789-01'
 * formatCPF('123.456.789-01') // '123.456.789-01'
 * formatCPF('') // ''
 */
export const formatCPF = (value: string | null | undefined): string => {
  if (!value || typeof value !== 'string') return '';

  const cleaned = cleanCPF(value);

  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  } else if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  } else {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  }
};

/**
 * Formata telefone com máscara: (00) 00000-0000 ou (00) 0000-0000
 * @param value - Valor a ser formatado (aceita string, null ou undefined)
 * @returns String formatada ou string vazia se input inválido
 * @example
 * formatPhoneInput('11987654321') // '(11) 98765-4321'
 * formatPhoneInput('1134567890') // '(11) 3456-7890'
 * formatPhoneInput('') // ''
 */
export const formatPhoneInput = (value: string | null | undefined): string => {
  if (!value || typeof value !== 'string') return '';

  const cleaned = cleanPhone(value);

  if (cleaned.length <= 2) {
    return cleaned.length > 0 ? `(${cleaned}` : '';
  } else if (cleaned.length <= 7) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  } else if (cleaned.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else {
    // Celular: (00) 00000-0000
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }
};

/**
 * Formata CEP com máscara: 00000-000
 * @param value - Valor a ser formatado (aceita string, null ou undefined)
 * @returns String formatada ou string vazia se input inválido
 * @example
 * formatCEP('01234567') // '01234-567'
 * formatCEP('01234-567') // '01234-567'
 * formatCEP('') // ''
 */
export const formatCEP = (value: string | null | undefined): string => {
  if (!value || typeof value !== 'string') return '';

  // Remove tudo que não é dígito
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 5) {
    return cleaned;
  } else {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  }
};
