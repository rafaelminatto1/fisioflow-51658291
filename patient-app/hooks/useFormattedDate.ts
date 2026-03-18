/**
 * useFormattedDate Hook
 * Centralized date formatting with Portuguese locale support
 */

import { useMemo } from 'react';
import { format, formatRelative, isToday, isYesterday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface FormattedDateOptions {
  format?: 'full' | 'short' | 'time' | 'relative' | 'day-month' | 'datetime';
  style?: 'date' | 'time' | 'datetime';
}

export function useFormattedDate() {
  return useMemo(() => ({
    /**
     * Format a date according to the specified options
     */
    format: (date: Date | string, options: FormattedDateOptions = {}) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Data inválida';
      }

      switch (options.format) {
        case 'full':
          return format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
          
        case 'short':
          return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
          
        case 'time':
          return format(dateObj, 'HH:mm', { locale: ptBR });
          
        case 'datetime':
          return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          
        case 'relative':
          if (isToday(dateObj)) {
            return format(dateObj, "'Hoje às' HH:mm", { locale: ptBR });
          }
          if (isYesterday(dateObj)) {
            return format(dateObj, "'Ontem às' HH:mm", { locale: ptBR });
          }
          if (isTomorrow(dateObj)) {
            return format(dateObj, "'Amanhã às' HH:mm", { locale: ptBR });
          }
          return formatRelative(dateObj, new Date(), { locale: ptBR });
          
        case 'day-month':
          return format(dateObj, "d 'de' MMMM", { locale: ptBR });
          
        default:
          return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
      }
    },

    /**
     * Format time only
     */
    formatTime: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'HH:mm', { locale: ptBR });
    },

    /**
     * Get relative date string (Hoje, Amanhã, etc)
     */
    getRelativeDay: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isToday(dateObj)) return 'Hoje';
      if (isYesterday(dateObj)) return 'Ontem';
      if (isTomorrow(dateObj)) return 'Amanhã';
      
      return format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
    },

    /**
     * Format appointment date/time
     */
    formatAppointment: (date: Date | string, time: string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isToday(dateObj)) {
        return `Hoje às ${time}`;
      }
      if (isTomorrow(dateObj)) {
        return `Amanhã às ${time}`;
      }
      
      return format(dateObj, "dd 'de' MMMM 'às' HH:mm", { 
        locale: ptBR 
      }).replace('HH:mm', time);
    },

    /**
     * Get the first letter capitalized
     */
    capitalize: (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Format a range of dates
     */
    formatDateRange: (start: Date | string, end: Date | string) => {
      const startDate = typeof start === 'string' ? new Date(start) : start;
      const endDate = typeof end === 'string' ? new Date(end) : end;
      
      const sameDay = startDate.toDateString() === endDate.toDateString();
      
      if (sameDay) {
        return format(startDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
      
      const sameMonth = startDate.getMonth() === endDate.getMonth() &&
                       startDate.getFullYear() === endDate.getFullYear();
      
      if (sameMonth) {
        return `${startDate.getDate()} a ${format(endDate, "d 'de' MMMM", { locale: ptBR })}`;
      }
      
      return `${format(startDate, "d 'de' MMMM", { locale: ptBR })} a ${format(endDate, "d 'de' MMMM", { locale: ptBR })}`;
    },
  }), []);
}

export default useFormattedDate;
