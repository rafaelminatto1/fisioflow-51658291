/**
 * Validadores de dados comuns no Brasil
 */

/**
 * Converte uma string de data no formato brasileiro (DD/MM/YYYY) para um objeto Date
 * @param dateStr - String de data no formato DD/MM/YYYY
 * @returns Objeto Date ou null se inválido
 */
export function parseBrazilianDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  // Verificar formato DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const [dayStr, monthStr, yearStr] = parts;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  // Validações básicas
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return null;
  }

  // Criar Date usando mês-1 (Janeiro é 0 em JavaScript)
  const date = new Date(year, month - 1, day);

  // Verificar se a data é válida (ex: 31/02/2024 seria ajustado para 02/03/2024)
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCPF(cpf: string): string {
  const digits = stripNonDigits(cpf);
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const digits = stripNonDigits(phone);
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function isValidCPF(cpf: string): boolean {
  const digits = stripNonDigits(cpf);

  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  let weight = 10;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * weight;
    weight--;
  }

  let remainder = 11 - (sum % 11);
  const digit1 = remainder >= 10 ? 0 : remainder;

  if (digit1 !== parseInt(digits[9])) return false;

  sum = 0;
  weight = 11;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * weight;
    weight--;
  }

  remainder = 11 - (sum % 11);
  const digit2 = remainder >= 10 ? 0 : remainder;

  return digit2 === parseInt(digits[10]);
}

export function isValidPhone(phone: string): boolean {
  const digits = stripNonDigits(phone);
  if (digits.length === 10 || digits.length === 11) {
    const ddd = parseInt(digits.substring(0, 2));
    return ddd >= 11 && ddd <= 99;
  }
  return false;
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  const [local, domain] = email.split('@');
  if (!local || !domain || !domain.includes('.')) return false;

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) return false;

  return true;
}

export function sanitizeString(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function isValidName(name: string): boolean {
  if (!name || name.trim().length < 3) return false;

  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;

  const validParts = parts.filter(p => p.length >= 2);
  return validParts.length >= 2;
}
