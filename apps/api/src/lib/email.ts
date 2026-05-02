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

export async function sendNfseToAccounting(
  env: Env,
  to: string,
  data: { 
    numeroNfse: string;
    tomadorNome: string;
    valor: number;
    linkNfse: string;
    razaoSocialPrestador: string;
  },
) {
  const resend = createResend(env);
  if (!resend) return;
  
  await resend.emails.send({
    from: FROM(env),
    to,
    subject: `[NFS-e] Nova Nota Emitida - ${data.razaoSocialPrestador} - NF nº ${data.numeroNfse}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">Nova NFS-e Emitida</h2>
        <p>Prezada contabilidade,</p>
        <p>Uma nova Nota Fiscal de Serviço foi emitida pelo sistema <strong>FisioFlow</strong>.</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Prestador:</strong> ${data.razaoSocialPrestador}</p>
          <p style="margin: 5px 0;"><strong>Número da Nota:</strong> ${data.numeroNfse}</p>
          <p style="margin: 5px 0;"><strong>Tomador:</strong> ${data.tomadorNome}</p>
          <p style="margin: 5px 0;"><strong>Valor Total:</strong> R$ ${data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>

        <p style="text-align: center; margin-top: 30px;">
          <a href="${data.linkNfse}" style="background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Visualizar Nota no Portal
          </a>
        </p>
        
        <p style="margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; pt-20px;">
          Este é um envio automático do sistema FisioFlow.
        </p>
      </div>
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
