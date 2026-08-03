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
  const { error } = await resend.emails.send({
    from: resolveFrom(env),
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  if (error) throw new Error(error.message ?? "Falha ao enviar e-mail via Resend");
  return true;
}

export async function sendViaCloudflare(env: Env, message: EmailMessage): Promise<boolean> {
  if (!env.EMAIL) return false;
  await env.EMAIL.send({
    from: resolveFrom(env),
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  return true;
}
