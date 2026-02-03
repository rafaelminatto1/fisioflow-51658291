/**
 * @file Schema de validação e transformação de agendamentos
 *
 * IMPORTANTE - Problema de Fuso Horário:
 * Quando usamos new Date("2026-01-13"), o JavaScript interpreta como UTC meia-noite.
 * Para Brasil (UTC-3 ou UTC-2 no horário de verão), isso se torna 2026-01-12 21:00 ou 22:00.
 * Isso causa agendamentos a aparecerem no dia anterior na interface.
 *
 * Solução: parsear manualmente a string YYYY-MM-DD e criar o Date usando componentes locais.
 */

import { z } from "zod";

// ============================================================================
// CONSTANTES E UTILITÁRIOS
// ============================================================================

/** Regex para validação de formato de hora (HH:MM ou HH:MM:SS) */
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/** Limites razoáveis para validação de datas */
const DATE_LIMITS = {
    MIN_YEAR: 2000,
    MAX_YEAR: 2100,
} as const;

/** Valor padrão para quando não há terapeuta atribuído */
const DEFAULT_PATIENT_NAME = 'Paciente sem nome';

// ============================================================================
// PARSING DE DATAS E HORÁRIOS
// ============================================================================

/**
 * Parseia uma string de data no formato YYYY-MM-DD para um objeto Date local.
 * Evita problemas de fuso horário usando componentes de data locais.
 *
 * @param dateStr - String de data no formato YYYY-MM-DD
 * @returns Objeto Date na hora local (meio-dia) ou null se inválido
 */
function parseLocalDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }

    // Remove UTC timestamp suffix (T00:00:00.000Z) - backend returns ISO dates with UTC
    // Ex: "2026-02-06T00:00:00.000Z" → "2026-02-06"
    const normalizedDateStr = dateStr.replace(/T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, '');

    const parts = normalizedDateStr.split('-');
    if (parts.length !== 3) {
        return null;
    }

    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    // Validações de intervalo
    if (
        isNaN(year) || isNaN(month) || isNaN(day) ||
        year < DATE_LIMITS.MIN_YEAR ||
        year > DATE_LIMITS.MAX_YEAR ||
        month < 1 || month > 12 ||
        day < 1 || day > 31
    ) {
        return null;
    }

    // Criar data usando componentes locais (não UTC)
    // Usar meio-dia (12:00) evita problemas com transição de horário de verão
    return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Parseia uma string de hora no formato HH:MM ou HH:MM:SS.
 *
 * @param timeStr - String de hora ou null/undefined
 * @returns Objeto com hours e minutes, ou {0, 0} se vazio, ou null se inválido
 */
function parseTime(timeStr: string | null | undefined): { hours: number; minutes: number } | null {
    // Retornar meia-noite se não há hora
    if (!timeStr) {
        return { hours: 0, minutes: 0 };
    }

    const match = timeStr.match(TIME_REGEX);
    if (!match) {
        return null;
    }

    return {
        hours: Number(match[1]),
        minutes: Number(match[2]),
    };
}

/**
 * Combina uma data base com um horário, retornando um objeto Date completo.
 *
 * @param baseDate - Data base (geralmente meio-dia do dia do agendamento)
 * @param timeStr - String de horário no formato HH:MM
 * @returns Data com horário aplicado, ou null se inválido
 */
function combineDateTime(baseDate: Date, timeStr: string | null | undefined): Date | null {
    const parsedTime = parseTime(timeStr);
    if (!parsedTime) {
        return null;
    }

    const result = new Date(baseDate);
    result.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    return result;
}

// ============================================================================
// HELPERS DE STRINGS
// ============================================================================

/**
 * Helper do Zod para campos de hora do Supabase (TIME columns come as strings)
 */
const timeString = () => z.string().nullable().optional();

/**
 * Extrai o nome do paciente do objeto retornado pelo join com a tabela patients.
 *
 * @param patient - Objeto patient da query ou null
 * @returns Nome do paciente ou valor padrão
 */
function getPatientName(
    patient: { full_name?: string | null } | null | undefined
): string {
    if (!patient?.full_name) {
        return DEFAULT_PATIENT_NAME;
    }
    const trimmed = patient.full_name.trim();
    return trimmed || DEFAULT_PATIENT_NAME;
}

/**
 * Extrai o nome do terapeuta do objeto retornado pelo join com a tabela profiles.
 *
 * @param professional - Objeto professional da query ou null
 * @returns Nome do terapeuta ou null se não atribuído
 */
function getTherapistName(
    professional: { full_name?: string | null } | null | undefined
): string | null {
    if (!professional?.full_name) {
        return null;
    }
    const trimmed = professional.full_name.trim();
    return trimmed || null;
}

// ============================================================================
// SCHEMA ZOD
// ============================================================================

/**
 * Schema base correspondente à estrutura do banco de dados.
 * Inclui campos novos e legados para compatibilidade durante migração.
 */
/** Aceita UUID ou Firebase Auth UID (profiles.user_id pode não ser UUID) */
const idOrUid = () => z.string().min(1).nullable();

export const AppointmentSchema = z.object({
    // Identificadores
    id: z.string().uuid(),
    patient_id: z.string().uuid().nullable(),
    therapist_id: idOrUid(),
    organization_id: z.string().min(1).optional().nullable(),

    // Campos legados (mantidos para compatibilidade durante transição)
    appointment_date: z.string().nullable().optional(),
    appointment_time: timeString(),

    // Campos padrão (Supabase retorna DATE como string "YYYY-MM-DD")
    date: z.string().nullable().optional(),
    start_time: timeString(),
    end_time: timeString(),

    // Dados do agendamento
    status: z.string().default('agendado'),
    payment_status: z.string().nullable().optional(),
    session_type: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),

    // Campos adicionais
    notes: z.string().nullable().optional(),
    room: z.string().nullable().optional(),

    // Campos de join (retornados pelo Supabase)
    patient: z.object({
        full_name: z.string().nullable().optional(),
    }).nullable().optional(),

    professional: z.object({
        full_name: z.string().nullable().optional(),
    }).nullable().optional(),

    // Timestamps
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
}).passthrough(); // Permitir campos adicionais do banco

export type AppointmentRow = z.infer<typeof AppointmentSchema>;

// ============================================================================
// SCHEMA TRANSFORMADO (DOMÍNIO)
// ============================================================================

/**
 * Schema transformado que converte dados brutos do banco em objetos
 * prontos para uso na UI, com datas corretamente parseadas e campos computados.
 */
export const VerifiedAppointmentSchema = AppointmentSchema.transform((data) => {
    // Determinar fonte de data (prioridade: campo novo > legado)
    const dateSource = data.date || data.appointment_date;
    const timeSource = data.start_time || data.appointment_time;

    // Parse da data base (meio-dia do dia do agendamento)
    let finalDate: Date;

    if (dateSource) {
        const parsedDate = parseLocalDate(dateSource);

        if (parsedDate && !isNaN(parsedDate.getTime())) {
            // Aplicar horário se disponível
            const withTime = combineDateTime(parsedDate, timeSource);
            finalDate = withTime && !isNaN(withTime.getTime())
                ? withTime
                : parsedDate;
        } else {
            // Parse falhou - log mas não quebra, retorna data atual com warning
            console.warn(`[appointment schema] Invalid date format: ${dateSource}, using today as fallback`);
            finalDate = new Date();
        }
    } else {
        // Sem data disponível - usar data atual com warning
        console.warn(`[appointment schema] Date field is missing or null, using today as fallback`);
        finalDate = new Date();
    }

    // Validação final da data
    if (isNaN(finalDate.getTime())) {
        console.warn(`[appointment schema] Parsed date is invalid: ${dateSource}, using today as fallback`);
        finalDate = new Date();
    }

    return {
        ...data,
        // Substituir a string de data por objeto Date parseado
        date: finalDate,
        // Campos computados para conveniência da UI
        patientName: getPatientName(data.patient),
        therapistName: getTherapistName(data.professional),
    };
});

export type VerifiedAppointment = z.infer<typeof VerifiedAppointmentSchema>;
