/**
 * Validation Utilities
 * Reusable validation functions and helpers
 */

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length > 5 && email.length < 254;
}

/**
 * Password strength validation
 * Returns: 0 (weak), 1 (fair), 2 (good), 3 (strong), 4 (very strong)
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (password.length === 0) {
    return { score: 0, label: '', color: '' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexity checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  score += varietyCount;

  // Normalize score to 0-4
  const normalizedScore = Math.min(score, 4);

  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const colors = ['', '#EF4444', '#F59E0B', '#22C55E', '#15803D'];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    color: colors[normalizedScore],
  };
}

/**
 * Validate Brazilian phone number
 */
export function isValidPhone(phone: string): boolean {
  // Remove non-digits
  const cleanPhone = phone.replace(/\D/g, '');

  // Brazilian phone: 10 or 11 digits (with DDD)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

/**
 * Format Brazilian phone number
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length === 11) {
    // (XX) XXXXX-XXXX
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
  } else if (cleanPhone.length === 10) {
    // (XX) XXXX-XXXX
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
  }

  return phone;
}

/**
 * Validate CPF (Brazilian ID)
 */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11 || /^(\d)\1+$/.test(cleanCPF)) {
    return false;
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(i, i + 1))) {
      return false;
    }
  }

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(i, i + 1))) {
      return false;
    }
  }

  return true;
}

/**
 * Format CPF
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length === 11) {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9)}`;
  }

  return cpf;
}

/**
 * Validate name (at least 2 words, 2+ chars each)
 */
export function isValidName(name: string): boolean {
  const trimmedName = name.trim();
  const parts = trimmedName.split(/\s+/);

  return (
    parts.length >= 2 &&
    parts.every(part => part.length >= 2)
  );
}

/**
 * Validate date of birth (must be 13+ years old)
 */
export function isValidDateOfBirth(dateOfBirth: Date): boolean {
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  const maxDate = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());

  return dateOfBirth >= minDate && dateOfBirth <= maxDate;
}

/**
 * Validation error messages in Portuguese
 */
export const ValidationErrors = {
  email: 'Email inválido',
  emailRequired: 'Email é obrigatório',
  passwordRequired: 'Senha é obrigatória',
  passwordTooShort: 'Senha deve ter pelo menos 8 caracteres',
  passwordWeak: 'Senha muito fraca, tente adicionar números, letras maiúsculas e símbolos',
  nameRequired: 'Nome é obrigatório',
  nameTooShort: 'Nome deve ter pelo menos 2 palavras com 2+ caracteres cada',
  phoneRequired: 'Telefone é obrigatório',
  phoneInvalid: 'Telefone inválido (formato: (XX) XXXXX-XXXX)',
  cpfInvalid: 'CPF inválido',
  dateRequired: 'Data de nascimento é obrigatória',
  dateInvalid: 'Data de nascimento inválida',
  dateTooYoung: 'Você deve ter pelo menos 13 anos para usar o app',
  codeRequired: 'Código do profissional é obrigatório',
  codeInvalid: 'Código inválido',
  codeExpired: 'Código expirado',
  codeAlreadyUsed: 'Código já utilizado',
  general: 'Ocorreu um erro. Tente novamente.',
};

/**
 * Form field validators
 */
export const validators = {
  email: (value: string) => {
    if (!value?.trim()) return ValidationErrors.emailRequired;
    if (!isValidEmail(value)) return ValidationErrors.email;
    return null;
  },
  password: (value: string) => {
    if (!value) return ValidationErrors.passwordRequired;
    if (value.length < 8) return ValidationErrors.passwordTooShort;
    const strength = getPasswordStrength(value);
    if (strength.score < 2) return ValidationErrors.passwordWeak;
    return null;
  },
  name: (value: string) => {
    if (!value?.trim()) return ValidationErrors.nameRequired;
    if (!isValidName(value)) return ValidationErrors.nameTooShort;
    return null;
  },
  phone: (value: string) => {
    if (!value?.trim()) return ValidationErrors.phoneRequired;
    if (!isValidPhone(value)) return ValidationErrors.phoneInvalid;
    return null;
  },
  cpf: (value: string) => {
    if (!value?.trim()) return null; // CPF is optional
    if (!isValidCPF(value)) return ValidationErrors.cpfInvalid;
    return null;
  },
};

/**
 * Get password requirements for UI display
 */
export function getPasswordRequirements(): {
  label: string;
  met: boolean;
}[] {
  return [
    { label: 'Pelo menos 8 caracteres', met: false },
    { label: 'Letras maiúsculas e minúsculas', met: false },
    { label: 'Pelo menos um número', met: false },
    { label: 'Caracteres especiais (!@#$%)', met: false },
  ];
}

/**
 * Check password requirements
 */
export function checkPasswordRequirements(password: string): {
  label: string;
  met: boolean;
}[] {
  return [
    { label: 'Pelo menos 8 caracteres', met: password.length >= 8 },
    { label: 'Letras maiúsculas e minúsculas', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'Pelo menos um número', met: /[0-9]/.test(password) },
    { label: 'Caracteres especiais (!@#$%)', met: /[^a-zA-Z0-9]/.test(password) },
  ];
}
