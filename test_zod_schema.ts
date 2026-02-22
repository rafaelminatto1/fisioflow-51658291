import { z } from 'zod';

const idOrUid = () => z.string().min(1).nullable();
const timeString = () => z.string().nullable().optional();
const DEFAULT_PATIENT_NAME = 'Paciente sem nome';

function getPatientName(
    patient: { full_name?: string | null } | null | undefined
): string {
    if (!patient?.full_name) {
        return DEFAULT_PATIENT_NAME;
    }
    const trimmed = patient.full_name.trim();
    return trimmed || DEFAULT_PATIENT_NAME;
}

function getTherapistName(
    professional: { full_name?: string | null } | null | undefined
): string | null {
    if (!professional?.full_name) {
        return null;
    }
    const trimmed = professional.full_name.trim();
    return trimmed || null;
}

function parseLocalDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const normalizedDateStr = dateStr.replace(/T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, '');
    const parts = normalizedDateStr.split('-');
    if (parts.length !== 3) return null;
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    return new Date(year, month - 1, day, 12, 0, 0);
}

function parseTime(timeStr: string | null | undefined): { hours: number; minutes: number } | null {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) return null;
    return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function combineDateTime(baseDate: Date, timeStr: string | null | undefined): Date | null {
    const parsedTime = parseTime(timeStr);
    if (!parsedTime) return null;
    const result = new Date(baseDate);
    result.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    return result;
}

const AppointmentSchema = z.object({
    id: idOrUid(),
    patient_id: idOrUid(),
    therapist_id: idOrUid(),
    organization_id: z.string().min(1).optional().nullable(),
    appointment_date: z.string().nullable().optional(),
    appointment_time: timeString(),
    date: z.string().nullable().optional(),
    start_time: timeString(),
    end_time: timeString(),
    status: z.string().default('agendado'),
    payment_status: z.string().nullable().optional(),
    session_type: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    room: z.string().nullable().optional(),
    patient: z.object({
        full_name: z.string().nullable().optional(),
    }).nullable().optional(),
    professional: z.object({
        full_name: z.string().nullable().optional(),
    }).nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
}).passthrough();

const VerifiedAppointmentSchema = AppointmentSchema.transform((data) => {
    const dateSource = data.date || data.appointment_date;
    const timeSource = data.start_time || data.appointment_time;
    let finalDate: Date;

    if (dateSource) {
        const parsedDate = parseLocalDate(dateSource);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
            const withTime = combineDateTime(parsedDate, timeSource);
            finalDate = withTime && !isNaN(withTime.getTime()) ? withTime : parsedDate;
        } else {
            console.warn('Invalid date format, using today as fallback', { dateSource }, 'appointment-schema');
            finalDate = new Date();
        }
    } else {
        console.warn('Date field is missing or null, using today as fallback', undefined, 'appointment-schema');
        finalDate = new Date();
    }

    if (isNaN(finalDate.getTime())) {
        console.warn('Parsed date is invalid, using today as fallback', { dateSource }, 'appointment-schema');
        finalDate = new Date();
    }

    return {
        ...data,
        date: finalDate,
        patientName: getPatientName(data.patient),
        therapistName: getTherapistName(data.professional),
    };
});

const apiResponseItem = {
    "id": "ff157986-a83e-4868-908b-a8e0437b0042",
    "patient_id": "c653f8c4-1302-4b25-aaa7-1ee95a5b7b43",
    "therapist_id": "sj9b11xOjPT8Q34pPHBMUIPzvQQ2",
    "date": "2026-02-16T00:00:00.000Z",
    "start_time": "07:00:00",
    "end_time": "08:00:00",
    "status": "agendado",
    "session_type": "grupo",
    "notes": null,
    "cancellation_reason": null,
    "organization_id": "11111111-1111-1111-1111-111111111111",
    "cancelled_at": null,
    "cancelled_by": null,
    "created_at": "2026-02-19T03:57:45.961Z",
    "updated_at": "2026-02-19T03:57:45.961Z",
    "created_by": "sj9b11xOjPT8Q34pPHBMUIPzvQQ2",
    "patient_name": "Amanda Hitomi Notoya Minatto",
    "patient_phone": "11971108928",
    "therapist_name": "Rafael Minatto"
};

const itemToValidate = {
    ...apiResponseItem,
    patient: {
        id: apiResponseItem.patient_id,
        full_name: apiResponseItem.patient_name || 'Desconhecido',
        phone: apiResponseItem.patient_phone,
    },
    professional: {
        full_name: apiResponseItem.therapist_name
    }
};

const validation = VerifiedAppointmentSchema.safeParse(itemToValidate);
if (!validation.success) {
    console.log("Validation failed:");
    console.log(JSON.stringify(validation.error.format(), null, 2));
} else {
    console.log("Validation successful:");
    console.log(validation.data.date);
}
