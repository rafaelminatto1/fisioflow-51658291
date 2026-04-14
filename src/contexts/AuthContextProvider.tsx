import React, { useEffect, useState, useCallback, useRef } from "react";
import { authClient } from "@/integrations/neon/auth";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { auditApi } from "@/api/v2";
import { profileApi } from "@/api/v2/system";
import {
	getNeonAccessToken,
	invalidateNeonTokenCache,
} from "@/lib/auth/neon-token";
import { getNeonAuthUrl } from "@/lib/config/neon";
import {
	AuthContextType,
	AuthContext,
	AuthError,
	AuthUser,
} from "./AuthContext";
import { Profile, RegisterFormData, UserRole } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { AppointmentService } from "@/services/appointmentService";
import { setupUserTracking, clearUserTracking } from "@/lib/services/initialization";

/** ID da Organização Padrão (Clínica Única) */
export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

interface NeonUserLike {
	id?: string;
	email?: string | null;
	name?: string | null;
	image?: string | null;
	emailVerified?: boolean;
	role?: string;
	organization_id?: string;
	organizationId?: string;
	user_metadata?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
}

interface NeonSessionResult {
	data?: {
		user?: NeonUserLike;
	};
}

interface PasswordChangePayload {
	newPassword: string;
	currentPassword: string;
}

function toAuthError(error: unknown, fallbackMessage: string): AuthError {
	if (error instanceof Error && error.message) {
		return { message: error.message };
	}

	return { message: fallbackMessage };
}

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [initialized, setInitialized] = useState(false);
	const [sessionCheckFailed, _setSessionCheckFailed] = useState(false);
	const queryClient = useQueryClient();
	const prefetchedOrgIdsRef = useRef(new Set<string>());

	const adaptNeonUser = useCallback((neonUser: NeonUserLike | null): AuthUser => {
		if (!neonUser?.id) {
			throw new Error("Usuário Neon inválido");
		}

		return {
			uid: neonUser.id,
			email: neonUser.email ?? null,
			displayName: neonUser.name ?? null,
			photoURL: neonUser.image ?? null,
			emailVerified: neonUser.emailVerified ?? false,
			getIdToken: async () => getNeonAccessToken(),
		};
	}, []);

	const prefetchDashboardData = useCallback(
		(orgId: string) => {
			if (!orgId || prefetchedOrgIdsRef.current.has(orgId)) return;
			prefetchedOrgIdsRef.current.add(orgId);
			const run = () => {
				queryClient.prefetchQuery({
					queryKey: ["appointments_v2", "list", orgId],
					queryFn: async () => {
						const data = await AppointmentService.fetchAppointments(orgId);
						return {
							data,
							isFromCache: false,
							cacheTimestamp: null,
							source: "workers",
						};
					},
					staleTime: 1000 * 60 * 5,
				});
			};
			if (typeof window !== "undefined" && "requestIdleCallback" in window) {
				window.requestIdleCallback(() => run(), { timeout: 3000 });
			} else {
				setTimeout(run, 1200);
			}
		},
		[queryClient],
	);

	const buildProfile = useCallback(
		(neonUser: NeonUserLike | undefined, adaptedUser: AuthUser): Profile => {
			const meta = (neonUser?.user_metadata ??
				neonUser?.metadata ??
				{}) as Record<string, unknown>;
			const organizationId =
				(typeof neonUser?.organization_id === "string" &&
					neonUser.organization_id) ||
				(typeof neonUser?.organizationId === "string" &&
					neonUser.organizationId) ||
				(typeof meta.organization_id === "string" && meta.organization_id) ||
				(typeof meta.organizationId === "string" && meta.organizationId) ||
				DEFAULT_ORG_ID;

			const role =
				(typeof neonUser?.role === "string" && neonUser.role) ||
				(typeof meta.role === "string" && meta.role) ||
				"admin";
			return {
				id: String(neonUser?.id ?? adaptedUser.uid),
				user_id: String(neonUser?.id ?? adaptedUser.uid),
				full_name: String(
					neonUser?.name ??
						adaptedUser.displayName ??
						adaptedUser.email?.split("@")[0] ??
						"Usuário",
				),
				role: role as UserRole,
				organization_id: organizationId,
				onboarding_completed: true,
				is_active: true,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
		},
		[],
	);

	const loadUserAndProfile = useCallback(
		async (newUser: AuthUser | null, neonUser?: NeonUserLike) => {
			setUser(newUser);
			if (newUser) {
				// 1. Inicia com perfil baseado na sessão (rápido)
				const initialProfile = buildProfile(neonUser, newUser);
				setProfile(initialProfile);

				// 2. Tenta carregar perfil completo do banco de dados (Neon DB)
				// Isso garante que mudanças no nome, CREFITO, etc. sejam refletidas após reload.
				try {
					const dbProfileRes = await profileApi.me();
					if (dbProfileRes?.data) {
						const dbProfile = dbProfileRes.data;
						setProfile((prev) =>
							prev
								? {
										...prev,
										full_name: dbProfile.full_name || prev.full_name,
										organization_id:
											dbProfile.organization_id || prev.organization_id,
										role: (dbProfile.role as UserRole) || prev.role,
										// Mescla outros campos do DB se disponíveis
										...dbProfile,
									}
								: null,
						);
					}
				} catch (e) {
					logger.warn("Falha ao carregar perfil completo do DB", e);
				}

				const currentOrgId = initialProfile?.organization_id || DEFAULT_ORG_ID;
				prefetchDashboardData(currentOrgId);
			} else {
				setProfile(null);
			}
			setInitialized(true);
			setLoading(false);
		},
		[buildProfile, prefetchDashboardData],
	);

	// Inicializa sessão Neon Auth
	useEffect(() => {
		let mounted = true;
		const init = async () => {
			try {
				console.log("[AuthContext] Iniciando verificação de sessão...");
				if (!initialized) setLoading(true); // Só mostra loading na primeira vez

				// Limita a 5s para não travar o carregamento
				const timeout = new Promise<null>((res) =>
					setTimeout(() => res(null), 5000),
				);
				const result = (await Promise.race([
					authClient.getSession(),
					timeout,
				])) as NeonSessionResult | null;

				console.log(
					"[AuthContext] Sessão recuperada:",
					result ? "Sim" : "Não/Timeout",
				);

				if (!mounted) return;

				if (result && "data" in result && result.data?.user) {
					await loadUserAndProfile(
						adaptNeonUser(result.data.user),
						result.data.user,
					);
				} else {
					await loadUserAndProfile(null);
				}
			} catch (error) {
				console.error("[AuthContext] Erro fatal na inicialização:", error);
				if (mounted) await loadUserAndProfile(null);
			} finally {
				if (mounted) {
					setLoading(false);
					setInitialized(true);
				}
			}
		};
		init();
		return () => {
			mounted = false;
		};
	}, [adaptNeonUser, loadUserAndProfile]);

	const signIn = async (
		email: string,
		password: string,
	): Promise<{ error?: AuthError | null }> => {
		try {
			setLoading(true);
			const { data, error } = await authClient.signIn.email({
				email,
				password,
			});

			if (error) {
				// Log de falha de login (antes do throw)
				try {
					await auditApi.create({
						action: "LOGIN_FAILURE",
						entity_type: "auth",
						metadata: {
							email,
							error: error.message,
							reason: "invalid_credentials",
							timestamp: new Date().toISOString(),
						},
					});
				} catch  {
					/* silent fail for audit */
				}

				throw new Error(error.message || "Credenciais inválidas");
			}

			if (data?.user) {
				await loadUserAndProfile(adaptNeonUser(data.user));
				setupUserTracking({
					uid: data.user.id,
					email: data.user.email,
					displayName: data.user.name,
				});
				void import("@/lib/analytics/posthog")
					.then(({ identifyUser }) =>
						identifyUser(data.user.id, data.user.email, data.user.name),
					)
					.catch((error) => {
						logger.warn(
							"Falha ao carregar identificação do PostHog",
							error,
							"AuthContext",
						);
					});

				// Log de sucesso de login
				try {
					await auditApi.create({
						action: "LOGIN_SUCCESS",
						entity_type: "auth",
						entity_id: data.user.id,
						metadata: {
							email,
							user_id: data.user.id,
							name: data.user.name,
							timestamp: new Date().toISOString(),
						},
					});
				} catch  {
					/* silent fail for audit */
				}
			}

			return { error: null };
		} catch (err: unknown) {
			logger.error("Erro no login", err, "AuthContextProvider");
			setLoading(false);
			return { error: toAuthError(err, "Erro ao fazer login") };
		}
	};

	const signUp = async (
		data: RegisterFormData,
	): Promise<{ error?: AuthError | null; user?: AuthUser | null }> => {
		try {
			setLoading(true);
			const { data: neonData, error } = await authClient.signUp.email({
				email: data.email,
				password: data.password,
				name: data.full_name,
			});
			if (error) throw new Error(error.message || "Erro ao cadastrar");
			const adapted = adaptNeonUser(neonData.user);
			await loadUserAndProfile(adapted);
			return { user: adapted, error: null };
		} catch (err: unknown) {
			logger.error("Erro no cadastro", err, "AuthContextProvider");
			setLoading(false);
			return { error: toAuthError(err, "Erro ao cadastrar") };
		}
	};

	const signOut = async (): Promise<void> => {
		setLoading(true);
		// 1. SDK signOut (clears internal session cache + broadcasts to other tabs)
		try {
			await authClient.signOut();
		} catch (e) {
			logger.warn(
				"Neon Auth signOut (SDK) falhou (ignorado)",
				e,
				"AuthContextProvider",
			);
		}
		// 2. Direct fetch to ensure server-side session/cookie invalidation.
		// The SDK does not always hit the network, so we call the endpoint directly.
		// We await this before clearing local state so the cookie is cleared before navigation.
		const neonAuthUrl = getNeonAuthUrl();
		if (neonAuthUrl) {
			try {
				await fetch(`${neonAuthUrl}/sign-out`, {
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: "{}",
				});
			} catch (e) {
				logger.warn(
					"Neon Auth signOut (direct) falhou (ignorado)",
					e,
					"AuthContextProvider",
				);
			}
		}
		invalidateNeonTokenCache();
		clearUserTracking();
		queryClient.clear();
		await loadUserAndProfile(null);
	};

	const resetPassword = async (email: string) => {
		try {
			await authClient.forgetPassword.emailOtp({
				email,
				redirectTo: `${window.location.origin}/auth/reset-password`,
			});
			return { error: null };
		} catch (err: unknown) {
			return { error: toAuthError(err, "Erro ao resetar senha") };
		}
	};

	const updatePassword = async (password: string) => {
		try {
			// Nota: O SDK do Neon Auth pode exigir a senha atual.
			// Aqui estamos fazendo o melhor esforço conforme a API sugere.
			const payload: PasswordChangePayload = {
				newPassword: password,
				currentPassword: "", // Caso seja obrigatório mas não tenhamos no contexto
			};
			await authClient.changePassword(payload);
			return { error: null };
		} catch (err: unknown) {
			return { error: toAuthError(err, "Erro ao atualizar senha") };
		}
	};

	const updateProfile = async (updates: Partial<Profile>) => {
		try {
			if (!user) return { error: { message: "Usuário não autenticado" } };

			// 1. Atualiza no banco de dados da aplicação (Neon DB)
			const profilePayload: Record<string, unknown> = {};
			if (updates.full_name !== undefined) {
				profilePayload.full_name = updates.full_name;
			}
			if (updates.birth_date !== undefined) {
				profilePayload.birth_date = updates.birth_date ?? null;
			}

			if (Object.keys(profilePayload).length > 0) {
				await profileApi.updateMe(profilePayload);
			}

			// 2. Atualiza no Neon Auth (Better Auth) se o nome mudou
			// Isso evita que o nome antigo volte em novas sessões ou reloads rápidos
			if (updates.full_name) {
				try {
					await authClient.updateUser({
						name: updates.full_name,
					});
				} catch (e) {
					logger.warn("Falha ao atualizar nome no Neon Auth", e);
				}
			}

			if (profile) setProfile({ ...profile, ...updates });
			return { error: null };
		} catch (err: unknown) {
			logger.error("Erro ao atualizar perfil", err, "AuthContextProvider");
			return { error: toAuthError(err, "Erro ao atualizar perfil") };
		}
	};

	const value: AuthContextType = {
		user,
		profile,
		loading,
		initialized,
		sessionCheckFailed,
		role: profile?.role as UserRole | undefined,
		signIn,
		signUp,
		signOut,
		resetPassword,
		updatePassword,
		updateProfile,
		refreshProfile: () => loadUserAndProfile(user),
		organizationId: profile?.organization_id || DEFAULT_ORG_ID,
		organization_id: profile?.organization_id || DEFAULT_ORG_ID,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
