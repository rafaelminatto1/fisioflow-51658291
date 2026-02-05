/**
 * Email module for sending emails via Resend
 * Ported from Jules task 4594806547830790725
 */

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface ResendResponse {
  id: string;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(
  message: EmailMessage
): Promise<ResendResponse | null> {
  try {
    const apiKey = import.meta.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
    const from = message.from || process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (!apiKey) {
      console.warn('Resend API key not configured, skipping email sending');
      return null;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    });

    if (!response.ok) {
      console.error('Resend API error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    return null;
  }
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(
  patientName: string,
  patientEmail: string,
  appointmentDate: Date,
  appointmentTime: string,
  messageBody?: string
): Promise<boolean> {
  const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
  const subject = 'Lembrete de Agendamento - FisioFlow';

  // Use provided message body or default template
  const html = messageBody
    ? `<p>${messageBody.replace(/\n/g, '<br>')}</p>`
    : `<p>Olá ${patientName},</p>
     <p>Este é um lembrete do seu agendamento na FisioFlow:</p>
     <p><strong>Data:</strong> ${formattedDate}</p>
     <p><strong>Horário:</strong> ${appointmentTime}</p>
     <p>Atenciosamente,<br>Equipe FisioFlow</p>`;

  const result = await sendEmail({
    to: patientEmail,
    subject,
    html,
  });

  return result !== null;
}
