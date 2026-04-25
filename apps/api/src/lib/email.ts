import { Resend } from "resend";
import type { Env } from "../types/env";

export function createResend(env: Env) {
  if (!env.RESEND_API_KEY) return null;
  return new Resend(env.RESEND_API_KEY);
}

const FROM = (env: Env) => env.RESEND_FROM_EMAIL ?? "FisioFlow <noreply@moocafisio.com.br>";

export async function sendAppointmentReminderEmail(
  env: Env,
  to: string,
  data: { patientName: string; date: string; time: string; therapistName?: string },
) {
  const resend = createResend(env);
  if (!resend) return;
  await resend.emails.send({
    from: FROM(env),
    to,
    subject: `Lembrete: Consulta amanhã às ${data.time}`,
    html: `
      <p>Olá, <strong>${data.patientName}</strong>!</p>
      <p>Você tem uma consulta agendada para <strong>amanhã, ${data.date} às ${data.time}</strong>.</p>
      ${data.therapistName ? `<p>Fisioterapeuta: ${data.therapistName}</p>` : ""}
      <p>Em caso de dúvidas, entre em contato conosco.</p>
      <hr><p><small>FisioFlow — Sistema de Gestão de Fisioterapia</small></p>
    `,
  });
}

export async function sendTestEmail(env: Env, to: string) {
  const resend = createResend(env);
  if (!resend) throw new Error("RESEND_API_KEY não configurado");
  return resend.emails.send({
    from: FROM(env),
    to,
    subject: "Email de teste — FisioFlow",
    html: "<p>Email de teste enviado com sucesso via Resend 🎉</p>",
  });
}
