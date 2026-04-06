import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("../base", () => ({
	request: (...args: unknown[]) => requestMock(...args),
}));

describe("api v2 imaging", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("activityLab patients.list serializa apenas parâmetros preenchidos", async () => {
		requestMock.mockResolvedValueOnce({ data: [] });

		const { activityLabApi } = await import("../imaging");

		await activityLabApi.patients.list({
			search: "joão",
			limit: 10,
		});

		expect(requestMock).toHaveBeenCalledWith(
			"/api/activity-lab/patients?search=jo%C3%A3o&limit=10",
		);
	});

	it("dicomApi.config sinaliza descontinuidade do fluxo DICOM", async () => {
		const { dicomApi } = await import("../imaging");

		await expect(dicomApi.config()).resolves.toEqual({
			data: expect.objectContaining({
				enabled: false,
				deprecated: true,
			}),
		});
	});

	it("dicomApi.series falha com mensagem deprecada", async () => {
		const { dicomApi } = await import("../imaging");

		await expect(dicomApi.series("1.2.840/Study UID")).rejects.toThrow(
			/descontinuado/i,
		);
	});

	it("dicomApi.getWadoUrl falha com mensagem deprecada", async () => {
		const { dicomApi } = await import("../imaging");

		expect(() => dicomApi.getWadoUrl()).toThrow(/descontinuado/i);
	});
});
