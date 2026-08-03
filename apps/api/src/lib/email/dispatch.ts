import type { Env } from "../../types/env";
import type { EmailMessage } from "./types";
import { sendViaResend, sendViaCloudflare } from "./transports";

export async function sendEmail(env: Env, message: EmailMessage): Promise<boolean> {
  const mode = env.EMAIL_TRANSPORT ?? "resend";

  if (mode === "cloudflare") return sendViaCloudflare(env, message);

  if (mode === "shadow" && env.EMAIL_SHADOW_TO) {
    await sendViaCloudflare(env, { ...message, to: env.EMAIL_SHADOW_TO }).catch((err) => {
      console.error(JSON.stringify({ level: "warn", message: "shadow email falhou", err: String(err) }));
      return false;
    });
  }

  return sendViaResend(env, message);
}
