/**
 * Formatter Utilities
 * Consistent formatting functions for dates, numbers, strings, etc.
 */

import { format, formatDistanceToNow, differenceInDays, differenceInMonths, differenceInYears, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Date formatting functions
 */
export const DateFormatter = {
  /**
   * Format date as "dd/MM/yyyy"
   */
  short(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'dd/MM/yyyy');
  },

  /**
   * Format date as "dd/MM/yyyy às HH:mm"
   */
  withTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  },

  /**
   * Format date as "EEEE, d 'de' MMMM"
   */
  weekday(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
  },

  /**
   * Format date as "EEEE, d 'de' MMMM 'de' yyyy"
   */
  full(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  },

  /**
   * Format date as relative time ("há 2 horas", "daqui a 3 dias")
   */
  relative(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
  },

  /**
   * Get friendly relative date ("Hoje", "Amanhã", "Ontem", or formatted date)
   */
  friendly(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Hoje';
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    return this.short(d);
  },

  /**
   * Get time in format "HH:mm"
   */
  time(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'HH:mm');
  },

  /**
   * Get friendly duration between two dates
   */
  duration(start: Date | string, end: Date | string): string {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;

    const days = differenceInDays(e, s);
    const months = differenceInMonths(e, s);
    const years = differenceInYears(e, s);

    if (years > 0) {
      return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
    if (months > 0) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    if (days > 0) {
      return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    return 'menos de um dia';
  },

  /**
   * Check if date is today
   */
  isToday(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },

  /**
   * Check if date is in the past
   */
  isPast(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d < new Date();
  },
};

/**
 * Number formatting functions
 */
export const NumberFormatter = {
  /**
   * Format number with thousands separator
   */
  format(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  /**
   * Format number as percentage
   */
  percentage(num: number, decimals: number = 0): string {
    return `${(num * 100).toFixed(decimals)}%`;
  },

  /**
   * Format number as currency (BRL)
   */
  currency(num: number): string {
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  },

  /**
   * Format number with decimal places
   */
  decimal(num: number, decimals: number = 2): string {
    return num.toFixed(decimals).replace('.', ',');
  },
};

/**
 * String formatting functions
 */
export const StringFormatter = {
  /**
   * Capitalize first letter
   */
  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Capitalize all words
   */
  titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  },

  /**
   * Truncate string with ellipsis
   */
  truncate(str: string, maxLength: number = 50): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  },

  /**
   * Get initials from name
   */
  initials(name: string, maxInitials: number = 2): string {
    const parts = name.trim().split(/\s+/);
    const initials = parts.map(part => part.charAt(0).toUpperCase());
    return initials.slice(0, maxInitials).join('');
  },

  /**
   * Format CPF (XXX.XXX.XXX-XX)
   */
  cpf(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  },

  /**
   * Format phone number ((XX) XXXXX-XXXX)
   */
  phone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  },

  /**
   * Format CEP (XXXXX-XXX)
   */
  cep(cep: string): string {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return cep;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  },
};

/**
 * Exercise formatting functions
 */
export const ExerciseFormatter = {
  /**
   * Format exercise details (sets x reps)
   */
  details(sets: number, reps: number, holdTime?: number, restTime?: number): string {
    let result = `${sets} ${sets === 1 ? 'série' : 'séries'} × ${reps} reps`;
    if (holdTime) {
      result += ` • ${holdTime}s descenso`;
    }
    if (restTime) {
      result += ` • ${restTime}s descanso`;
    }
    return result;
  },

  /**
   * Get exercise difficulty label
   */
  difficultyLabel(level: number): string {
    const labels: Record<number, string> = {
      1: 'Muito Fácil',
      2: 'Fácil',
      3: 'Médio',
      4: 'Difícil',
      5: 'Muito Difícil',
    };
    return labels[level] || 'N/A';
  },

  /**
   * Get pain level label
   */
  painLabel(level: number): string {
    if (level === 0) return 'Sem dor';
    if (level <= 3) return 'Dor leve';
    if (level <= 6) return 'Dor moderada';
    if (level <= 8) return 'Dor forte';
    return 'Dor intensa';
  },

  /**
   * Get pain level color
   */
  painColor(level: number): string {
    if (level <= 3) return '#22C55E'; // green
    if (level <= 6) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  },
};

/**
 * Duration formatting functions
 */
export const DurationFormatter = {
  /**
   * Format seconds as human-readable duration
   */
  seconds(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  },

  /**
   * Format minutes as human-readable duration
   */
  minutes(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  },
};
