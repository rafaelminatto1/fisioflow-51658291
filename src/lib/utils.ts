import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fisioLogger as logger } from '@/lib/errors/logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const calculateAge = (birthDate?: string | null): number => {
  if (!birthDate) return 0;
  try {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  } catch {
    return 0;
  }
};

export const exportToCSV = (data: Record<string, unknown>[], filename: string, headers: string[]) => {
  try {
    const csvContent = [
      headers.join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (error) {
    logger.error('Export error', error, 'utils');
    return false;
  }
};

/**
 * Funções utilitárias para mascarar dados sensíveis em logs (LGPD)
 * Estas funções garantem que informações sensíveis não sejam expostas em logs
 */

/**
 * Mascarar email mantendo apenas o primeiro caractere do usuário e o domínio
 * Exemplo: joao.silva@empresa.com -> j***@empresa.com
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '***';
  try {
    const [username, domain] = email.split('@');
    if (!domain) return '***';
    const maskedUsername = username.substring(0, 3) + '***';
    return `${maskedUsername}@${domain}`;
  } catch {
    return '***';
  }
}

/**
 * Mascarar CPF mantendo apenas os primeiros 3 dígitos
 * Exemplo: 123.456.789-00 -> 123.***.***-**
 */
export function maskCPF(cpf?: string | null): string {
  if (!cpf) return '***.***.***-**';
  try {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length < 3) return '***.***.***-**';
    const firstThree = cleaned.substring(0, 3);
    return `${firstThree}.***.***-**`;
  } catch {
    return '***.***.***-**';
  }
}

/**
 * Mascarar telefone mantendo apenas os últimos 4 dígitos
 * Exemplo: (11) 98765-4321 -> (...)-4321
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '(...) ****-****';
  try {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '(...) ****-****';
    const lastFour = cleaned.substring(cleaned.length - 4);
    return `(...)-${lastFour}`;
  } catch {
    return '(...) ****-****';
  }
}

/**
 * Mascarar nome mantendo apenas o primeiro nome
 * Exemplo: João Silva Santos -> João
 */
export function maskName(name?: string | null): string {
  if (!name) return '***';
  try {
    const firstName = name.trim().split(' ')[0];
    return firstName;
  } catch {
    return '***';
  }
}

/**
 * Mascarar token/ID mantendo apenas os primeiros 8 caracteres
 * Exemplo: abc123def456 -> abc123de...
 */
export function maskToken(token?: string | null): string {
  if (!token) return '***';
  try {
    if (token.length <= 8) return token.substring(0, 4) + '...';
    return token.substring(0, 8) + '...';
  } catch {
    return '***';
  }
}

/**
 * Mascarar UID mantendo apenas os primeiros 8 caracteres
 */
export function maskUID(uid?: string | null): string {
  return maskToken(uid);
}