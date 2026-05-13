import { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { Env } from "../../types/env";
import { runWithOrg } from "../db";

export interface PatientUser {
  id: string; // patient_portal_users.id
  patientId: string;
  organizationId: string;
  phone: string;
  role: "patient";
}

const patientJwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = patientJwksCache.get(url);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(new URL(url));
  patientJwksCache.set(url, jwks);
  return jwks;
}

/**
 * Middleware para validar a autenticação do paciente no portal.
 * Nota: Pacientes usam um segredo/fluxo de JWT diferente do staff para isolamento total.
 */
export const requirePatientAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: { patient: PatientUser };
}> = async (c, next) => {
  let token = c.req.header("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    token = getCookie(c, "patient_session_token");
  }

  if (!token) {
    return c.json({ error: "Portal: Acesso não autorizado" }, 401);
  }

  try {
    const jwksUrl = c.env.NEON_AUTH_JWKS_URL; // Reusing same infrastructure but could be specific
    if (!jwksUrl) throw new Error("JWKS_URL not configured");

    const jwks = getJwks(jwksUrl);
    const { payload } = await jwtVerify(token, jwks, {
      clockTolerance: "10m",
    });

    // Check if it's a patient token
    if (payload.role !== "patient") {
      return c.json({ error: "Acesso restrito ao portal do paciente" }, 403);
    }

    const patientId = (payload.patientId as string) || (payload.sub as string);
    const organizationId = payload.orgId as string;

    if (!patientId || !organizationId) {
      return c.json({ error: "Token inválido: informações de paciente ausentes" }, 401);
    }

    const patient: PatientUser = {
      id: payload.sub as string,
      patientId,
      organizationId,
      phone: payload.phone as string,
      role: "patient",
    };

    c.set("patient", patient);
    
    // RLS scoping
    return await runWithOrg(organizationId, () => next());
  } catch (error) {
    console.error("[PatientAuth] Verification failed:", error);
    return c.json({ error: "Sessão do portal expirada" }, 401);
  }
};
