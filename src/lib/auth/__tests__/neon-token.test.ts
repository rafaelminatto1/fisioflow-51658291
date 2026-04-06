import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthClient = {
	getSession: vi.fn(),
	token: vi.fn(),
};
let neonAuthEnabled = true;

vi.mock("@/integrations/neon/auth", () => ({
	authClient: mockAuthClient,
	isNeonAuthEnabled: () => neonAuthEnabled,
}));

vi.mock("@/lib/config/neon", () => ({
	getNeonAuthUrl: () => "https://auth.example.com/neondb/auth",
}));

function createJwt(expOffsetSeconds = 3600): string {
	const header = Buffer.from(
		JSON.stringify({ alg: "HS256", typ: "JWT" }),
	).toString("base64url");
	const payload = Buffer.from(
		JSON.stringify({
			exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
			sub: "user-123",
		}),
	).toString("base64url");
	return `${header}.${payload}.signature`;
}

describe("neon-token", () => {
	beforeEach(() => {
		vi.resetModules();
		neonAuthEnabled = true;
		mockAuthClient.getSession.mockReset();
		mockAuthClient.token.mockReset();
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(async () => {
		const mod = await import("../neon-token");
		mod.invalidateNeonTokenCache();
		vi.unstubAllGlobals();
	});

	it("uses authClient.token() when the SDK already has a JWT", async () => {
		const jwt = createJwt();
		mockAuthClient.token.mockResolvedValue({ data: { token: jwt } });
		const fetchMock = vi.mocked(fetch);

		const { getNeonAccessToken } = await import("../neon-token");

		await expect(getNeonAccessToken()).resolves.toBe(jwt);
		expect(mockAuthClient.token).toHaveBeenCalledTimes(1);
		expect(mockAuthClient.getSession).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("falls back to getSession() when token() fails", async () => {
		const jwt = createJwt();
		mockAuthClient.token.mockResolvedValue({ data: null, error: "fail" });
		mockAuthClient.getSession.mockResolvedValue({
			data: { session: { token: jwt } },
		});

		const { getNeonAccessToken } = await import("../neon-token");

		await expect(getNeonAccessToken()).resolves.toBe(jwt);
		expect(mockAuthClient.token).toHaveBeenCalledTimes(1);
		expect(mockAuthClient.getSession).toHaveBeenCalledTimes(1);
	});

	it("falls back to direct /get-session fetch when SDK session lacks a token", async () => {
		const jwt = createJwt();
		mockAuthClient.token.mockResolvedValue({ data: null });
		mockAuthClient.getSession.mockResolvedValue({
			data: { user: { id: "user-123" } },
		});

		const headers = new Headers({ "set-auth-jwt": jwt });
		vi.mocked(fetch).mockResolvedValue(
			new Response("{}", { status: 200, headers }),
		);

		const { getNeonAccessToken } = await import("../neon-token");

		await expect(getNeonAccessToken()).resolves.toBe(jwt);
		expect(fetch).toHaveBeenCalledWith(
			"https://auth.example.com/neondb/auth/get-session",
			expect.objectContaining({
				method: "GET",
				credentials: "include",
			}),
		);
	});

	it("reuses the cached JWT until the cache is invalidated", async () => {
		const jwt = createJwt();
		mockAuthClient.token.mockResolvedValue({ data: { token: jwt } });

		const { getNeonAccessToken, invalidateNeonTokenCache } = await import(
			"../neon-token"
		);

		await expect(getNeonAccessToken()).resolves.toBe(jwt);
		await expect(getNeonAccessToken()).resolves.toBe(jwt);
		expect(mockAuthClient.token).toHaveBeenCalledTimes(1);

		invalidateNeonTokenCache();
		await expect(getNeonAccessToken()).resolves.toBe(jwt);
		expect(mockAuthClient.token).toHaveBeenCalledTimes(2);
	});

	it("ignores cache when forceSessionReload is requested", async () => {
		const cachedJwt = createJwt(3600);
		const refreshedJwt = createJwt(7200);
		mockAuthClient.token
			.mockResolvedValueOnce({ data: { token: cachedJwt } })
			.mockResolvedValueOnce({ data: { token: refreshedJwt } });

		const { getNeonAccessToken } = await import("../neon-token");

		await expect(getNeonAccessToken()).resolves.toBe(cachedJwt);
		await expect(
			getNeonAccessToken({ forceSessionReload: true }),
		).resolves.toBe(refreshedJwt);
		expect(mockAuthClient.token).toHaveBeenCalledTimes(2);
	});

	it("throws a clear error when Neon Auth is disabled", async () => {
		neonAuthEnabled = false;

		const { getNeonAccessToken } = await import("../neon-token");

		await expect(getNeonAccessToken()).rejects.toThrow(
			"Neon Auth não está habilitado",
		);
	});

	it("rejects expired JWTs returned by the SDK", async () => {
		mockAuthClient.token.mockResolvedValue({
			data: { token: createJwt(-60) },
		});

		const { getNeonAccessToken } = await import("../neon-token");

		await expect(getNeonAccessToken()).rejects.toThrow(
			"Token JWT do Neon Auth expirado",
		);
	});
});
