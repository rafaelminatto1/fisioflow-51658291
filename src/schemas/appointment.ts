import { z } from "zod";

// Helper to handle time strings from Supabase (TIME columns come as strings)
const timeString = () => z.string().nullable().optional();

// Base Schema matching the core database fields
export const AppointmentSchema = z.object({
    id: z.string().uuid(),
    patient_id: z.string().uuid().nullable(),
    therapist_id: z.string().uuid().nullable(),

    // Legacy fields (keeping them optional or nullable as we transition)
    appointment_date: z.string().nullable().optional(),
    appointment_time: timeString(),

    // New Standard fields - Supabase returns DATE as string (YYYY-MM-DD)
    date: z.string().nullable().optional(),
    start_time: timeString(),
    end_time: timeString(),

    // Status can be various values, make it more permissive
    status: z.string().default('agendado'),
    payment_status: z.string().nullable().optional(),
    session_type: z.string().nullable().optional(),
    type: z.string().nullable().optional(),

    notes: z.string().nullable().optional(),
    room: z.string().nullable().optional(),

    // Joined fields - these might be null if relations don't exist
    patient: z.object({
        name: z.string().nullable().optional() // Aliased in query: patient:patients(name:full_name)
    }).nullable().optional(),

    professional: z.object({
        full_name: z.string().nullable().optional()
    }).nullable().optional(),

    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
}).passthrough(); // Allow additional fields from the database

export type AppointmentRow = z.infer<typeof AppointmentSchema>;

// Verified/Domain Object (what the UI expects)
export const VerifiedAppointmentSchema = AppointmentSchema.transform((data) => {
    // Logic to unify date/time
    let finalDate: Date;

    // 1. Try 'date' and 'start_time' columns
    if (data.date && data.start_time) {
        const timeStr = data.start_time;
        // Ensure date object is set to that time
        const d = new Date(data.date);
        const [hours, minutes] = timeStr.split(':').map(Number);
        d.setHours(hours || 0, minutes || 0, 0, 0);
        finalDate = d;
    }
    // 2. Fallback to legacy 'appointment_date' (string) and 'appointment_time'
    else if (data.appointment_date) {
        const dateStr = data.appointment_date;
        const timeStr = data.appointment_time || '00:00';
        finalDate = new Date(`${dateStr}T${timeStr}`);
    }
    // 3. Fallback to now (safe default)
    else {
        finalDate = new Date();
    }

    // If invalid, fallback to now
    if (isNaN(finalDate.getTime())) {
        finalDate = new Date();
    }

    return {
        ...data,
        // Add computed/renamed fields for UI convenience
        date: finalDate,
        patientName: data.patient?.name || 'Paciente sem nome',
        therapistName: data.professional?.full_name || 'Profissional não atribuído',
    };
});

export type VerifiedAppointment = z.infer<typeof VerifiedAppointmentSchema>;
