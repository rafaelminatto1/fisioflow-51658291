/**
 * Utilitários para formatação de inputs (CPF, telefone, etc)
 */

/**
 * Formata CPF com máscara: 000.000.000-00
 * @param value - Valor a ser formatado (aceita string, null ou undefined)
 * @returns String formatada ou string vazia se input inválido
 * @example
 * formatCPF('12345678901') // '123.456.789-01'
 * formatCPF('123.456.789-01') // '123.456.789-01'
 * formatCPF('') // ''
 */

const cleanInputDigits = (value: string): string => value.replace(/\D/g, "");

export const formatCPF = (value: string | null | undefined): string => {
  if (!value || typeof value !== "string") return "";

  const cleaned = cleanInputDigits(value);

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
  if (!value || typeof value !== "string") return "";

  const cleaned = cleanInputDigits(value);
  const hasBrazilCountryCode = cleaned.length > 11 && cleaned.startsWith("55");
  const localNumber = hasBrazilCountryCode ? cleaned.slice(2, 13) : cleaned.slice(0, 11);

  const formattedLocalPhone = formatLocalBrazilianPhone(localNumber);
  if (!formattedLocalPhone) return "";

  return hasBrazilCountryCode ? `+55 ${formattedLocalPhone}` : formattedLocalPhone;
};

const formatLocalBrazilianPhone = (cleaned: string): string => {
  if (!cleaned) return "";

  if (cleaned.length <= 2) {
    return cleaned.length > 0 ? `(${cleaned}` : "";
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

export interface PhoneFieldFormatHint {
  type?: string;
  inputMode?: string;
  autoComplete?: string;
  id?: string;
  name?: string;
  placeholder?: string | number | readonly string[];
}

const PHONE_FIELD_TOKENS = new Set([
  "phone",
  "telefone",
  "tel",
  "celular",
  "mobile",
  "whatsapp",
  "whats",
]);

const PHONE_FIELD_EXCLUDED_TOKENS = new Set([
  "link",
  "url",
  "search",
  "busca",
  "buscar",
  "filter",
  "filtro",
]);

export const shouldFormatPhoneField = ({
  type,
  inputMode,
  autoComplete,
  id,
  name,
  placeholder,
}: PhoneFieldFormatHint): boolean => {
  const normalizedType = type?.toLowerCase();
  if (["email", "password", "search", "url", "number"].includes(normalizedType ?? "")) {
    return false;
  }

  if (normalizedType === "tel" || inputMode?.toLowerCase() === "tel") {
    return true;
  }

  if (autoComplete?.toLowerCase().startsWith("tel")) {
    return true;
  }

  const fieldTokens = [...tokenizeFieldName(id), ...tokenizeFieldName(name)];
  if (fieldTokens.some((token) => PHONE_FIELD_EXCLUDED_TOKENS.has(token))) {
    return false;
  }

  if (fieldTokens.some((token) => PHONE_FIELD_TOKENS.has(token))) {
    return true;
  }

  if (typeof placeholder !== "string") return false;
  const placeholderTokens = tokenizeFieldName(placeholder);
  if (placeholderTokens.some((token) => PHONE_FIELD_EXCLUDED_TOKENS.has(token))) {
    return false;
  }

  return /\(\d{2}\)|\(00\)|\d{10,13}|9{4,5}-9{4}|0{4,5}-0{4}/.test(placeholder);
};

const tokenizeFieldName = (value: unknown): string[] => {
  if (typeof value !== "string") return [];

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
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
  if (!value || typeof value !== "string") return "";

  // Remove tudo que não é dígito
  const cleaned = value.replace(/\D/g, "");

  if (cleaned.length <= 5) {
    return cleaned;
  } else {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  }
};
