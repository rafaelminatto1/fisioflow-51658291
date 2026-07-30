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
    subject: `Lembrete: Sessão amanhã às ${data.time}`,
    html: `
      <p>Olá, <strong>${data.patientName}</strong>!</p>
      <p>Você tem uma sessão agendada para <strong>amanhã, ${data.date} às ${data.time}</strong>.</p>
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

export async function sendNfseCancellationToAccounting(
  env: Env,
  to: string,
  data: {
    numeroNfse: string;
    tomadorNome: string;
    valor: number;
    razaoSocialPrestador: string;
  },
) {
  const resend = createResend(env);
  if (!resend) return;

  await resend.emails.send({
    from: FROM(env),
    to,
    subject: `[CANCELAMENTO NFS-e] Nota Cancelada - ${data.razaoSocialPrestador} - NF nº ${data.numeroNfse}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; padding: 20px; border-radius: 10px;">
        <h2 style="color: #991b1b;">NFS-e Cancelada</h2>
        <p>Prezada contabilidade,</p>
        <p>Informamos que uma Nota Fiscal de Serviço foi <strong>CANCELADA</strong> no sistema FisioFlow.</p>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
          <p style="margin: 5px 0;"><strong>Prestador:</strong> ${data.razaoSocialPrestador}</p>
          <p style="margin: 5px 0;"><strong>Número da Nota Cancelada:</strong> ${data.numeroNfse}</p>
          <p style="margin: 5px 0;"><strong>Tomador:</strong> ${data.tomadorNome}</p>
          <p style="margin: 5px 0;"><strong>Valor Estornado:</strong> R$ ${data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>

        <p style="color: #666; font-size: 14px;">
          Por favor, procedam com os ajustes necessários em seus registros contábeis.
        </p>
        
        <p style="margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; pt-20px;">
          Este é um envio automático do sistema FisioFlow.
        </p>
      </div>
    `,
  });
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  fisioterapeuta: "Fisioterapeuta",
  estagiario: "Estagiário",
  paciente: "Paciente",
  parceiro: "Parceiro",
  recepcionista: "Recepcionista",
};

export async function sendInvitationEmail(
  env: Env,
  to: string,
  data: { role: string; inviteUrl: string; expiresAt?: string; invitedByEmail?: string },
) {
  const resend = createResend(env);
  if (!resend) throw new Error("RESEND_API_KEY não configurado");

  const roleLabel = ROLE_LABELS[data.role] ?? data.role;
  const expires = data.expiresAt ? new Date(data.expiresAt) : null;
  const expiresLabel =
    expires && !Number.isNaN(expires.getTime())
      ? expires.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : null;

  const { error } = await resend.emails.send({
    from: FROM(env),
    to,
    subject: `Seu acesso ao FisioFlow (${roleLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 24px; border-radius: 10px;">
        <h2 style="color: #333; margin-top: 0;">Você foi convidado para o FisioFlow</h2>
        <p>Olá!</p>
        <p>
          Foi criado um convite de acesso ao <strong>FisioFlow</strong>, o sistema de gestão da clínica,
          com o perfil de <strong>${roleLabel}</strong>.
        </p>
        <p>Para criar sua senha e entrar, clique no botão abaixo:</p>

        <p style="text-align: center; margin: 32px 0;">
          <a href="${data.inviteUrl}" style="background: #2563eb; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Criar minha conta
          </a>
        </p>

        <p style="font-size: 13px; color: #666;">
          Se o botão não funcionar, copie e cole este endereço no navegador:<br>
          <span style="word-break: break-all;">${data.inviteUrl}</span>
        </p>

        ${expiresLabel ? `<p style="font-size: 13px; color: #666;">Este convite é válido até <strong>${expiresLabel}</strong>.</p>` : ""}
        ${data.invitedByEmail ? `<p style="font-size: 13px; color: #666;">Convite enviado por ${data.invitedByEmail}.</p>` : ""}

        <p style="margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
          FisioFlow — Sistema de Gestão de Fisioterapia.
          Se você não esperava este convite, ignore este e-mail.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(error.message ?? "Falha ao enviar e-mail via Resend");
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

export async function sendPrescriptionEmail(
  env: Env,
  to: string,
  data: { patientName: string; pdfUrl: string; title: string },
) {
  const resend = createResend(env);
  if (!resend) return;
  await resend.emails.send({
    from: FROM(env),
    to,
    subject: `Sua Prescrição de Fisioterapia: ${data.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">Prescrição de Exercícios</h2>
        <p>Olá, <strong>${data.patientName}</strong>!</p>
        <p>Sua prescrição de fisioterapia (<strong>${data.title}</strong>) foi gerada e está disponível para acesso.</p>
        
        <p style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
          <a href="${data.pdfUrl}" style="background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Visualizar / Baixar Prescrição
          </a>
        </p>

        <p>Em caso de dúvidas, não hesite em contatar seu fisioterapeuta.</p>
        
        <p style="margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
          FisioFlow — Sistema de Gestão de Fisioterapia
        </p>
      </div>
    `,
  });
}
