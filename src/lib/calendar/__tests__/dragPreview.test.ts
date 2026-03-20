import { describe, expect, it } from "vitest";

import type { Appointment } from "@/types/appointment";
import {
	buildDragPreviewAppointments,
	isSameAppointmentSlot,
} from "@/lib/calendar/dragPreview";

const createAppointment = (
	overrides: Partial<Appointment> = {},
): Appointment => ({
	id: "appointment-1",
	patientId: "patient-1",
	patientName: "Amanda Hitomi",
	date: "2026-03-12",
	time: "11:00",
	duration: 60,
	type: "Fisioterapia",
	status: "agendado",
	createdAt: new Date(2026, 2, 1, 10, 0, 0),
	updatedAt: new Date(2026, 2, 1, 10, 0, 0),
	...overrides,
});

describe("dragPreview", () => {
	it("detecta quando o target é o mesmo slot do agendamento", () => {
		const appointment = createAppointment();

		expect(
			isSameAppointmentSlot(appointment, {
				date: new Date(2026, 2, 12, 12, 0, 0),
				time: "11:00",
			}),
		).toBe(true);
	});

	it("move apenas o agendamento arrastado para o slot simulado", () => {
		const draggedAppointment = createAppointment();
		const siblingAppointment = createAppointment({
			id: "appointment-2",
			patientId: "patient-2",
			patientName: "Diogenes",
			time: "11:30",
		});

		const result = buildDragPreviewAppointments(
			[draggedAppointment, siblingAppointment],
			draggedAppointment,
			{
				date: new Date(2026, 2, 13, 12, 0, 0),
				time: "11:30",
			},
		);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			id: "appointment-1",
			date: "2026-03-13",
			time: "11:30",
		});
		expect(result[1]).toMatchObject({
			id: "appointment-2",
			date: "2026-03-12",
			time: "11:30",
		});
	});

	it("reutiliza a lista original quando não existe preview válido", () => {
		const appointments = [createAppointment()];

		expect(
			buildDragPreviewAppointments(appointments, appointments[0], {
				date: new Date(2026, 2, 12, 12, 0, 0),
				time: "11:00",
			}),
		).toBe(appointments);

		expect(buildDragPreviewAppointments(appointments, null, null)).toBe(
			appointments,
		);
	});
});
