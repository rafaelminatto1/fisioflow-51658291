import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { Resend } from 'resend';
import * as logger from 'firebase-functions/logger';

// Definir a chave secreta
const RESEND_API_KEY = defineString('RESEND_API_KEY');
const RESEND_FROM_EMAIL = defineString('RESEND_FROM_EMAIL');

// Instância do Resend
let resend: Resend;

const getResend = () => {
  if (!resend) {
    const key = RESEND_API_KEY.value();
    if (!key) throw new Error('RESEND_API_KEY not configured');
    resend = new Resend(key);
  }
  return resend;
};

const getWelcomeTemplate = (name: string, clinicName: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bem-vindo à ${clinicName}</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Estamos muito felizes em tê-lo(a) conosco. Seu cadastro no FisioFlow foi realizado com sucesso.</p>
      <p>Você agora pode acessar o Portal do Paciente para ver seus agendamentos, exercícios e evolução.</p>
      <div style="text-align: center;">
        <a href="https://fisioflow-migration.web.app/portal" class="button">Acessar Portal</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${clinicName}. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Handler da lógica de envio (separado da infraestrutura)
 */
export const sendEmailHandler = async (request: CallableRequest) => {
  const { to, subject, html, type, data } = request.data;

  if (!to || !subject) {
    throw new HttpsError('invalid-argument', 'Missing "to" or "subject" fields');
  }

  try {
    const client = getResend();
    
    let from = 'FisioFlow <onboarding@resend.dev>';
    // Tenta pegar o email configurado nos segredos/params
    try {
        if (RESEND_FROM_EMAIL.value()) {
            from = RESEND_FROM_EMAIL.value();
        }
    } catch (e) {
        // Ignora se não definido
    }

    let emailHtml = html;

    if (type === 'welcome') {
      emailHtml = getWelcomeTemplate(data?.name || 'Paciente', data?.clinicName || 'FisioFlow');
    }

    if (!emailHtml) {
        emailHtml = '<p>Mensagem enviada via FisioFlow.</p>';
    }

    const { data: result, error } = await client.emails.send({
      from,
      to, 
      subject,
      html: emailHtml,
    });

    if (error) {
      logger.error('Resend Error:', error);
      throw new HttpsError('internal', error.message);
    }

    logger.info('Email sent successfully:', result);
    return { success: true, id: result?.id };

  } catch (error: any) {
    logger.error('Send Email Error', error);
    throw new HttpsError('internal', 'Failed to send email: ' + error.message);
  }
};

export const sendEmail = onCall({ region: 'southamerica-east1' }, sendEmailHandler);
