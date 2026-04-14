import { fetchApi } from "./api";
import { getToken, setToken, clearToken } from "./token-storage";

export interface AuthResponse {
	user: any;
	token: string;
	refreshToken?: string;
}

let isRefreshing = false;
let refreshPromise: Promise<AuthResponse> | null = null;

export const authApi = {
	async login(email: string, password: string): Promise<AuthResponse> {
		const data = await fetchApi<AuthResponse>("/api/auth/login", {
			method: "POST",
			data: { email, password },
			skipAuth: true,
		});

		if (!data.token) {
			throw new Error("Token não recebido do servidor");
		}
		await setToken(data.token);
		return data;
	},

	async logout(): Promise<void> {
		try {
			const token = await getToken();
			if (token) {
				await fetchApi("/api/auth/logout", {
					method: "POST",
					timeout: 5000,
				}).catch(() => {});
			}
		} finally {
			await clearToken();
		}
	},

	async getToken(): Promise<string | null> {
		return getToken();
	},

	async getMe(): Promise<AuthResponse["user"]> {
		try {
			const data = await fetchApi<any>("/api/profile/me", {
				method: "GET",
				timeout: 8000,
			});
			return data.user || data;
		} catch (err: any) {
			if (err.status === 401) {
				try {
					await authApi.refreshToken();
					const data = await fetchApi<any>("/api/profile/me", {
						method: "GET",
						timeout: 8000,
					});
					return data.user || data;
				} catch {
					await clearToken();
					throw new Error("Falha ao validar sessão");
				}
			}
			throw new Error("Falha ao validar sessão");
		}
	},

	async resetPassword(email: string): Promise<void> {
		await fetchApi("/api/auth/reset-password", {
			method: "POST",
			data: { email },
			skipAuth: true,
		});
	},

	async resendVerificationEmail(email: string): Promise<void> {
		await fetchApi("/api/auth/send-verification-email", {
			method: "POST",
			data: { email },
			skipAuth: true,
		});
	},

	async updatePassword(newPassword: string): Promise<void> {
		await fetchApi("/api/auth/update-password", {
			method: "POST",
			data: { newPassword },
		});
	},

	async refreshToken(): Promise<AuthResponse> {
		if (isRefreshing && refreshPromise) {
			return refreshPromise;
		}

		isRefreshing = true;
		refreshPromise = (async () => {
			const currentToken = await getToken();
			if (!currentToken) {
				throw new Error("Token não disponível");
			}

			try {
				const data = await fetchApi<AuthResponse>("/api/auth/refresh", {
					method: "POST",
					data: { token: currentToken },
					skipAuth: true,
				});

				if (!data.token) {
					throw new Error("Token não recebido do servidor");
				}

				await setToken(data.token);
				return data;
			} catch (error) {
				await clearToken();
				throw error;
			} finally {
				isRefreshing = false;
				refreshPromise = null;
			}
		})();

		return refreshPromise;
	},
};
