export function formatPhone(value: string): string {
  // Remove tudo que não é dígito
  const cleaned = value.replace(/\D/g, '');

  // Celular com 9 dígitos (XX XXXXX-XXXX)
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  // Fixo com 8 dígitos (XX XXXX-XXXX)
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  // DDD + número incompleto
  if (cleaned.length > 2) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  }

  return cleaned;
}

export function parsePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function validatePhone(phone: string): boolean {
  const cleaned = parsePhone(phone);
  return cleaned.length === 10 || cleaned.length === 11;
}

export function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 3) {
    return cleaned;
  }
  if (cleaned.length <= 6) {
    return cleaned.replace(/(\d{3})(\d+)/, '$1.$2');
  }
  if (cleaned.length <= 9) {
    return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  }
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}
