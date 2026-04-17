/**
 * Neon Auth JWT Verification para Cloudflare Workers (Powered by Better Auth)
 *
 * O Worker valida JWTs do Neon Auth usando JWKS remoto.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler, Context } from "hono";
import { getCookie } from "hono/cookie";
import type { Env } from "../types/env";
import { createPool, runWithOrg } from "./db";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/** ID da Organização Padrão (Clínica Única) */
export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
	const cached = jwksCache.get(url);
	if (cached) return cached;
	const jwks = createRemoteJWKSet(new URL(url));
	jwksCache.set(url, jwks);
	return jwks;
}

export interface AuthUser {
	uid: string;
	email?: string;
	organizationId: string;
	role?: string;
}

export type AuthVariables = { user: AuthUser };

type CandidateAuthContext = {
	uid: string;
	email?: string;
	organizationId?: string | null;
	role?: string | null;
};

async function resolveAuthContext(
	env: Env,
	candidate: CandidateAuthContext,
): Promise<AuthUser | null> {
	if (!candidate.uid) return null;

	try {
		const pool = createPool(env, undefined, 'write');
		let res = await pool.query(
			`
        SELECT user_id, email, role, organization_id
        FROM profiles
        WHERE user_id = $1
          AND organization_id IS NOT NULL
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
			[candidate.uid],
		);

		let row = res.rows?.[0];

		// Auto-sincronização por e-mail: Se não encontrou pelo UID mas temos e-mail,
		// tenta recuperar o perfil pelo e-mail e atualizar o UID automaticamente.
		if (!row && candidate.email) {
			const syncRes = await pool.query(
				`
        SELECT user_id, email, role, organization_id
        FROM profiles
        WHERE email = $1
          AND organization_id IS NOT NULL
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
				[candidate.email],
			);

			row = syncRes.rows?.[0];

			if (row) {
				console.log(
					`[Auth] Perfil encontrado por e-mail (${candidate.email}). Sincronizando UID: ${row.user_id} -> ${candidate.uid}`,
				);
				// Atualiza o UID de forma assíncrona para não atrasar a resposta
				pool.query(
					"UPDATE profiles SET user_id = $1, updated_at = NOW() WHERE email = $2",
					[candidate.uid, candidate.email],
				).catch((err) =>
					console.error("[Auth] Erro ao auto-sincronizar user_id:", err),
				);

				// Ajusta o row local para prosseguir com a autenticação
				row.user_id = candidate.uid;
			}
		}

		if (row?.organization_id) {
			return {
				uid: candidate.uid,
				email: row.email ?? candidate.email,
				organizationId: row.organization_id,
				role: row.role ?? candidate.role ?? "viewer",
			};
		}
	} catch (error) {
		console.error(
			"[Auth] Failed to resolve profile membership:",
			error instanceof Error ? error.message : String(error),
		);
	}

	if (candidate.organizationId) {
		return {
			uid: candidate.uid,
			email: candidate.email,
			organizationId: candidate.organizationId,
			role: candidate.role ?? "viewer",
		};
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

	if (!token) {
		token =
			c.req.query?.("token") ||
			getCookie(c, "better-auth.session-token") ||
			getCookie(c, "auth_session") ||
			getCookie(c, "__session");
	}

	if (!token) {
		console.log("[Auth] No token found in headers or cookies");
		return null;
	}

	// 2. Valida como JWT do Neon Auth
	const jwksUrl = env.NEON_AUTH_JWKS_URL;
	if (!jwksUrl) {
		console.error("[Auth] NEON_AUTH_JWKS_URL not configured");
		return null;
	}

	try {
		// Verificacao temporaria para tokens simples (32 caracteres)
		if (token.length < 50) {
			console.log(
				"[Auth] Token simples detectado, usando fallback de validacao",
			);

			// Fallback A: Chamada ao /get-session do Neon Auth (Better Auth)
			// Nota: Better Auth precisa do cookie para o /get-session funcionar corretamente
			if (env.NEON_AUTH_URL) {
				try {
					const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
						headers: {
							Authorization: `Bearer ${token}`,
							Cookie: `better-auth.session-token=${token}`,
						},
					});
					if (sessionRes.ok) {
						const sessionData = (await sessionRes.json()) as any;
						const candidate = getSessionCandidate(sessionData);
						if (candidate) {
							console.log("[Auth] Sessao validada via /get-session");
							return await resolveAuthContext(env, candidate);
						}
					}
				} catch (e) {
					console.error("[Auth] Erro na validacao via fetch:", e);
				}
			}

			// Fallback B: Consulta direta ao banco de dados (mais robusto)
			try {
				const pool = createPool(env, undefined, 'write');
				const res = await pool.query(
					`
          SELECT s."userId", u.email, u.role, p.organization_id
          FROM neon_auth.session s
          JOIN neon_auth."user" u ON s."userId" = u.id
          LEFT JOIN public.profiles p ON s."userId"::text = p.user_id
          WHERE s.token = $1 AND s."expiresAt" > now()
          LIMIT 1
        `,
					[token],
				);

				if (res.rows && res.rows.length > 0) {
					const row = res.rows[0];
					console.log("[Auth] Sessao validada via DB para userId:", row.userId);
					return await resolveAuthContext(env, {
						uid: row.userId,
						email: row.email,
						organizationId: row.organization_id,
						role: row.role,
					});
				}
			} catch (dbErr) {
				console.error("[Auth] Erro na validacao via DB:", dbErr);
			}

			console.error("[Auth] Token simples nao pode ser validado");
			return null;
		}

		const jwks = getJwks(jwksUrl);

		// Validacao Robusta:

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
		if (!userId) {
			console.error("[Auth] Token verified but userId missing", payload);
			return null;
		}

		return await resolveAuthContext(env, {
			uid: userId,
			email: payload.email as string,
			organizationId:
				(payload as any).orgId || (payload as any).organizationId || null,
			role: (payload as any).role || null,
		});
	} catch (e) {
		console.error(
			"[Auth Error] JWT verification failed:",
			e instanceof Error ? e.message : String(e),
		);

		if (env.NEON_AUTH_URL) {
			try {
				const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
					headers: {
						Authorization: `Bearer ${token}`,
						Cookie: `better-auth.session-token=${token}`,
					},
				});
				if (sessionRes.ok) {
					const sessionData = (await sessionRes.json()) as any;
					const candidate = getSessionCandidate(sessionData);
					if (candidate) {
						return await resolveAuthContext(env, candidate);
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
