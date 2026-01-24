import { format, parseISO, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
}

export function formatMonthYear(date: Date | string): string {
  return formatDate(date, 'MMMM/yyyy');
}

export function formatISO(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function calculateAge(birthDate: Date | string): number {
  const d = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
  return differenceInYears(new Date(), d);
}

export function ageInMonths(birthDate: Date | string): number {
  const d = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
  return differenceInMonths(new Date(), d);
}

export function ageInDays(birthDate: Date | string): number {
  const d = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
  return differenceInDays(new Date(), d);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const days = differenceInDays(now, d);

  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
  return `${Math.floor(days / 365)} anos atrás`;
}
