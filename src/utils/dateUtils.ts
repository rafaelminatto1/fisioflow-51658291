/**
 * Utilitários para formatação de datas locais
 * 
 * Evita problemas de timezone usando Date local em vez de UTC.
 * Use estas funções em vez de date-fns format() quando precisar
 * enviar datas para o backend no formato YYYY-MM-DD.
 */

/**
 * Formata uma data para o formato ISO local (YYYY-MM-DD)
 * sem conversão para UTC.
 * 
 * @example
 * const date = new Date('2026-01-08T10:00:00'); 
 * formatDateToLocalISO(date) // "2026-01-08"
 */
export function formatDateToLocalISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 * sem conversão para UTC.
 * 
 * @example
 * const date = new Date('2026-01-08T10:00:00');
 * formatDateToBrazilian(date) // "08/01/2026"
 */
export function formatDateToBrazilian(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
}

/**
 * Formata data e hora para exibição no formato brasileiro
 * 
 * @example
 * const date = new Date('2026-01-08T14:30:00');
 * formatDateTimeToBrazilian(date) // "08/01/2026 às 14:30"
 */
export function formatDateTimeToBrazilian(date: Date, time?: string): string {
    const dateStr = formatDateToBrazilian(date);
    if (time) {
        return `${dateStr} às ${time}`;
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateStr} às ${hours}:${minutes}`;
}

/**
 * Extrai componentes de data de forma segura (sem problemas de timezone)
 * 
 * @example
 * const date = new Date('2026-01-08T10:00:00');
 * getLocalDateParts(date) // { year: 2026, month: 1, day: 8 }
 */
export function getLocalDateParts(date: Date): { year: number; month: number; day: number } {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
    };
}

/**
 * Cria uma nova Date a partir do formato YYYY-MM-DD
 * interpretando como hora local (não UTC)
 * 
 * @example
 * const date = parseDateFromLocalISO('2026-01-08');
 * date.getDate() // 8 (não 7 por causa de timezone)
 */
export function parseDateFromLocalISO(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Verifica se duas datas são o mesmo dia (ignorando hora)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

/**
 * Retorna o início do dia (00:00:00) para uma data
 */
export function startOfDayLocal(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Retorna o fim do dia (23:59:59) para uma data
 */
export function endOfDayLocal(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Formata hora no formato HH:MM
 */
export function formatTime(hours: number, minutes: number): string {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Parse de string de hora HH:MM para objeto
 */
export function parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Parse seguro de string de data do backend para Date local.
 *
 * Evita problemas de timezone quando o backend retorna datas no formato
 * "YYYY-MM-DD" (sem timezone), que o JavaScript interpretaria como UTC.
 *
 * Usa meio-dia (12:00) como horário padrão para evitar problemas de transição
 * de horário de verão (DST).
 *
 * @param dateStr - String de data do backend ("YYYY-MM-DD", ISO string, ou null/undefined)
 * @returns Date object no horário local
 *
 * @example
 * parseResponseDate("2026-02-10")  // Date(2026, 1, 10, 12, 0, 0) - meio-dia local
 * parseResponseDate("2026-02-10T14:30:00Z")  // Preserva timestamp ISO completo
 * parseResponseDate(null)  // Date atual
 * parseResponseDate(undefined)  // Date atual
 */
export function parseResponseDate(dateStr: string | null | undefined): Date {
    if (!dateStr) {
        return new Date();
    }

    // Se é um timestamp ISO completo com timezone, usar new Date diretamente
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+') || dateStr.match(/-\d{2}:\d{2}$/))) {
        return new Date(dateStr);
    }

    // Se é apenas a data (YYYY-MM-DD), parsear como local
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        // Validação básica
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) &&
            year >= 2000 && year <= 2100 &&
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31) {
            // Usar meio-dia para evitar problemas de DST
            return new Date(year, month - 1, day, 12, 0, 0);
        }
    }

    // Fallback para new Date (pode causar problemas de timezone, mas é melhor que nada)
    return new Date(dateStr);
}

/**
 * Parse seguro de string de data do backend para Date local,
 * retornando null em vez de Date atual para valores vazios.
 *
 * Útil quando queremos distinguir entre "sem data" e "data atual".
 *
 * @param dateStr - String de data do backend ("YYYY-MM-DD", ISO string, ou null/undefined)
 * @returns Date object no horário local ou null
 */
export function parseResponseDateOrNull(dateStr: string | null | undefined): Date | null {
    if (!dateStr) {
        return null;
    }

    // Se é um timestamp ISO completo com timezone, usar new Date diretamente
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+') || dateStr.match(/-\d{2}:\d{2}$/))) {
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Se é apenas a data (YYYY-MM-DD), parsear como local
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        // Validação básica
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) &&
            year >= 2000 && year <= 2100 &&
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31) {
            // Usar meio-dia para evitar problemas de DST
            return new Date(year, month - 1, day, 12, 0, 0);
        }
    }

    // Fallback
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}
