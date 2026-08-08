import { betterAuth } from "better-auth";
import type { Env } from "../../types/env";
import { getGoogleConfig, getAppleConfig } from "./social-providers";

// Note: This config assumes Better Auth is installed and available.
// Database adapter should use Drizzle/Neon in the actual implementation.

export function createBetterAuthConfig(env: Env) {
  const googleConfig = getGoogleConfig(env);
  const appleConfig = getAppleConfig(env);

  return betterAuth({
    database: {
      // Configuration for Drizzle + Neon adapter
      // db: drizzleInstance
      dialect: "postgres",
      schema: "neon_auth",
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
    },
    socialProviders: {
      google: {
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
      },
      apple: {
        clientId: appleConfig.clientId,
        teamId: appleConfig.teamId,
        privateKey: appleConfig.privateKey,
        keyId: appleConfig.keyId,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    // Optional plugins
    plugins: [
      // e.g. organization plugin if needed
    ],
  });
}
