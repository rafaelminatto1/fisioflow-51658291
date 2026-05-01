/**
 * webpush.ts — Web Push (RFC 8030) with VAPID for Cloudflare Workers.
 *
 * Uses the WebCrypto API available in the Workers runtime.
 * Requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.
 *
 * Generate keys with:
 *   node -e "const {generateVAPIDKeys}=require('web-push');console.log(generateVAPIDKeys())"
 * or:
 *   openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt -outform DER | base64 -w0
 */

import type { Env } from "../types/env";
import { createPool } from "./db";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// ── VAPID Helpers ────────────────────────────────────────────────────────────

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function buildVapidHeaders(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKeyB64: string,
  subject: string,
): Promise<{ Authorization: string; "Content-Encoding": string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const encode = (obj: object) =>
    uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));

  const signingInput = `${encode(header)}.${encode(claims)}`;

  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKeyB64);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;

  return {
    Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    "Content-Encoding": "aes128gcm",
  };
}

// ── Encryption (RFC 8291) ────────────────────────────────────────────────────

async function encryptPayload(
  payload: string,
  subscription: PushSubscription,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlToUint8Array(subscription.p256dh).buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey,
    256,
  );

  const authSecret = base64UrlToUint8Array(subscription.auth);
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey),
  );
  const clientPublicKeyRaw = base64UrlToUint8Array(subscription.p256dh);

  // HKDF for pseudorandom key
  const ikm = new Uint8Array([
    ...new Uint8Array(sharedSecret),
    ...authSecret,
    ...new TextEncoder().encode("Content-Encoding: auth\0"),
  ]);

  const hkdfKey = await crypto.subtle.importKey("raw", ikm.buffer as ArrayBuffer, "HKDF", false, ["deriveBits"]);

  const prk = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: authSecret.buffer as ArrayBuffer,
      info: new TextEncoder().encode("Content-Encoding: auth\0"),
    },
    hkdfKey,
    256,
  );

  // Derive CEK and NONCE
  const context = new Uint8Array([
    ...new TextEncoder().encode("P-256\0"),
    0,
    65,
    ...clientPublicKeyRaw,
    0,
    65,
    ...serverPublicKeyRaw,
  ]);

  const cekInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: aesgcm\0"),
    ...context,
  ]);
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: nonce\0"),
    ...context,
  ]);

  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, ["deriveBits"]);

  const [cekBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, prkKey, 128),
    crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96),
  ]);

  const cek = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);

  const payloadBytes = new TextEncoder().encode(payload);
  const padded = new Uint8Array([...payloadBytes, 0]);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBits }, cek, padded),
  );

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

// ── Public API ───────────────────────────────────────────────────────────────

async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload,
  env: Env,
): Promise<boolean> {
  const vapidPublicKey = env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT || "mailto:admin@fisioflow.com.br";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not configured — push not sent");
    return false;
  }

  try {
    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.svg",
      badge: payload.badge || "/icons/badge-72x72.svg",
      tag: payload.tag || "general",
      url: payload.url || "/",
      requireInteraction: payload.requireInteraction || false,
      vibrate: [100, 50, 100],
      data: payload.data || {},
    });

    const { ciphertext, salt, serverPublicKey } = await encryptPayload(body, subscription);
    const vapidHeaders = await buildVapidHeaders(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      subject,
    );

    const headers: Record<string, string> = {
      ...vapidHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aesgcm",
      Encryption: `salt=${uint8ArrayToBase64Url(salt)}`,
      "Crypto-Key": `dh=${uint8ArrayToBase64Url(serverPublicKey)};${vapidHeaders.Authorization.split(",")[1]?.trim() || ""}`,
      TTL: "86400",
    };

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      body: ciphertext.buffer as ArrayBuffer,
    });

    if (response.status === 410 || response.status === 404) {
      // Subscription expired — caller should remove it
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error("[WebPush] Error sending push:", error);
    return false;
  }
}

/**
 * Send a push notification to a specific user (all their active subscriptions).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  env: Env,
): Promise<void> {
  const pool = await createPool(env);
  try {
    const result = await pool.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions
       WHERE user_id = $1 AND active = true AND p256dh IS NOT NULL AND auth IS NOT NULL`,
      [userId],
    );

    const expired: string[] = [];
    await Promise.allSettled(
      result.rows.map(async (row: any) => {
        const ok = await sendPushToSubscription(
          { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
          payload,
          env,
        );
        if (!ok) expired.push(row.endpoint);
      }),
    );

    if (expired.length > 0) {
      await pool.query(
        `UPDATE push_subscriptions SET active = false WHERE endpoint = ANY($1)`,
        [expired],
      );
    }
  } catch (error) {
    console.error("[WebPush] sendPushToUser error:", error);
  }
}

/**
 * Send a push notification to all active users in an organization.
 */
export async function sendPushToOrg(
  organizationId: string,
  payload: PushPayload,
  env: Env,
): Promise<void> {
  const pool = await createPool(env);
  try {
    const result = await pool.query(
      `SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions
       WHERE organization_id = $1 AND active = true AND p256dh IS NOT NULL AND auth IS NOT NULL`,
      [organizationId],
    );

    const expired: string[] = [];
    await Promise.allSettled(
      result.rows.map(async (row: any) => {
        const ok = await sendPushToSubscription(
          { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
          payload,
          env,
        );
        if (!ok) expired.push(row.endpoint);
      }),
    );

    if (expired.length > 0) {
      await pool.query(
        `UPDATE push_subscriptions SET active = false WHERE endpoint = ANY($1)`,
        [expired],
      );
    }
  } catch (error) {
    console.error("[WebPush] sendPushToOrg error:", error);
  }
}
