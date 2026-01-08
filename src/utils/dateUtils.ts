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
