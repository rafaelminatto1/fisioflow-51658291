import type { Env } from "../../types/env";

export interface SocialProviderToken {
  token: string;
  provider: "google" | "apple";
}

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
}

export interface AppleProviderConfig {
  clientId: string;
  teamId: string;
  privateKey: string;
  keyId: string;
}

export function getGoogleConfig(env: Env): GoogleProviderConfig {
  return {
    clientId: env.GOOGLE_AUTH_CLIENT_ID || "",
    clientSecret: env.GOOGLE_AUTH_CLIENT_SECRET || "",
  };
}

export function getAppleConfig(env: Env): AppleProviderConfig {
  return {
    clientId: env.APPLE_AUTH_CLIENT_ID || "",
    teamId: env.APPLE_AUTH_TEAM_ID || "",
    privateKey: env.APPLE_AUTH_PRIVATE_KEY || "",
    keyId: env.APPLE_AUTH_KEY_ID || "",
  };
}

export async function validateSocialToken(
  token: string,
  provider: "google" | "apple",
  env: Env,
): Promise<{ email: string; sub: string; name?: string } | null> {
  // TODO: Add JWKS validation for specific providers when Better Auth is fully integrated
  // For now, this is a placeholder for the integration
  return null;
}
