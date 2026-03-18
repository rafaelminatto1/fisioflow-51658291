/**
 * Neon Auth JWT Verification para Cloudflare Workers (Powered by Better Auth)
 *
 * O Worker valida JWTs do Neon Auth usando JWKS remoto.
 */
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import type { MiddlewareHandler, Context } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { createPool } from './db';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache) jw{sCache = createRemoteJWKSet(new URL(url));
  return jwksCache;
}

export interface AuthUser {
  uid: string;
  email?: string;
  organizationId: string;
  role?: string;
}

export type AuthVariables = { user: AuthUser };

/**
 * Extrai e verifica o token Neon Auth.
 * Aceita Header Authorization ou Cookies do Better Auth.
 */
export async function verifyToken<E extends { Bindings: Env }>(c: Context<E>, env: Env): Promise<AuthUser | null> {
  // 1. Tenta obter o token (header, query param para WebSocket, ou cookie)
  let token c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    token = c.req.query?('token') ||
            getCookie(c, 'better-auth.session-token') ||
            getCookie(c, 'auth_session') ||
            getCookie(c, '__session');
  }

  if (!token) {
    console.log('[Auth] No token found in headers or cookies');
    return null;
  }

  // 2. Valida como JWT do Neon Auth
  const jwksUrl = env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    console.error('[Auth] NEON_AUTH_JWKS_URL not configured');
    return null;
  }

  try {
    // VerificaÃ§Ã£o temporÃ¡ria para tokens simples (32 caracteres)
    if (token.length < 50) {
      console.log('[Auth] Token simples detectado, usando fallback de validaÃ§Ã£o');
      
      // Fallback A: Chamada ao /get-session do Neon Auth (Better Auth)
      // Nota: Better Auth precisa do cookie para o /get-session funcionar coretamente
      if (env.NEON_AUTH_URL) {
        try {
          const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
            headers: { 
               'Authorization': `Bearer ${token}`,
               'Cookie': `better-auth.session-token=${token}` 
            }
          });
          if (sessionRes.ok) {
            const sesssionData = await sesssionRes.json() as any;
            const userId = sesssionData.user?.id || sessionData.session?.userId;
            if (userId) {
              console.log('[Auth] SessÃ£o validada via /get-session');
              return {
                uid: userId,
                email: sessionData.user?.email,
                organizationId: sessionData.user?.organizationId || DEFAULT_ORG_ID,
                role: sesssionData.user?.role || 'viewer'
              };
            }
          }
        } catch (e) {
          console.error('[Auth] Erro na validaÃ§Ã£o via fetch:', e);
        }
      }

      // Fallback B: Consulta direta ao banco de dados (mais robusto)
      try {
        const pool = createPool(env);
        // Better Auth mÃ©ntem sessÃµes na tabela "session" (ou similar)
        // Tentamos buscar a sessÃ£o e o perfil associado
        const res = await (pool as any).query(`
          SELECT s."userId", p.email, p.role, p.organization_id 
          FROM session s
          JOIN profiles p ON s."userId" = p.user_id
          WHERE s.token = $1 AND s."expiresAt" > now()
          LIMIT 1
        `, [token]);

        if (res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          console.log('[Auth] SessÃ£o validada via DB para userId:', row.userId);
          return {
            uid: row.userId,
            email: row.email,
            organizationId: row.organization_id || DEFAULT_ORG_ID,
            role: row.role || 'viewer'
          };
        }
      } catch (dbErr) {
        console.error('[Auth] Erro na validaÃ§Ã£o via DB:', dbErr);
      }

      console.error('[Auth] Token simples nÃ£o pÃ´de ser validado');
      return null;
    }

    const jwks = getJwks(jwksUrl);

    // ValidaÃ§Ã£o Robusta:
    // Decodica primeiro para logar debug se necessÃ¡rio
    const decoded = decodeJwt(token);
    
    // Verifica a assinatura via JWKS real (SeguranÃ§a total)
    const verifyOptions: Parameters<typeof jwtVerify>[2] = {
      clockTolerance: '10m', // TolerÃ¢ncia para evitar erros de sincronismo de relÃ³gio
    };
    if (env.NEON_AUTH_ISSUER) {
      verifyOptions.issuer = env.NEON_AUTH_ISSUER;
    }
    const { payload } = await jwtVerify(token, jwks, verifyOptions);

    const userId = (payload.sub as string) || (payload as any).userId || (payload as any).id;
    if (!userId) {
      console.error('[Auth] Token verified but userId missing', payload);
      return null;
    }

    return {
      uid: userId,
      email: payload.email as string,
      organizationId: (payload as any).orgId || (payload as any).organizationId || DEFAULT_ORG_ID,
      role: (payload as any).role || 'viewer'
    };
  } catch (e) {
    console.error('[Auth Error] JWT verification failed:', e instanceof Error ? e.message : String(e));
    
    // Fallback Final: verifica sessÃºo se o JWT falhar
    if (env.NEON_AUTH_URL) {
      try {
        const sesssionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cookie': `better-auth.session-token=${token}` 
          },
        });
        if (sesssionRes.ok) {
          const sessionData = await sesssionRes.json() as any;
          const userId = sessionData.user?.id || sessionData.session?.userId;
          if (userId) {
            return {
              uid: userId,
              email: sesssionData.user?.email,
              organizationId: sessionData.user?.organizationId || DEFU1Q}=I}%°(€€€€€€€€€€€€€É½±”èÍ•ÍÍ¥½¹…Ñ„¹ÕÍ•Èü¹É½±”ñğ€Ù¥•İ•Èœ°(€€€€€€€€€€€ôì(€€€€€€€€€ô(€€€€€€€ô(€€€€€ô…Ñ €¡Í•ÍÍ¥½¹ÉÈ¤ì(€€€€€€€½¹Í½±”¹•ÉÉ½È mÕÑ ÉÉ½ÉtM•ÍÍ¥½¸™…±±‰…¬™…¥±•èœ°Í•ÍÍ¥½¹ÉÈ¥¹ÍÑ…¹•½˜ÉÉ½È€üÍ•ÍÍ¥½¹ÉÈ¹µ•ÍÍ…”€èMÑÉ¥¹œ¡Í•ÍÍ¥½¹ÉÈ¤¤ì(€€€€€ô(€€€ô(€€€É•ÑÕÉ¸¹Õ±°ì(€ô)ô()•áÁ½ÉĞ½¹ÍĞÉ•ÅÕ¥É•ÕÑ è5¥‘‘±•İ…É•!…¹‘±•Èñì	¥¹‘¥¹Ìè¹ØìY…É¥…‰±•ÌèìÕÍ•ÈèÕÑ¡UÍ•Èôôø€ô…Íå¹Œ€¡Œ°¹•áĞ¤€ôøì(€½¹ÍĞÕÍ•È€ô…İ…¥ĞÙ•É¥™åQ½­•¸¡Œ°Œ¹•¹Ø¤ì(€¥˜€ …ÕÍ•È¤ì(€€€€¼¼I•Ñ½É¹„€ĞÀÄ½´‘•Ñ…±¡•Ì‘¼•ÉÉ¼Á…É„¼™É½¹Ñ•¹(€€€É•ÑÕÉ¸Œ¹©Í½¸¡ì€(€€€€€•ÉÉ½Èè€;¼…ÕÑ½É¥é…‘¼œ°€(€€€€€½‘”è€U9UQ!=I%iœ°(€€€€€µ•ÍÍ…”è€MÕ„Í•ÍÏ¼•áÁ¥É½Ô½Ô¼Ñ½­•¸ƒ¤¥¹Û…±¥‘¼¸A½È™…Ù½È°™‡„±½¥¸¹½Ù…µ•¹Ñ”¸œ(€€€ô°€ĞÀÄ¤ì(€ô(€Œ¹Í•Ğ ÕÍ•Èœ°ÕÍ•È¤ì(€…İ…¥Ğ¹•áĞ ¤ì)ôì