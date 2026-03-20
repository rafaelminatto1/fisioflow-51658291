import { AppointmentBase, AppointmentFormData } from "@/types/appointment";
import { parseResponseDate } from "@/utils/dateUtils";

export function parseUpdatesToAppointment(
	updates: Partial<AppointmentFormData>,
): Partial<AppointmentBase> {
	const result: Partial<AppointmentBase> = {};

	if (updates.appointment_date || updates.date) {
		const dateStr = updates.appointment_date || updates.date;
		result.date =
			typeof dateStr === "string"
				? parseResponseDate(dateStr)
				: (dateStr as Date);
	}
	if (updates.appointment_time || updates.start_time) {
		result.time = updates.appointment_time || updates.start_time;
	}
	if (updates.duration) result.duration = updates.duration;
	if (updates.type) result.type = updates.type;
	if (updates.status) result.status = updates.status;
	if (updates.notes !== undefined) result.notes = updates.notes;
	if (updates.therapist_id !== undefined)
		result.therapistId = updates.therapist_id;
	if (updates.room !== undefined) result.room = updates.room;
	if (updates.payment_status !== undefined)
		result.payment_status = updates.payment_status;

	return result;
}
