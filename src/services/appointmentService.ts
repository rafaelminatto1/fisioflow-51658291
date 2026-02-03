
import { appointmentsApi } from '@/integrations/firebase/functions';
import { AppointmentBase, AppointmentFormData, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { VerifiedAppointmentSchema } from '@/schemas/appointment';
import { dateSchema, timeSchema } from '@/lib/validations/agenda';
import { AppError } from '@/lib/errors/AppError';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { FinancialService } from '@/services/financialService';
import type { UnknownError } from '@/types/common';

// Type for appointment item from API
interface AppointmentApiItem {
  id: string;
  patient_id?: string;
  patient_name?: string;
  patient_phone?: string;
  therapist_id?: string;
  therapist_name?: string;
  date?: string;
  start_time?: string;
  appointment_time?: string;
  duration?: number;
  type?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  room?: string;
  payment_status?: string;
  payment_method?: string;
  payment_amount?: number;
  session_package_id?: string;
}

// Helper for time calculation
function calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + durationMinutes);
    return date.toTimeString().slice(0, 5);
}

export class AppointmentService {
    /**
     * Fetch all appointments for an organization
     */
    static async fetchAppointments(organizationId: string): Promise<AppointmentBase[]> {
        try {
            const response = await appointmentsApi.list({ limit: 1000 });
            const data = response.data || [];

            // Validar e transformar dados
            const validAppointments: AppointmentBase[] = [];
            const validationErrors: { id: string; error: unknown }[] = [];

            (data || []).forEach((item: AppointmentApiItem) => {
                const itemToValidate = {
                    ...item,
                    patient: {
                        id: item.patient_id,
                        full_name: item.patient_name || 'Desconhecido',
                        phone: item.patient_phone,
                    },
                    professional: {
                        full_name: item.therapist_name
                    }
                };

                const validation = VerifiedAppointmentSchema.safeParse(itemToValidate);

                if (validation.success) {
                    const validData = validation.data;
                    validAppointments.push({
                        id: validData.id,
                        patientId: validData.patient_id || '',
                        patientName: validData.patientName,
                        phone: item.patient_phone || '',
                        date: validData.date,
                        time: validData.start_time || validData.appointment_time || '00:00',
                        duration: validData.duration || 60,
                        type: (validData.type || 'Fisioterapia') as AppointmentType,
                        status: (validData.status || 'agendado') as AppointmentStatus,
                        notes: validData.notes || '',
                        createdAt: validData.created_at ? new Date(validData.created_at) : new Date(),
                        updatedAt: validData.updated_at ? new Date(validData.updated_at) : new Date(),
                        therapistId: validData.therapist_id,

                        room: validData.room,
                        payment_status: validData.payment_status || 'pending',
                        payment_method: item.payment_method,
                        payment_amount: item.payment_amount,
                        session_package_id: item.session_package_id,
                    });
                } else {
                    // Log detalhado do erro de validação para debug
                    // Dados sensíveis removidos: nome do paciente mascarado (LGPD)
                    const maskedName = item.patient_name ? item.patient_name.split(' ')[0] : '***';
                    logger.error(`Appointment validation failed for ID ${item.id}`, {
                        id: item.id,
                        patient_name: maskedName,
                        date: item.date,
                        start_time: item.start_time,
                        appointment_time: item.appointment_time,
                        validationError: validation.error?.issues || 'Unknown error'
                    }, 'AppointmentService');
                    validationErrors.push({ id: item.id, error: validation.error });
                }
            });

            if (validationErrors.length > 0) {
                logger.warn(`Ignorados ${validationErrors.length} agendamentos inválidos`, {}, 'AppointmentService');
            }

            return validAppointments;
        } catch (error: UnknownError) {
            throw AppError.from(error, 'AppointmentService.fetchAppointments');
        }
    }

    /**
     * Create a new appointment
     */
    static async createAppointment(
        data: AppointmentFormData,
        organizationId: string,
        existingAppointments: AppointmentBase[] = [] // Optional for conflict check
    ): Promise<AppointmentBase> {
        try {
            logger.info('Creating appointment', { data }, 'AppointmentService');

            // Conflict Check
            if (existingAppointments.length > 0) {
                checkAppointmentConflict({
                    date: new Date(data.appointment_date),
                    time: data.appointment_time,
                    duration: data.duration,
                    appointments: existingAppointments
                });
            }

            // Validation
            if (!data.patient_id) throw AppError.badRequest('ID do paciente é obrigatório');

            const rawDate = data.appointment_date || data.date || '';
            const rawTime = data.appointment_time || data.start_time || '';

            if (!rawDate) throw AppError.badRequest('Data é obrigatória');
            if (!rawTime) throw AppError.badRequest('Horário é obrigatório');

            const dateValidation = dateSchema.safeParse(rawDate);
            if (!dateValidation.success) throw AppError.badRequest(`Data inválida: ${rawDate}`);

            const timeValidation = timeSchema.safeParse(rawTime);
            if (!timeValidation.success) throw AppError.badRequest(`Horário inválido: ${rawTime}`);

            const endTime = calculateEndTime(rawTime, data.duration || 60);
            const sessionType = data.type === 'Fisioterapia' || data.type === 'fisioterapia' ? 'individual' : 'group';

            const payload = {
                patientId: data.patient_id,
                therapistId: data.therapist_id || '',
                date: rawDate,
                startTime: rawTime,
                endTime,
                type: sessionType,
                session_type: sessionType,
                status: data.status || 'agendado',
                notes: data.notes || null,
            };

            const response = await appointmentsApi.create(payload);

            // appointmentsApi.create() already returns res.data (the appointment), not { data: appointment }
            const newAppointment = response as AppointmentApiItem;

            // Helper to parse date string as local date (avoiding timezone issues)
            // new Date("2026-02-05") is parsed as UTC midnight, which becomes previous day in Brazil (UTC-3)
            const parseResponseDate = (dateStr: string | null | undefined): Date => {
                if (!dateStr) return new Date();
                const parts = dateStr.split('-');
                if (parts.length !== 3) return new Date(dateStr);
                const [year, month, day] = parts.map(Number);
                // Use noon local time to avoid DST issues
                return new Date(year, month - 1, day, 12, 0, 0);
            };

            const appointment: AppointmentBase = {
                id: newAppointment.id,
                patientId: newAppointment.patient_id,
                patientName: newAppointment.patient_name || 'Desconhecido',
                phone: newAppointment.patient_phone || '',
                date: parseResponseDate(newAppointment.date || newAppointment.appointment_date),
                time: newAppointment.start_time || newAppointment.appointment_time,
                duration: newAppointment.duration,
                type: newAppointment.type as AppointmentType,
                status: newAppointment.status as AppointmentStatus,
                notes: newAppointment.notes || '',
                createdAt: new Date(newAppointment.created_at),
                updatedAt: new Date(newAppointment.updated_at)
            };

            // Sync Financial Transaction
            if (newAppointment.payment_status === 'paid') {
                await AppointmentService.syncFinancialTransaction({
                    ...appointment,
                    payment_status: newAppointment.payment_status,
                    payment_amount: (data as AppointmentFormData & { payment_amount?: number }).payment_amount,
                    payment_method: (data as AppointmentFormData & { payment_method?: string }).payment_method
                });
            }

            return appointment;
        } catch (error) {
            throw AppError.from(error, 'AppointmentService.createAppointment');
        }
    }

    /**
     * Update an existing appointment
     */
    static async updateAppointment(
        id: string,
        updates: Partial<AppointmentFormData>,
        organizationId: string
    ): Promise<AppointmentBase> {
        try {
            const updateData: Record<string, string | number | null | undefined> = {};

            if (updates.patient_id) updateData.patient_id = updates.patient_id;
            if (updates.duration) updateData.duration = updates.duration;
            if (updates.type) updateData.type = updates.type;
            if (updates.status) updateData.status = updates.status;
            if (updates.notes !== undefined) updateData.notes = updates.notes;
            if (updates.therapist_id !== undefined) updateData.therapist_id = updates.therapist_id;
            if (updates.room !== undefined) updateData.room = updates.room;

            // Handle Date/Time updates
            const updateDate = updates.appointment_date || updates.date;
            if (updateDate) {
                const dateValidation = dateSchema.safeParse(updateDate);
                if (!dateValidation.success) throw AppError.badRequest(`Data inválida: ${updateDate}`);
                updateData.appointment_date = updateDate;
                updateData.date = updateDate;
            }

            const updateTime = updates.appointment_time || updates.start_time;
            if (updateTime) {
                const timeValidation = timeSchema.safeParse(updateTime);
                if (!timeValidation.success) throw AppError.badRequest(`Horário inválido: ${updateTime}`);
                updateData.appointment_time = updateTime;
                updateData.start_time = updateTime;
            }

            if (Object.keys(updateData).length === 0) throw AppError.badRequest('Nenhum dado para atualizar');

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'appointmentService.ts:updateAppointment',message:'API update payload',data:{id,updateDataKeys:Object.keys(updateData),date:updateData.date,start_time:updateData.start_time},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            const response = await appointmentsApi.update(id, updateData);
            // API retorna o appointment diretamente (res.data), não { data: appointment }
            const fetchedUpdatedAppointment = response;

            // Helper to parse date string as local date (avoiding timezone issues)
            const parseResponseDate = (dateStr: string | null | undefined): Date => {
                if (!dateStr) return new Date();
                const parts = dateStr.split('-');
                if (parts.length !== 3) return new Date(dateStr);
                const [year, month, day] = parts.map(Number);
                // Use noon local time to avoid DST issues
                return new Date(year, month - 1, day, 12, 0, 0);
            };

            const updatedAppointment: AppointmentBase = {
                id: fetchedUpdatedAppointment.id,
                patientId: fetchedUpdatedAppointment.patient_id,
                patientName: fetchedUpdatedAppointment.patient_name || 'Desconhecido',
                phone: fetchedUpdatedAppointment.patient_phone || '',
                date: parseResponseDate(fetchedUpdatedAppointment.date || fetchedUpdatedAppointment.appointment_date),
                time: fetchedUpdatedAppointment.start_time || fetchedUpdatedAppointment.appointment_time,
                duration: fetchedUpdatedAppointment.duration,
                type: fetchedUpdatedAppointment.type as AppointmentType,
                status: fetchedUpdatedAppointment.status as AppointmentStatus,
                notes: fetchedUpdatedAppointment.notes || '',
                createdAt: new Date(fetchedUpdatedAppointment.created_at),
                updatedAt: new Date(fetchedUpdatedAppointment.updated_at)
            };

            // We refetch details to complete information
            try {
                const refreshed = await appointmentsApi.get(id);
                if (refreshed) {
                    const r = refreshed as { patient_name?: string; patient_phone?: string; patients?: { full_name?: string; phone?: string } };
                    updatedAppointment.patientName = r.patient_name || r.patients?.full_name || 'Desconhecido';
                    updatedAppointment.phone = r.patient_phone || r.patients?.phone || '';
                }
            } catch (e) {
                // Ignore silent refresh error
            }

            // Sync Financial Transaction
            if (updateData.payment_status === 'paid') {
                await AppointmentService.syncFinancialTransaction({
                    ...updatedAppointment,
                    payment_status: updateData.payment_status,
                    payment_amount: updates.payment_amount ?? undefined,
                    payment_method: updates.payment_method ?? undefined
                });
            }

            return updatedAppointment;
        } catch (error) {
            throw AppError.from(error, 'AppointmentService.updateAppointment');
        }
    }

    /**
     * Update appointment status
     */
    static async updateStatus(id: string, status: string): Promise<void> {
        try {
            await appointmentsApi.update(id, { status });
        } catch (error) {
            throw AppError.from(error, 'AppointmentService.updateStatus');
        }
    }
    /**
     * Delete an appointment
     */
    static async deleteAppointment(id: string, organizationId: string): Promise<void> {
        try {
            await appointmentsApi.cancel(id, 'Deletado pelo usuário');
        } catch (error) {
            throw AppError.from(error, 'AppointmentService.deleteAppointment');
        }
    }

    /**
     * Cancela todos os agendamentos de uma data (ex.: hoje).
     * Lista agendamentos com dateFrom/dateTo e chama cancel para cada um.
     */
    static async cancelAllAppointmentsForDate(organizationId: string, date: string): Promise<{ cancelled: number; errors: number }> {
        const raw = await appointmentsApi.list({ dateFrom: date, dateTo: date, limit: 500 });
        const data = (raw?.data ?? []) as AppointmentApiItem[];
        let cancelled = 0;
        let errors = 0;
        for (const appt of data) {
            try {
                await appointmentsApi.cancel(appt.id, 'Cancelados em lote (todos de hoje)');
                cancelled++;
            } catch {
                errors++;
            }
        }
        return { cancelled, errors };
    }

    /**
     * Sync financial transaction for paid appointments
     */
    private static async syncFinancialTransaction(appointment: Partial<AppointmentBase>): Promise<void> {
        // Skip if package payment (Cash basis: revenue recognized at package purchase)
        if (appointment.payment_method === 'package' || appointment.session_package_id) {
            return;
        }

        if (appointment.payment_status !== 'paid' || !appointment.payment_amount || appointment.payment_amount <= 0) {
            return;
        }

        try {
            // Check if transaction exists
            const existing = await FinancialService.findTransactionByAppointmentId(appointment.id!);

            if (existing) {
                // Update existing
                if (existing.valor !== appointment.payment_amount) {
                    await FinancialService.updateTransaction(existing.id, {
                        valor: appointment.payment_amount,
                        descricao: `Sessão: ${appointment.type} - ${appointment.patientName} (Atualizado)`,
                    });
                    logger.info('Transaction updated for appointment', { appointmentId: appointment.id }, 'AppointmentService');
                }
            } else {
                // Create new
                await FinancialService.createTransaction({
                    tipo: 'receita',
                    descricao: `Sessão: ${appointment.type} - ${appointment.patientName}`,
                    valor: appointment.payment_amount,
                    status: 'concluido',
                    metadata: {
                        source: 'appointment',
                        appointment_id: appointment.id
                    }
                });
                logger.info('Transaction created for appointment', { appointmentId: appointment.id }, 'AppointmentService');
            }
        } catch (error) {
            // Don't block appointment flow, just log
            logger.error('Failed to sync financial transaction', error, 'AppointmentService');
        }
    }
}
