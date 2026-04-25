import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS_URL = process.env.NEON_AUTH_JWKS_URL!;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("f-auth-token");

  if (!token) return null;

  try {
    if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL));

    const { payload } = await jwtVerify(token.value, jwks, {
      clockTolerance: "5m",
    });

    return {
      userId: payload.sub as string,
      organizationId: (payload as any).orgId || (payload as any).organizationId,
      role: (payload as any).role,
    };
  } catch (e) {
    console.error("[AuthSession] Error:", e);
    return null;
  }
}
