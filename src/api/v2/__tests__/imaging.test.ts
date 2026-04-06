import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();
const getWorkersApiUrlMock = vi.fn();

vi.mock("../base", () => ({
	request: (...args: unknown[]) => requestMock(...args),
}));

vi.mock("@/lib/api/config", () => ({
	getWorkersApiUrl: () => getWorkersApiUrlMock(),
}));

describe("api v2 imaging", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		getWorkersApiUrlMock.mockReturnValue("https://workers.example.com");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
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

	it("dicomApi.series faz encode dos study UIDs", async () => {
		requestMock.mockResolvedValueOnce({ data: [] });

		const { dicomApi } = await import("../imaging");

		await dicomApi.series("1.2.840/Study UID");

		expect(requestMock).toHaveBeenCalledWith(
			"/api/dicom/studies/1.2.840%2FStudy%20UID/series",
		);
	});

	it("dicomApi.uploadInstances dispara um POST por instância", async () => {
		requestMock
			.mockResolvedValueOnce({ data: { ok: true, id: "1" } })
			.mockResolvedValueOnce({ data: { ok: true, id: "2" } });

		const { dicomApi } = await import("../imaging");

		const result = await dicomApi.uploadInstances([
			{ body: "base64-a", fileName: "a.dcm" },
			{ body: "base64-b", fileName: "b.dcm" },
		]);

		expect(result).toHaveLength(2);
		expect(requestMock).toHaveBeenNthCalledWith(
			1,
			"/api/dicom/instances",
			{
				method: "POST",
				body: JSON.stringify({ body: "base64-a", fileName: "a.dcm" }),
			},
		);
		expect(requestMock).toHaveBeenNthCalledWith(
			2,
			"/api/dicom/instances",
			{
				method: "POST",
				body: JSON.stringify({ body: "base64-b", fileName: "b.dcm" }),
			},
		);
	});

	it("dicomApi.getWadoUrl usa a Workers API centralizada", async () => {
		const { dicomApi } = await import("../imaging");

		expect(dicomApi.getWadoUrl()).toBe(
			"https://workers.example.com/api/dicom/wado",
		);
	});
});
