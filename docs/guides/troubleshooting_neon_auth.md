# Troubleshooting Guide: Neon Auth & Better Auth

This guide addresses common issues encountered when integrating Neon Auth (powered by Better Auth) with Cloudflare Workers and React.

## 1. Error: "Não autorizado" (401 Unauthorized)

### Symptom

API requests return a 401 status with the code `UNAUTHORIZED`.

### Common Causes & Solutions

- **Expired Session:** The JWT or session token has reached its `expiresAt` limit.
  - _Solution:_ Check the `expiresAt` column in the `neon_auth.session` table. Ensure the client is performing a refresh flow.
- **Clock Skew:** The server clock (Cloudflare) and Neon Auth clock are out of sync.
  - _Solution:_ The `verifyToken` function in `lib/auth.ts` includes a `clockTolerance: '10m'`. If skews are larger, verify the system time parameters.
- **Missing Environment Variables:** `NEON_AUTH_JWKS_URL` or `NEON_AUTH_URL` are not configured in the Worker.
  - _Solution:_ Verify `wrangler secrets list` and ensure these variables are present.

## 2. Token Fallback Issues

### Symptom

A "Simple Token" (opaque token instead of JWT) is being sent.

### Technical Detail

FisioFlow's `lib/auth.ts` has a specific fallback for tokens under 50 characters:

1. It tries calling `${env.NEON_AUTH_URL}/get-session`.
2. As a last resort, it queries the `neon_auth.session` table directly.

### Solution

Ensuse the `better-auth.session-token` cookie is correctly configured with `SameSite: None` and `Secure: true` if the API and Frontend are on different subdomains.

## 3. CORS Failures in Preflight

### Symptom

Browser console shows "CORS error" or "Method not allowed" before reaching the logic.

### Solution

Verify the `ALLOWED_ORIGINS` environment variable. It must be a comma-separated list of EXACT origins (including protocol and port):
`ALLOWED_ORIGINS=https://app-paciente.fisioflow.com,https://app-pro.fisioflow.com`

## 4. Database Latency during Auth

### Symptom

Auth requests are slow ( > 500ms).

### Solution

Enable **Cloudflare Hyperdrive**. Ensure the connection string used for auth fallback queries uses the Hyperdrive endpoint instead of the direct Neon URL to avoid cold-start handshakes.
