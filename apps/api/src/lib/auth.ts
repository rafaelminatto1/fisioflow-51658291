/**
 * Neon Auth JWT Verification para Cloudflare Workers (Powered by Better Auth)
 *
 * O Worker valida JWTs do Neon Auth usando JWKS remoto.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler, Context } from "hono";
import { getCookie } from "hono/cookie";
import type { Env } from "../types/env";
import { runWithOrg, getRawSql } from "./db";
import { withTimeout } from "./dbWrapper";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const verifiedTokenCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const authUserCacheByUid = new Map<string, { user: AuthUser; expiresAt: number }>();
const authUserCacheByEmail = new Map<string, { user: AuthUser; expiresAt: number }>();
const VERIFIED_TOKEN_CACHE_TTL_MS = 60_000;
const AUTH_USER_CACHE_TTL_MS = 10 * 60_000;
const AUTH_PROFILE_LOOKUP_TIMEOUT_MS = 12_000;
const AUTH_SESSION_LOOKUP_TIMEOUT_MS = 20_000;
const AUTH_GET_SESSION_TIMEOUT_MS = 5_000;
const DEFAULT_AUTH_ORIGIN = "https://www.moocafisio.com.br";

/** ID da Organização Padrão (Clínica Única) */
export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
	const cached = jwksCache.get(url);
	if (cached) return cached;
	const jwks = createRemoteJWKSet(new URL(url));
	jwksCache.set(url, jwks);
	return jwks;
}

function getCachedVerifiedToken(token: string): AuthUser | null {
	const cached = verifiedTokenCache.get(token);
	if (!cached) return null;
	if (cached.expiresAt <= Date.now()) {
		verifiedTokenCache.delete(token);
		return null;
	}
	return cached.user;
}

function cacheVerifiedToken(token: string, user: AuthUser | null): AuthUser | null {
	if (!user) return null;
	verifiedTokenCache.set(token, {
		user,
		expiresAt: Date.now() + VERIFIED_TOKEN_CACHE_TTL_MS,
	});
	return user;
}

export interface AuthUser {
	uid: string;
	email?: string;
	organizationId: string;
	role?: string;
}

export type AuthVariables = { user: AuthUser; requestId?: string };
type TokenSource = "authorization" | "query" | "cookie";

type CandidateAuthContext = {
	uid: string;
	email?: string;
	organizationId?: string | null;
	role?: string | null;
};

function normalizeEmailKey(email?: string | null): string | null {
	if (!email) return null;
	return email.trim().toLowerCase();
}

function getCachedAuthUserByKey(
	cache: Map<string, { user: AuthUser; expiresAt: number }>,
	key?: string | null,
): AuthUser | null {
	if (!key) return null;
	const cached = cache.get(key);
	if (!cached) return null;
	if (cached.expiresAt <= Date.now()) {
		cache.delete(key);
		return null;
	}
	return cached.user;
}

function cacheResolvedAuthUser(user: AuthUser): AuthUser {
	const expiresAt = Date.now() + AUTH_USER_CACHE_TTL_MS;
	authUserCacheByUid.set(user.uid, { user, expiresAt });
	const emailKey = normalizeEmailKey(user.email);
	if (emailKey) {
		authUserCacheByEmail.set(emailKey, { user, expiresAt });
	}
	return user;
}

function getCachedResolvedAuthUser(candidate: CandidateAuthContext): AuthUser | null {
	const byUid = getCachedAuthUserByKey(authUserCacheByUid, candidate.uid);
	if (byUid) return byUid;

	const byEmail = getCachedAuthUserByKey(
		authUserCacheByEmail,
		normalizeEmailKey(candidate.email),
	);
	if (!byEmail) return null;

	return {
		...byEmail,
		uid: candidate.uid || byEmail.uid,
		email: candidate.email ?? byEmail.email,
	};
}

export function primeAuthUserCache(user: AuthUser | null | undefined): void {
	if (!user?.uid || !user.organizationId || user.organizationId === DEFAULT_ORG_ID) {
		return;
	}
	cacheResolvedAuthUser(user);
}

async function resolveAuthContext(
	env: Env,
	candidate: CandidateAuthContext,
): Promise<AuthUser | null> {
	if (!candidate.uid) return null;

	const cachedUser = getCachedResolvedAuthUser(candidate);
	if (cachedUser) {
		return cacheResolvedAuthUser(cachedUser);
	}

	try {
		const sql = getRawSql(env, "write");
		let res = await withTimeout(
			sql(
				`
        SELECT user_id, email, role, organization_id
        FROM profiles
        WHERE user_id = $1
          AND organization_id IS NOT NULL
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
				[candidate.uid],
			),
			AUTH_PROFILE_LOOKUP_TIMEOUT_MS,
			"auth resolve profile by user_id",
		);

		let row = res.rows?.[0];

		// Auto-sincronização por e-mail: Se não encontrou pelo UID mas temos e-mail,
		// tenta recuperar o perfil pelo e-mail e atualizar o UID automaticamente.
		if (!row && candidate.email) {
			const syncRes = await withTimeout(
				sql(
					`
        SELECT user_id, email, role, organization_id
        FROM profiles
        WHERE email = $1
          AND organization_id IS NOT NULL
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
					[candidate.email],
				),
				AUTH_PROFILE_LOOKUP_TIMEOUT_MS,
				"auth resolve profile by email",
			);

			row = syncRes.rows?.[0];

			if (row) {
			        console.log(
			                `[Auth] Perfil encontrado por e-mail (${candidate.email}). Sincronizando UID: ${row.user_id} -> ${candidate.uid}`,
			        );

			        // Atualiza o UID de forma assíncrona para não atrasar a resposta
			        sql(
			                "UPDATE profiles SET user_id = $1, updated_at = NOW() WHERE email = $2",
			                [candidate.uid, candidate.email],
			        ).catch((err) =>
			                console.error("[Auth] Erro ao auto-sincronizar user_id:", err),
			        );

			        // Ajusta o row local para prosseguir com a autenticação
			        row.user_id = candidate.uid;
			}		}

		if (row?.organization_id) {
			return cacheResolvedAuthUser({
				uid: candidate.uid,
				email: row.email ?? candidate.email,
				organizationId: row.organization_id,
				role: row.role ?? candidate.role ?? "viewer",
			});
		}
	} catch (error) {
		console.error(
			"[Auth] Failed to resolve profile membership:",
			error instanceof Error ? error.message : String(error),
		);

		const fallbackCachedUser = getCachedResolvedAuthUser(candidate);
		if (fallbackCachedUser) {
			console.log("[Auth] Reusing cached profile membership after lookup failure");
			return cacheResolvedAuthUser(fallbackCachedUser);
		}
	}

	if (candidate.organizationId) {
		const resolvedFromCandidate = {
			uid: candidate.uid,
			email: candidate.email,
			organizationId: candidate.organizationId,
			role: candidate.role ?? "viewer",
		};
		return candidate.organizationId === DEFAULT_ORG_ID
			? resolvedFromCandidate
			: cacheResolvedAuthUser(resolvedFromCandidate);
	}

	// Fallback para organização padrão quando o token é válido mas não há membership explícito.
	// Isso permite que novos usuários acessem o sistema para completar seu cadastro.
	console.log(
		"[Auth] Token verified but no organization membership was found for user:",
		candidate.uid,
		". Falling back to DEFAULT_ORG_ID.",
	);

	return {
		uid: candidate.uid,
		email: candidate.email,
		organizationId: DEFAULT_ORG_ID,
		role: candidate.role ?? "viewer",
	};
}

function getSessionCandidate(sessionData: any): CandidateAuthContext | null {
	const userId = sessionData?.user?.id || sessionData?.session?.userId;
	if (!userId) return null;
	return {
		uid: userId,
		email: sessionData.user?.email,
		organizationId:
			sessionData.user?.organizationId || sessionData.user?.orgId || null,
		role: sessionData.user?.role || null,
	};
}

function looksLikeJwt(token: string): boolean {
	return token.split(".").length === 3;
}

function normalizeSessionLookupToken(token: string): string {
	return looksLikeJwt(token) ? token : token.split(".")[0] || token;
}

function getPreferredAuthOrigin(env: Env): string {
	const rawOrigins = String(env.ALLOWED_ORIGINS || "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);

	const preferred =
		rawOrigins.find((origin) => origin === "https://www.moocafisio.com.br") ||
		rawOrigins.find((origin) => origin === "https://moocafisio.com.br") ||
		rawOrigins.find((origin) => origin.startsWith("https://") && !origin.includes("localhost")) ||
		rawOrigins[0];

	return preferred || DEFAULT_AUTH_ORIGIN;
}

async function resolveJwtCandidate(
	env: Env,
	token: string,
): Promise<AuthUser | null> {
	const jwksUrl = env.NEON_AUTH_JWKS_URL;
	if (!jwksUrl || !looksLikeJwt(token)) return null;

	const jwks = getJwks(jwksUrl);
	const verifyOptions: Parameters<typeof jwtVerify>[2] = {
		clockTolerance: "10m",
	};
	if (env.NEON_AUTH_ISSUER) {
		verifyOptions.issuer = env.NEON_AUTH_ISSUER;
	}
	if (env.NEON_AUTH_AUDIENCE) {
		verifyOptions.audience = env.NEON_AUTH_AUDIENCE;
	}

	const { payload } = await jwtVerify(token, jwks, verifyOptions);
	const userId =
		(payload.sub as string) || (payload as any).userId || (payload as any).id;
	if (!userId) return null;

	return resolveAuthContext(env, {
		uid: userId,
		email: payload.email as string,
		organizationId:
			(payload as any).orgId || (payload as any).organizationId || null,
		role: (payload as any).role || null,
	});
}

/**
 * Extrai e verifica o token Neon Auth.
 * Aceita Header Authorization ou Cookies do Better Auth.
 */
export async function verifyToken<E extends { Bindings: Env }>(
	c: Context<E>,
	env: Env,
): Promise<AuthUser | null> {
	// 1. Tenta obter o token (header, query param para WebSocket, ou cookie)
	let token = c.req.header("Authorization")?.replace("Bearer ", "");
	let tokenSource: TokenSource | null = token ? "authorization" : null;
	let sessionCookieValue: string | undefined;

	if (!token) {
		token = c.req.query?.("token");
		tokenSource = token ? "query" : null;
	}

	if (!token) {
		sessionCookieValue =
			getCookie(c, "__Secure-neon-auth.session_token") ||
			getCookie(c, "better-auth.session-token") ||
			getCookie(c, "auth_session") ||
			getCookie(c, "__session");
		token = sessionCookieValue;
		tokenSource = token ? "cookie" : null;
	}

	if (!token) {
		console.log("[Auth] No token found in headers or cookies");
		return null;
	}

	const cachedUser = getCachedVerifiedToken(token);
	if (cachedUser) {
		return cachedUser;
	}

	// 2. Valida como JWT do Neon Auth
	const jwksUrl = env.NEON_AUTH_JWKS_URL;
	if (!jwksUrl) {
		console.error("[Auth] NEON_AUTH_JWKS_URL not configured");
		return null;
	}

	try {
		// Tokens opacos/sessão do Better Auth não são JWTs e precisam de um fluxo separado.
		if (!looksLikeJwt(token)) {
			console.log(
				"[Auth] Token de sessão opaco detectado, usando fallback de validacao",
			);
			const lookupToken = normalizeSessionLookupToken(token);

			// Fallback A: Better Auth /get-session pode materializar um JWT em `set-auth-jwt`
			// ou devolver a sessão diretamente, sem depender do lookup pesado em neon_auth.session.
			if (env.NEON_AUTH_URL) {
				const origin = getPreferredAuthOrigin(env);
				const sessionCookieHeader = sessionCookieValue
					? `__Secure-neon-auth.session_token=${sessionCookieValue}`
					: undefined;
				const controller = new AbortController();
				const timeoutId = setTimeout(
					() => controller.abort("auth-get-session-timeout"),
					AUTH_GET_SESSION_TIMEOUT_MS,
				);
				try {
					const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
						method: "GET",
						headers: {
							Accept: "application/json",
							...(tokenSource === "authorization" || tokenSource === "query"
								? { Authorization: `Bearer ${lookupToken}` }
								: {}),
							...(sessionCookieHeader
								? { Cookie: sessionCookieHeader }
								: {}),
							Origin: origin,
						},
						signal: controller.signal,
					});
					if (sessionRes.ok) {
						const authJwt = sessionRes.headers.get("set-auth-jwt");
						if (authJwt && looksLikeJwt(authJwt)) {
							console.log("[Auth] JWT materializado via /get-session");
							const resolved = await resolveJwtCandidate(env, authJwt);
							if (resolved) {
								return cacheVerifiedToken(token, resolved);
							}
						}

						const sessionData = (await sessionRes.json()) as any;
						const candidate = getSessionCandidate(sessionData);
						if (candidate) {
							console.log("[Auth] Sessao validada via /get-session");
							return cacheVerifiedToken(token, await resolveAuthContext(env, candidate));
						}
					} else {
						console.warn("[Auth] /get-session respondeu com status inesperado:", sessionRes.status);
					}
				} catch (e) {
					console.error("[Auth] Erro na validacao via fetch:", e);
				} finally {
					clearTimeout(timeoutId);
				}
			}

			// Fallback B: Consulta direta ao banco de dados
			try {
				const sql = getRawSql(env, 'write');
				const res = await withTimeout(
					sql(
						`
          SELECT s."userId", u.email, u.role, p.organization_id
          FROM neon_auth.session s
          JOIN neon_auth."user" u ON s."userId" = u.id
          LEFT JOIN public.profiles p ON s."userId"::text = p.user_id
          WHERE s.token = $1 AND s."expiresAt" > now()
          LIMIT 1
        `,
						[lookupToken],
					),
					AUTH_SESSION_LOOKUP_TIMEOUT_MS,
					"auth validate short token via db",
				);

				if (res.rows && res.rows.length > 0) {
					const row = res.rows[0];
					console.log("[Auth] Sessao validada via DB para userId:", row.userId);
					if (row.organization_id) {
						return cacheVerifiedToken(token, {
							uid: row.userId,
							email: row.email,
							organizationId: row.organization_id,
							role: row.role ?? "viewer",
						});
					}
					return cacheVerifiedToken(token, await resolveAuthContext(env, {
						uid: row.userId,
						email: row.email,
						organizationId: row.organization_id,
						role: row.role,
					}));
				}
			} catch (dbErr) {
				console.error("[Auth] Erro na validacao via DB:", dbErr);
			}

			console.error("[Auth] Token simples nao pode ser validado");
			return null;
		}

		return cacheVerifiedToken(token, await resolveJwtCandidate(env, token));
	} catch (e) {
		console.error(
			"[Auth Error] JWT verification failed:",
			e instanceof Error ? e.message : String(e),
		);

		if (env.NEON_AUTH_URL) {
			try {
				const origin = getPreferredAuthOrigin(env);
				const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
						...(sessionCookieValue
							? { Cookie: `__Secure-neon-auth.session_token=${sessionCookieValue}` }
							: {}),
						Origin: origin,
					},
				});
				if (sessionRes.ok) {
					const sessionData = (await sessionRes.json()) as any;
					const candidate = getSessionCandidate(sessionData);
					if (candidate) {
						return cacheVerifiedToken(token, await resolveAuthContext(env, candidate));
					}
				}
			} catch (sessionErr) {
				console.error(
					"[Auth Error] Session fallback failed:",
					sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
				);
			}
		}
		return null;
	}
}


export const requireAuth: MiddlewareHandler<{
	Bindings: Env;
	Variables: { user: AuthUser };
}> = async (c, next) => {
	const user = await verifyToken(c, c.env);
	if (!user) {
		return c.json(
			{
				error: "Nao autorizado",
				code: "UNAUTHORIZED",
				message:
					"Sua sessao expirou ou o token e invalido. Por favor, faca login novamente.",
			},
			401,
		);
	}
	c.set("user", user);
	await runWithOrg(user.organizationId, () => next());
};
