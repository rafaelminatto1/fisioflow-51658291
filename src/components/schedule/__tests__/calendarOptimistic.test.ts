import { describe, expect, it } from "vitest";

import type { Appointment } from "@/types/appointment";
import {
	applyOptimisticAppointmentOverlay,
	hasOptimisticUpdateSynced,
	type PendingOptimisticUpdate,
} from "@/components/schedule/calendarOptimistic";

const createAppointment = (
	overrides: Partial<Appointment> = {},
): Appointment => ({
	id: "appointment-1",
	patientId: "patient-1",
	patientName: "Alex Silva",
	date: new Date(2026, 2, 14, 12, 0, 0),
	time: "08:30",
	duration: 60,
	type: "Fisioterapia",
	status: "agendado",
	createdAt: new Date(2026, 2, 1, 10, 0, 0),
	updatedAt: new Date(2026, 2, 1, 10, 0, 0),
	...overrides,
});

const pendingUpdate: PendingOptimisticUpdate = {
	id: "appointment-1",
	originalDate: "2026-03-14",
	originalTime: "08:30",
	targetDate: "2026-03-12",
	targetTime: "09:30",
};

describe("calendarOptimistic", () => {
	it("applies the optimistic date and time overlay immediately", () => {
		const appointments = [createAppointment()];

		const result = applyOptimisticAppointmentOverlay(
			appointments,
			pendingUpdate,
		);

		expect(result[0]).toMatchObject({
			id: "appointment-1",
			date: "2026-03-12",
			time: "09:30",
		});
	});

	it("keeps the overlay active while the source appointment is still stale", () => {
		const appointments = [createAppointment()];

		expect(hasOptimisticUpdateSynced(appointments, pendingUpdate)).toBe(false);
	});

	it("releases the overlay once the source appointment already reflects the target slot", () => {
		const appointments = [
			createAppointment({
				date: new Date(2026, 2, 12, 12, 0, 0),
				time: "09:30:00",
			}),
		];

		expect(hasOptimisticUpdateSynced(appointments, pendingUpdate)).toBe(true);
	});

	it("releases the overlay when the appointment leaves the current source list", () => {
		const appointments = [createAppointment({ id: "appointment-2" })];

		expect(hasOptimisticUpdateSynced(appointments, pendingUpdate)).toBe(true);
	});
});
