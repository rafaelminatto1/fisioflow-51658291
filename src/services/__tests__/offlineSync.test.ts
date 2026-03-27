import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { OfflineSyncService, ACTION_TYPES, getOfflineSyncService } from "../offlineSync";
import "fake-indexeddb/auto";
import { getDB } from "@/hooks/useOfflineStorage";

const { 
	appointmentsCreateMock, 
	appointmentsUpdateMock,
	appointmentsCancelMock,
	evolutionMeasurementsCreateMock, 
	evolutionSessionsUpsertMock,
	goalsUpdateMock,
	patientsUpdateMock
} = vi.hoisted(() => ({
	appointmentsCreateMock: vi.fn().mockResolvedValue({ data: {} }),
	appointmentsUpdateMock: vi.fn().mockResolvedValue({ data: {} }),
	appointmentsCancelMock: vi.fn().mockResolvedValue({ success: true }),
	evolutionMeasurementsCreateMock: vi.fn().mockResolvedValue({ data: {} }),
	evolutionSessionsUpsertMock: vi.fn().mockResolvedValue({ data: {} }),
	goalsUpdateMock: vi.fn().mockResolvedValue({ data: {} }),
	patientsUpdateMock: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock("@/api/v2", () => ({
	appointmentsApi: { 
		create: appointmentsCreateMock,
		update: appointmentsUpdateMock,
		cancel: appointmentsCancelMock
	},
	evolutionApi: { 
		measurements: { create: evolutionMeasurementsCreateMock },
		treatmentSessions: { upsert: evolutionSessionsUpsertMock }
	},
	goalsApi: { update: goalsUpdateMock },
	patientsApi: { update: patientsUpdateMock },
	exercisesApi: {},
}));

vi.mock("@/lib/errors/logger", () => ({
	fisioLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

describe("OfflineSyncService", () => {
	let service: OfflineSyncService;

	beforeEach(async () => {
		vi.clearAllMocks();
		service = getOfflineSyncService();
		// Ensure DB is clean between tests
		const db = await getDB();
		try {
			await db.clear("offline_actions");
		} catch (e) {
			// Object store might not exist yet
		}
	});

	afterEach(async () => {
		const db = await getDB();
		try {
			await db.clear("offline_actions");
		} catch (e) {
		}
	});

	describe("executeAction Mapping", () => {
		it("maps CREATE_APPOINTMENT correctly", async () => {
			const payload = { test: "data" };
			// @ts-ignore
			await service.executeAction({ id: "1", action: ACTION_TYPES.CREATE_APPOINTMENT, payload, timestamp: Date.now(), synced: false, retryCount: 0 });
			expect(appointmentsCreateMock).toHaveBeenCalledWith(payload);
		});

		it("maps UPDATE_APPOINTMENT correctly", async () => {
			const payload = { id: "123", test: "data" };
			// @ts-ignore
			await service.executeAction({ id: "1", action: ACTION_TYPES.UPDATE_APPOINTMENT, payload, timestamp: Date.now(), synced: false, retryCount: 0 });
			expect(appointmentsUpdateMock).toHaveBeenCalledWith("123", payload);
		});

		it("maps DELETE_APPOINTMENT correctly", async () => {
			const payload = { id: "123" };
			// @ts-ignore
			await service.executeAction({ id: "1", action: ACTION_TYPES.DELETE_APPOINTMENT, payload, timestamp: Date.now(), synced: false, retryCount: 0 });
			expect(appointmentsCancelMock).toHaveBeenCalledWith("123");
		});

		it("maps CREATE_SESSION_METRICS correctly", async () => {
			const payload = { test: "data" };
			// @ts-ignore
			await service.executeAction({ id: "1", action: ACTION_TYPES.CREATE_SESSION_METRICS, payload, timestamp: Date.now(), synced: false, retryCount: 0 });
			expect(evolutionMeasurementsCreateMock).toHaveBeenCalledWith(payload);
		});

		it("maps UPDATE_GOAL correctly", async () => {
			const payload = { id: "456", test: "data" };
			// @ts-ignore
			await service.executeAction({ id: "1", action: ACTION_TYPES.UPDATE_GOAL, payload, timestamp: Date.now(), synced: false, retryCount: 0 });
			expect(goalsUpdateMock).toHaveBeenCalledWith("456", payload);
		});
	});

	describe("Error Handling (processAction)", () => {
		it("removes action from queue on 400 terminal error", async () => {
			const db = await getDB();
			const actionId = "terminal-error-id";
			await db.add("offline_actions", {
				id: actionId,
				action: ACTION_TYPES.CREATE_APPOINTMENT,
				payload: { name: "Test" },
				timestamp: Date.now(),
				synced: false,
				retryCount: 0
			});

			const error = new Error("Bad Request") as any;
			error.status = 400;
			appointmentsCreateMock.mockRejectedValueOnce(error);

			const action = await db.get("offline_actions", actionId);
			// @ts-ignore
			await expect(service.processAction(action, db)).rejects.toThrow();

			// Should be removed from queue
			const remaining = await db.get("offline_actions", actionId);
			expect(remaining).toBeUndefined();
		});

		it("retries on 500 transient error", async () => {
			const db = await getDB();
			const actionId = "transient-error-id";
			await db.add("offline_actions", {
				id: actionId,
				action: ACTION_TYPES.CREATE_APPOINTMENT,
				payload: { name: "Test" },
				timestamp: Date.now(),
				synced: false,
				retryCount: 0
			});

			const error = new Error("Server Error") as any;
			error.status = 500;
			appointmentsCreateMock.mockRejectedValueOnce(error);

			const action = await db.get("offline_actions", actionId);
			// @ts-ignore
			await expect(service.processAction(action, db)).rejects.toThrow();

			// Should still be in queue with incremented retry count
			const remaining = await db.get("offline_actions", actionId);
			expect(remaining).toBeDefined();
			expect(remaining?.retryCount).toBe(1);
		});

		it("removes action after max retries", async () => {
			const db = await getDB();
			const actionId = "max-retries-id";
			await db.add("offline_actions", {
				id: actionId,
				action: ACTION_TYPES.CREATE_APPOINTMENT,
				payload: { name: "Test" },
				timestamp: Date.now(),
				synced: false,
				retryCount: 4 // Max retries is 5 by default
			});

			const error = new Error("Transient Error") as any;
			error.status = 503;
			appointmentsCreateMock.mockRejectedValueOnce(error);

			const action = await db.get("offline_actions", actionId);
			// @ts-ignore
			await expect(service.processAction(action, db)).rejects.toThrow();

			// Should be removed reached max retries
			const remaining = await db.get("offline_actions", actionId);
			expect(remaining).toBeUndefined();
		});
	});
});
