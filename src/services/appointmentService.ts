// Type for appointment item from API

import { appointmentsApi } from "@/api/v2/appointments";
import { auditApi } from "@/api/v2";
import { parseLocalDate } from "@/lib/date-utils";
import {
  AppointmentBase,
  AppointmentFormData,
  AppointmentStatus,
  AppointmentType,
} from "@/types/appointment";
import {
  APPOINTMENT_STATUSES,
  PAYMENT_STATUSES,
} from "@/lib/constants";
import { VerifiedAppointmentSchema } from "@/schemas/appointment";
import { dateSchema, timeSchema } from "@/lib/validations/agenda";
import { AppError } from "@/lib/errors/AppError";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { checkAppointmentConflict } from "@/utils/appointmentValidation";
import { validateAppointment } from "@/lib/validation";
import { FinancialService } from "@/services/financialService";
import { AgentIngestPayload, agentIngest } from "@/lib/debug/agentIngest";
import type { AppointmentRow } from "@/types/workers";

interface AppointmentApiItem extends AppointmentRow {
  patient_name?: string;
  patient_phone?: string;
  therapist_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  duration?: number;
  duration_minutes?: number;
  payment_status?: string;
  payment_amount?: number | string | null;
  payment_method?: string | null;
  room_id?: string | null;
  session_package_id?: string | null;
}

// Helper for time calculation
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + durationMinutes);
  return date.toTimeString().slice(0, 5);
}

const AGENT_METADATA = {
  sessionId: "debug-session",
  runId: "pre-fix",
  hypothesisId: "H2",
};

function logAgentEvent(payload: AgentIngestPayload): void {
  agentIngest({
    ...AGENT_METADATA,
    timestamp: payload.timestamp ?? Date.now(),
    ...payload,
  });
}

export class AppointmentService {
  /**
   * Fetch all appointments for an organization
   */
  static async fetchAppointments(
    organizationId: string,
    options: { limit?: number; dateFrom?: string; dateTo?: string } = {},
  ): Promise<AppointmentBase[]> {
    try {
      // Default limit reduced to 500 for better performance.
      // The agenda should use date filters to fetch only what's needed.
      const limit = options.limit || 500;

      logger.info(
        "Fetching appointments",
        {
          organizationId,
          limit,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
        },
        "AppointmentService",
      );

      if (!organizationId) {
        logger.error("Organization ID is missing", {}, "AppointmentService");
        return [];
      }

      logger.info(
        "[AppointmentService] Calling appointmentsApi.list",
        {
          organizationId,
          limit,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
        },
        "AppointmentService",
      );

      const response = await appointmentsApi.list({
        limit,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
      });

      logger.info(
        "Appointments API response received",
        {
          hasData: !!response.data,
          dataLength: response.data?.length || 0,
          responseKeys: Object.keys(response),
          sampleItem: response.data?.[0]
            ? {
                id: response.data[0].id,
                hasPatientId: !!response.data[0].patient_id,
                hasDate: !!(response.data[0].date || response.data[0].appointment_date),
                hasTime: !!(response.data[0].start_time || response.data[0].appointment_time),
              }
            : null,
        },
        "AppointmentService",
      );

      const data = response.data || [];

      // Validar e transformar dados
      const validAppointments: AppointmentBase[] = [];
      const validationErrors: { id: string; error: unknown }[] = [];

      (data || []).forEach((item: AppointmentApiItem) => {
        const itemToValidate = {
          ...item,
          patient: {
            id: item.patient_id,
            full_name: item.patient_name || "Desconhecido",
            phone: item.patient_phone,
          },
          professional: {
            full_name: item.therapist_name,
          },
        };

        const validation = VerifiedAppointmentSchema.safeParse(itemToValidate);

        if (validation.success) {
          const validData = validation.data;
          validAppointments.push({
            id: validData.id,
            patientId: validData.patient_id || "",
            patientName: validData.patientName,
            phone: item.patient_phone || "",
            date: validData.date,
            time: validData.start_time || validData.appointment_time || "00:00",
            duration: validData.duration || 60,
            type: (validData.type || "Fisioterapia") as AppointmentType,
            status: (validData.status || APPOINTMENT_STATUSES[0]) as AppointmentStatus,
            notes: validData.notes || "",
            createdAt: validData.created_at ? new Date(validData.created_at) : new Date(),
            updatedAt: validData.updated_at ? new Date(validData.updated_at) : new Date(),
            therapistId: validData.therapist_id ?? undefined,
            room: validData.room ?? undefined,
            payment_status: validData.payment_status || PAYMENT_STATUSES[0],
            payment_method: item.payment_method ?? undefined,
            payment_amount: item.payment_amount ?? undefined,
            session_package_id: item.session_package_id ?? undefined,
          });
        } else {
          const maskedName = item.patient_name ? item.patient_name.split(" ")[0] : "***";
          logger.error(
            `Appointment validation failed for ID ${item.id}`,
            {
              id: item.id,
              patient_name: maskedName,
              date: item.date,
              appointment_date: item.appointment_date,
              start_time: item.start_time,
              appointment_time: item.appointment_time,
              patient_id: item.patient_id,
              therapist_id: item.therapist_id,
              status: item.status,
              type: item.type,
              duration: item.duration,
              validationError: JSON.stringify(validation.error?.issues || "Unknown error", null, 2),
            },
            "AppointmentService",
          );
          validationErrors.push({ id: item.id, error: validation.error });
        }
      });

      if (validationErrors.length > 0) {
        logger.warn(
          `Ignorados ${validationErrors.length} agendamentos inválidos`,
          {},
          "AppointmentService",
        );
      }

      logger.info(
        "Appointments processed successfully",
        {
          totalReceived: data.length,
          validAppointments: validAppointments.length,
          invalidAppointments: validationErrors.length,
          sampleValid: validAppointments[0]
            ? {
                id: validAppointments[0].id,
                patientName: validAppointments[0].patientName,
                date: validAppointments[0].date,
                time: validAppointments[0].time,
              }
            : null,
        },
        "AppointmentService",
      );

      return validAppointments;
    } catch (error: any) {
      throw AppError.from(error, "AppointmentService.fetchAppointments");
    }
  }

  /**
   * Create a new appointment
   */
  static async createAppointment(
    data: AppointmentFormData & { ignoreCapacity?: boolean },
    organizationId: string,
    existingAppointments: AppointmentBase[] = [], // Optional for conflict check
  ): Promise<AppointmentBase> {
    try {
      logger.info("Creating appointment", { data }, "AppointmentService");

      // Conflict Check
      if (existingAppointments.length > 0) {
        checkAppointmentConflict({
          date: parseLocalDate(data.appointment_date || ""),
          time: data.start_time || data.appointment_time || "",
          duration: data.duration || 60,
          appointments: existingAppointments,
        });
      }

      // Validation
      if (!data.patient_id) throw AppError.badRequest("ID do paciente é obrigatório");

      const rawDate = data.appointment_date || data.date || "";
      const rawTime = data.appointment_time || data.start_time || "";

      if (!rawDate) throw AppError.badRequest("Data é obrigatória");
      if (!rawTime) throw AppError.badRequest("Horário é obrigatório");

      const dateValidation = dateSchema.safeParse(rawDate);
      if (!dateValidation.success) throw AppError.badRequest(`Data inválida: ${rawDate}`);

      const timeValidation = timeSchema.safeParse(rawTime);
      if (!timeValidation.success) throw AppError.badRequest(`Horário inválido: ${rawTime}`);

      // Domain validation (business invariants)
      const domainValidation = validateAppointment({
        date: rawDate,
        duration: data.duration || 60,
        time: rawTime || undefined,
        isNew: true,
      });
      if (!domainValidation.valid) {
        throw AppError.badRequest(domainValidation.errors.join("; "));
      }

      const endTime = calculateEndTime(rawTime, data.duration || 60);
      const sessionType =
        data.type === "Fisioterapia" || data.type === "fisioterapia" ? "individual" : "group";

      const payload = {
        patientId: data.patient_id,
        therapistId: data.therapist_id || "",
        organizationId,
        date: rawDate,
        startTime: rawTime,
        endTime,
        type: sessionType,
        session_type: sessionType,
        status: data.status || APPOINTMENT_STATUSES[0],
        notes: data.notes || null,
        ignoreCapacity: data.ignoreCapacity || false,
      };

      const response = await appointmentsApi.create(payload);
      const newAppointment = response.data as AppointmentApiItem;

      // Log de auditoria: Novo Agendamento
      try {
        await auditApi.create({
          action: "INSERT",
          entity_type: "appointments",
          entity_id: newAppointment.id,
          metadata: {
            patient: newAppointment.patient_name || data.patient_id,
            date: rawDate,
            time: rawTime,
            type: data.type,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditErr) {
        logger.warn("Audit log failed for appointment creation", {
          operation: "AppointmentService.createAppointment",
          appointmentId: newAppointment.id,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        }, "AppointmentService");
      }

      // Helper to parse date string as local date (avoiding timezone issues)
      // new Date("2026-02-05") is parsed as UTC midnight, which becomes previous day in Brazil (UTC-3)
      const parseResponseDate = (dateStr: string | null | undefined): Date => {
        if (!dateStr) return new Date();
        const cleanDate = dateStr.split("T")[0];
        const parts = cleanDate.split("-");
        if (parts.length !== 3) return new Date(dateStr);
        const [year, month, day] = parts.map(Number);
        // Use noon local time to avoid DST issues
        return new Date(year, month - 1, day, 12, 0, 0);
      };

      const appointment: AppointmentBase = {
        id: newAppointment.id,
        patientId: newAppointment.patient_id,
        patientName: newAppointment.patient_name || "Desconhecido",
        phone: newAppointment.patient_phone || "",
        date: parseResponseDate(newAppointment.date || newAppointment.appointment_date),
        time: newAppointment.start_time || newAppointment.appointment_time || rawTime || "00:00",
        duration: newAppointment.duration_minutes || newAppointment.duration || 60,
        type: newAppointment.type as AppointmentType,
        status: newAppointment.status as AppointmentStatus,
        notes: newAppointment.notes || "",
        createdAt: new Date(newAppointment.created_at),
        updatedAt: new Date(newAppointment.updated_at),
      };

      // Sync Financial Transaction
      if (newAppointment.payment_status === "paid") {
        await AppointmentService.syncFinancialTransaction({
          ...appointment,
          payment_status: newAppointment.payment_status,
          payment_amount: (data as AppointmentFormData & { payment_amount?: number })
            .payment_amount,
          payment_method: (data as AppointmentFormData & { payment_method?: string })
            .payment_method,
        });
      }

      return appointment;
    } catch (error) {
      throw AppError.from(error, "AppointmentService.createAppointment");
    }
  }

  /**
   * Update an existing appointment
   */
  static async updateAppointment(
    id: string,
    updates: Partial<AppointmentFormData> & { ignoreCapacity?: boolean },
    _organizationId: string,
  ): Promise<AppointmentBase> {
    try {
      // #region agent log
      logAgentEvent({
        location: "src/services/appointmentService.ts:updateAppointment:entry",
        message: "updateAppointment called",
        data: {
          appointmentId: id,
          providedUpdateKeys: Object.keys(updates || {}),
          rawUpdates: updates,
        },
      });
      // #endregion

      const updateData: Record<string, string | number | null | undefined> = {};

      // patient_id is IMMUTABLE during updates as per business rule
      // To change a patient, the appointment must be deleted and recreated
      if (updates.patient_id) {
        logger.warn(
          "Attempted to update patient_id of an existing appointment. This action is blocked.",
          { appointmentId: id },
          "AppointmentService",
        );
      }

      const updateDuration = updates.duration;

      if (updateDuration !== undefined) updateData.duration = updateDuration;
      if (updates.type) updateData.type = updates.type;
      if (updates.status) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.therapist_id !== undefined) updateData.therapist_id = updates.therapist_id;
      if (updates.room !== undefined) updateData.room = updates.room;
      if (updates.payment_status !== undefined) updateData.payment_status = updates.payment_status;
      if (updates.payment_amount !== undefined) updateData.payment_amount = updates.payment_amount;
      if (updates.ignoreCapacity !== undefined) updateData.ignoreCapacity = updates.ignoreCapacity;

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

      // Domain validation (business invariants) — only validate fields that are being updated
      if (updateDate !== undefined || updateDuration !== undefined || updateTime !== undefined) {
        const domainValidation = validateAppointment({
          date: updateDate || new Date(), // fallback to today if only duration/time changes
          duration: updateDuration ?? 60,
          time: updateTime || undefined,
          isNew: false, // updates may target past dates
        });
        if (!domainValidation.valid) {
          throw AppError.badRequest(domainValidation.errors.join("; "));
        }
      }

      const explicitEndTime = updates.end_time || updates.endTime;
      const derivedEndTime =
        updateTime && updateDuration !== undefined
          ? calculateEndTime(updateTime, updateDuration)
          : undefined;
      const updateEndTime = explicitEndTime || derivedEndTime;
      if (updateEndTime) {
        const timeValidation = timeSchema.safeParse(updateEndTime);
        if (!timeValidation.success)
          throw AppError.badRequest(`Horário de término inválido: ${updateEndTime}`);
        updateData.end_time = updateEndTime;
      }

      // #region agent log
      logAgentEvent({
        location: "src/services/appointmentService.ts:updateAppointment:preparedData",
        message: "Prepared update payload",
        data: {
          appointmentId: id,
          updateData,
          candidateEndTime: updateEndTime ?? null,
          hasDuration: updateDuration !== undefined,
          hasStartTime: Boolean(updateTime),
        },
      });
      // #endregion

      if (Object.keys(updateData).length === 0)
        throw AppError.badRequest("Nenhum dado para atualizar");

      const response = await appointmentsApi.update(id, updateData);
      const fetchedUpdatedAppointment = response.data as AppointmentApiItem;

      // Log de auditoria: Atualização de Agendamento
      try {
        await auditApi.create({
          action: "UPDATE",
          entity_type: "appointments",
          entity_id: id,
          metadata: {
            patient: fetchedUpdatedAppointment.patient_name || id,
            updates: Object.keys(updateData),
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditErr) {
        logger.warn("Audit log failed for appointment update", {
          operation: "AppointmentService.updateAppointment",
          appointmentId: id,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        }, "AppointmentService");
      }

      // #region agent log
      logAgentEvent({
        location: "src/services/appointmentService.ts:updateAppointment:response",
        message: "Received update response",
        data: {
          appointmentId: id,
          responseTime:
            fetchedUpdatedAppointment?.start_time ?? fetchedUpdatedAppointment?.appointment_time,
          responseEndTime: fetchedUpdatedAppointment?.end_time,
          responseDuration: fetchedUpdatedAppointment?.duration,
        },
      });
      // #endregion

      // Helper to parse date string as local date (avoiding timezone issues)
      const parseResponseDate = (dateStr: string | null | undefined): Date => {
        if (!dateStr) return new Date();
        const cleanDate = dateStr.split("T")[0];
        const parts = cleanDate.split("-");
        if (parts.length !== 3) return new Date(dateStr);
        const [year, month, day] = parts.map(Number);
        // Use noon local time to avoid DST issues
        return new Date(year, month - 1, day, 12, 0, 0);
      };

      const updatedAppointment: AppointmentBase = {
        id: fetchedUpdatedAppointment.id,
        patientId: fetchedUpdatedAppointment.patient_id,
        patientName: fetchedUpdatedAppointment.patient_name || "Desconhecido",
        phone: fetchedUpdatedAppointment.patient_phone || "",
        date: parseResponseDate(
          fetchedUpdatedAppointment.date || fetchedUpdatedAppointment.appointment_date,
        ),
        time: fetchedUpdatedAppointment.start_time || fetchedUpdatedAppointment.appointment_time,
        duration:
          fetchedUpdatedAppointment.duration_minutes ||
          fetchedUpdatedAppointment.duration ||
          updateDuration ||
          60,
        type: fetchedUpdatedAppointment.type as AppointmentType,
        status: fetchedUpdatedAppointment.status as AppointmentStatus,
        notes: fetchedUpdatedAppointment.notes || "",
        createdAt: new Date(fetchedUpdatedAppointment.created_at),
        updatedAt: new Date(fetchedUpdatedAppointment.updated_at),
      };

      // We refetch details to complete information
      try {
        const refreshed = await appointmentsApi.get(id);
        if (refreshed?.data) {
          const r = refreshed.data as AppointmentApiItem & {
            patient?: { full_name?: string; phone?: string };
          };
          updatedAppointment.patientName = r.patient_name || r.patient?.full_name || "Desconhecido";
          updatedAppointment.phone = r.patient_phone || r.patient?.phone || "";
        }
      } catch (refreshErr) {
        logger.warn("Failed to refresh appointment details after update", {
          operation: "AppointmentService.updateAppointment",
          appointmentId: id,
          error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        }, "AppointmentService");
      }

      // Sync Financial Transaction
      if (updateData.payment_status === "paid") {
        await AppointmentService.syncFinancialTransaction({
          ...updatedAppointment,
          payment_status: updateData.payment_status,
          payment_amount: updates.payment_amount ?? undefined,
          payment_method: updates.payment_method ?? undefined,
        });
      }

      return updatedAppointment;
    } catch (error) {
      // #region agent log
      logAgentEvent({
        location: "src/services/appointmentService.ts:updateAppointment:error",
        message: "updateAppointment threw",
        data: {
          appointmentId: id,
          error: String(error),
        },
      });
      // #endregion

      throw AppError.from(error, "AppointmentService.updateAppointment");
    }
  }

  /**
   * Update appointment status
   */
  static async updateStatus(id: string, status: string): Promise<any> {
    try {
      const normalizedStatus = String(status || "").toLowerCase();
      if (normalizedStatus === "cancelado" || normalizedStatus === "cancelled") {
        const result = await appointmentsApi.cancel(id);
        // Log de auditoria: Cancelamento
        try {
          await auditApi.create({
            action: "UPDATE",
            entity_type: "appointments",
            entity_id: id,
            metadata: {
              status: "cancelled",
              timestamp: new Date().toISOString(),
            },
          });
        } catch (auditErr) {
          logger.warn("Audit log failed for appointment cancellation", {
            operation: "AppointmentService.updateStatus",
            appointmentId: id,
            error: auditErr instanceof Error ? auditErr.message : String(auditErr),
          }, "AppointmentService");
        }
        return result;
      }
      const result = await appointmentsApi.update(id, { status });
      // Log de auditoria: Mudança de Status
      try {
        await auditApi.create({
          action: "UPDATE",
          entity_type: "appointments",
          entity_id: id,
          metadata: { status, timestamp: new Date().toISOString() },
        });
      } catch (auditErr) {
        logger.warn("Audit log failed for appointment status update", {
          operation: "AppointmentService.updateStatus",
          appointmentId: id,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        }, "AppointmentService");
      }
      return result.data;
    } catch (error) {
      throw AppError.from(error, "AppointmentService.updateStatus");
    }
  }

  /**
   * Cancel appointment with optional reason.
   */
  static async cancelAppointment(id: string, reason?: string): Promise<any> {
    try {
      const result = await appointmentsApi.cancel(id, reason);
      // Log de auditoria: Cancelamento com motivo
      try {
        await auditApi.create({
          action: "DELETE",
          entity_type: "appointments",
          entity_id: id,
          metadata: {
            status: "cancelled",
            reason,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditErr) {
        logger.warn("Audit log failed for appointment cancellation", {
          operation: "AppointmentService.cancelAppointment",
          appointmentId: id,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        }, "AppointmentService");
      }
      return result;
    } catch (error) {
      throw AppError.from(error, "AppointmentService.cancelAppointment");
    }
  }
  /**
   * Delete an appointment
   */
  static async deleteAppointment(id: string, _organizationId: string): Promise<void> {
    try {
      await appointmentsApi.cancel(id, "Deletado pelo usuário");
      // Log de auditoria: Exclusão (via cancelamento)
      try {
        await auditApi.create({
          action: "DELETE",
          entity_type: "appointments",
          entity_id: id,
          metadata: {
            reason: "Deletado pelo usuário",
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditErr) {
        logger.warn("Audit log failed for appointment deletion", {
          operation: "AppointmentService.deleteAppointment",
          appointmentId: id,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        }, "AppointmentService");
      }
    } catch (error) {
      throw AppError.from(error, "AppointmentService.deleteAppointment");
    }
  }

  /**
   * Cancela todos os agendamentos de uma data (ex.: hoje).
   * Lista agendamentos com dateFrom/dateTo e chama cancel para cada um.
   */
  static async cancelAllAppointmentsForDate(
    organizationId: string,
    date: string,
  ): Promise<{ cancelled: number; errors: number }> {
    const raw = await appointmentsApi.list({
      dateFrom: date,
      dateTo: date,
      limit: 500,
    });
    const data = (raw?.data ?? []) as AppointmentApiItem[];
    let cancelled = 0;
    let errors = 0;
    for (const appt of data) {
      try {
        await appointmentsApi.cancel(appt.id, "Cancelados em lote (todos de hoje)");
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
  private static async syncFinancialTransaction(
    appointment: Partial<AppointmentBase>,
  ): Promise<void> {
    // Skip if package payment (Cash basis: revenue recognized at package purchase)
    if (appointment.payment_method === "package" || appointment.session_package_id) {
      return;
    }

    // Status que não devem gerar cobrança/receita (DB uses English values)
    const nonChargingStatuses = [
      "cancelled",
      "no_show",
      "rescheduled",
      // Legacy Portuguese (kept for backward compat)
      "cancelado",
      "faltou",
      "faltou_com_aviso",
      "faltou_sem_aviso",
      "nao_atendido",
      "nao_atendido_sem_cobranca",
      "remarcar",
    ];

    const status = (appointment.status || "").toLowerCase();
    if (nonChargingStatuses.includes(status)) {
      logger.info(
        "Skipping financial sync: Status does not allow charging",
        { appointmentId: appointment.id, status },
        "AppointmentService",
      );
      return;
    }

    if (
      appointment.payment_status !== "paid" ||
      !appointment.payment_amount ||
      appointment.payment_amount <= 0
    ) {
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
          logger.info(
            "Transaction updated for appointment",
            { appointmentId: appointment.id },
            "AppointmentService",
          );
        }
      } else {
        // Create new
        await FinancialService.createTransaction({
          tipo: "receita",
          descricao: `Sessão: ${appointment.type} - ${appointment.patientName}`,
          valor: appointment.payment_amount,
          status: "concluido",
          metadata: {
            source: "appointment",
            appointment_id: appointment.id,
          },
        });
        logger.info(
          "Transaction created for appointment",
          { appointmentId: appointment.id },
          "AppointmentService",
        );
      }
    } catch (error) {
      // Don't block appointment flow, just log
      logger.error("Failed to sync financial transaction", error, "AppointmentService");
    }
  }
}
