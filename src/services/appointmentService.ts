
import { supabase } from '@/integrations/supabase/client';
import { AppointmentBase, AppointmentFormData, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { VerifiedAppointmentSchema } from '@/schemas/appointment';
import { dateSchema, timeSchema } from '@/lib/validations/agenda';
import { AppError } from '@/lib/errors/AppError';
import { logger } from '@/lib/errors/logger';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';

export class AppointmentService {
    /**
     * Fetch all appointments for an organization
     */
    static async fetchAppointments(organizationId: string): Promise<AppointmentBase[]> {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
          *,
          patients!inner(
            id,
            full_name,
            phone,
            email
          ),
          profiles:therapist_id(
            full_name
          )
        `)
                .eq('organization_id', organizationId)
                .order('appointment_date', { ascending: true })
                .order('appointment_time', { ascending: true });

            if (error) {
                throw new AppError(error.message, error.code, 500);
            }

            // Validar e transformar dados
            const validAppointments: AppointmentBase[] = [];
            const validationErrors: { id: string; error: unknown }[] = [];

            (data || []).forEach((item) => {
                const itemToValidate = {
                    ...item,
                    patient: item.patients,
                    professional: item.profiles
                };

                const validation = VerifiedAppointmentSchema.safeParse(itemToValidate);

                if (validation.success) {
                    const validData = validation.data;
                    validAppointments.push({
                        id: validData.id,
                        patientId: validData.patient_id || '',
                        patientName: validData.patientName,
                        phone: item.patients?.phone || '',
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
                    });
                } else {
                    validationErrors.push({ id: item.id, error: validation.error });
                }
            });

            if (validationErrors.length > 0) {
                logger.warn(`Ignorados ${validationErrors.length} agendamentos inválidos`, {}, 'AppointmentService');
            }

            return validAppointments;
        } catch (error) {
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

            const rawDate = data.appointment_date || data.date;
            const rawTime = data.appointment_time || data.start_time;

            if (!rawDate) throw AppError.badRequest('Data é obrigatória');
            if (!rawTime) throw AppError.badRequest('Horário é obrigatório');

            const dateValidation = dateSchema.safeParse(rawDate);
            if (!dateValidation.success) throw AppError.badRequest(`Data inválida: ${rawDate}`);

            const timeValidation = timeSchema.safeParse(rawTime);
            if (!timeValidation.success) throw AppError.badRequest(`Horário inválido: ${rawTime}`);

            const { data: newAppointment, error } = await supabase
                .from('appointments')
                .insert({
                    patient_id: data.patient_id,
                    appointment_date: rawDate,
                    date: rawDate,
                    appointment_time: rawTime,
                    start_time: rawTime,
                    duration: data.duration || 60,
                    type: data.type || 'fisioterapia',
                    status: data.status || 'agendado',
                    notes: data.notes || null,
                    therapist_id: data.therapist_id || null,
                    room: data.room || null,
                    organization_id: organizationId,
                })
                .select(`
          *,
          patients!inner(
            id,
            full_name,
            phone,
            email
          )
        `)
                .single();

            if (error) throw new AppError(error.message, error.code, 400);

            const appointment: AppointmentBase = {
                id: newAppointment.id,
                patientId: newAppointment.patient_id,
                patientName: newAppointment.patients.full_name,
                phone: newAppointment.patients.phone,
                date: new Date(newAppointment.date || newAppointment.appointment_date),
                time: newAppointment.start_time || newAppointment.appointment_time,
                duration: newAppointment.duration,
                type: newAppointment.type as AppointmentType,
                status: newAppointment.status as AppointmentStatus,
                notes: newAppointment.notes || '',
                createdAt: new Date(newAppointment.created_at),
                updatedAt: new Date(newAppointment.updated_at)
            };

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
            const updateData: any = {};

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

            const { error: updateError } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', id)
                .eq('organization_id', organizationId);

            if (updateError) throw new AppError(updateError.message, updateError.code, 400);

            // Fetch updated
            const { data: updatedAppointment, error: selectError } = await supabase
                .from('appointments')
                .select(`
          *,
          patients!inner(
            id,
            full_name,
            phone,
            email
          )
        `)
                .eq('id', id)
                .single();

            if (selectError || !updatedAppointment) throw new AppError('Erro ao buscar agendamento atualizado', 'FETCH_ERROR', 404);

            return {
                id: updatedAppointment.id,
                patientId: updatedAppointment.patient_id,
                patientName: updatedAppointment.patients?.full_name || 'Desconhecido',
                phone: updatedAppointment.patients?.phone || '',
                date: new Date(updatedAppointment.date || updatedAppointment.appointment_date),
                time: updatedAppointment.start_time || updatedAppointment.appointment_time,
                duration: updatedAppointment.duration,
                type: updatedAppointment.type as AppointmentType,
                status: updatedAppointment.status as AppointmentStatus,
                notes: updatedAppointment.notes || '',
                createdAt: new Date(updatedAppointment.created_at),
                updatedAt: new Date(updatedAppointment.updated_at)
            };
        } catch (error) {
            throw AppError.from(error, 'AppointmentService.updateAppointment');
        }
    }

    /**
     * Update appointment status
     */
    static async updateStatus(id: string, status: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', id);

            if (error) throw new AppError(error.message, error.code, 400);
        } catch (error) {
            throw AppError.from(error, 'AppointmentService.updateStatus');
        }
    }
    /**
     * Delete an appointment
     */
    static async deleteAppointment(id: string, organizationId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id)
                .eq('organization_id', organizationId);

            if (error) throw new AppError(error.message, error.code, 400);
        } catch (error) {
            throw AppError.from(error, 'AppointmentService.deleteAppointment');
        }
    }
}
