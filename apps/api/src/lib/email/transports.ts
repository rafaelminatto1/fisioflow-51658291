import { Resend } from "resend";
import type { Env } from "../../types/env";
import type { EmailMessage } from "./types";

const DEFAULT_FROM = "FisioFlow <noreply@moocafisio.com.br>";

export function resolveFrom(env: Env): string {
  return env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
}

export async function sendViaResend(env: Env, message: EmailMessage): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: resolveFrom(env),
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  return true;
}
