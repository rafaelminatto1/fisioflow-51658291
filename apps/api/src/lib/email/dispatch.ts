import type { Env } from "../../types/env";
import type { EmailMessage } from "./types";
import { sendViaResend, sendViaCloudflare } from "./transports";

const SHADOW_TIMEOUT_MS = 3000;

/** Nunca rejeita: resolve com o resultado da sombra ou, no timeout, com undefined. */
function withShadowTimeout(shadow: Promise<boolean>, ms: number): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    shadow.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

export async function sendEmail(env: Env, message: EmailMessage): Promise<boolean> {
  const mode = env.EMAIL_TRANSPORT ?? "resend";

  if (mode === "cloudflare") return sendViaCloudflare(env, message);

  const result = await sendViaResend(env, message);

  if (mode === "shadow" && env.EMAIL_SHADOW_TO) {
    const shadow = sendViaCloudflare(env, { ...message, to: env.EMAIL_SHADOW_TO }).catch((err) => {
      console.error(JSON.stringify({ level: "warn", message: "shadow email falhou", err: String(err) }));
      return false;
    });
    await withShadowTimeout(shadow, SHADOW_TIMEOUT_MS);
  }

  return result;
}
