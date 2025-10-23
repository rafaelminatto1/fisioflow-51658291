import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentEmailRequest {
  patientEmail: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  action: 'created' | 'rescheduled' | 'cancelled' | 'reminder';
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      patientEmail,
      patientName,
      appointmentDate,
      appointmentTime,
      appointmentType,
      action,
      clinicName = "Activity Fisioterapia",
      clinicAddress = "Rua Exemplo, 123 - São Paulo, SP",
      clinicPhone = "(11) 99999-9999"
    }: AppointmentEmailRequest = await req.json();

    console.log(`Enviando email de agendamento (${action}) para ${patientEmail}`);

    // Definir subject e conteúdo baseado na ação
    let subject = "";
    let htmlContent = "";

    switch (action) {
      case 'created':
        subject = `✅ Agendamento Confirmado - ${clinicName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✅ Agendamento Confirmado!</h1>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Olá, <strong>${patientName}</strong>!
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Seu agendamento foi confirmado com sucesso! Seguem os detalhes:
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📅 Data:</td>
                    <td style="padding: 10px 0; color: #111827; font-weight: bold; font-size: 16px; text-align: right;">${appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">⏰ Horário:</td>
                    <td style="padding: 10px 0; color: #111827; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #e5e7eb;">${appointmentTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">💆 Tipo:</td>
                    <td style="padding: 10px 0; color: #111827; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #e5e7eb;">${appointmentType}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  ℹ️ <strong>Importante:</strong> Por favor, chegue com 10 minutos de antecedência. Em caso de atraso ou necessidade de remarcação, entre em contato conosco.
                </p>
              </div>
              
              <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <h3 style="color: #111827; margin-bottom: 15px; font-size: 18px;">📍 Informações da Clínica</h3>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>${clinicName}</strong>
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  📍 ${clinicAddress}
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  📞 ${clinicPhone}
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 5px 0;">Este é um email automático, por favor não responda.</p>
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${clinicName}. Todos os direitos reservados.</p>
            </div>
          </div>
        `;
        break;

      case 'rescheduled':
        subject = `🔄 Agendamento Remarcado - ${clinicName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔄 Agendamento Remarcado</h1>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Olá, <strong>${patientName}</strong>!
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Seu agendamento foi <strong>remarcado</strong>. Confira os novos dados:
              </p>
              
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #fbbf24;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #78350f; font-size: 14px;">📅 Nova Data:</td>
                    <td style="padding: 10px 0; color: #78350f; font-weight: bold; font-size: 16px; text-align: right;">${appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #78350f; font-size: 14px; border-top: 1px solid #fcd34d;">⏰ Novo Horário:</td>
                    <td style="padding: 10px 0; color: #78350f; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #fcd34d;">${appointmentTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #78350f; font-size: 14px; border-top: 1px solid #fcd34d;">💆 Tipo:</td>
                    <td style="padding: 10px 0; color: #78350f; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #fcd34d;">${appointmentType}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                  Se houver algum problema com a nova data, entre em contato conosco o quanto antes.
                </p>
              </div>
              
              <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <h3 style="color: #111827; margin-bottom: 15px; font-size: 18px;">📍 Informações da Clínica</h3>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>${clinicName}</strong>
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  📞 ${clinicPhone}
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${clinicName}</p>
            </div>
          </div>
        `;
        break;

      case 'cancelled':
        subject = `❌ Agendamento Cancelado - ${clinicName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">❌ Agendamento Cancelado</h1>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Olá, <strong>${patientName}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Informamos que o agendamento a seguir foi <strong>cancelado</strong>:
              </p>
              
              <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #fca5a5;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #7f1d1d; font-size: 14px;">📅 Data:</td>
                    <td style="padding: 10px 0; color: #7f1d1d; font-weight: bold; font-size: 16px; text-align: right;">${appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #7f1d1d; font-size: 14px; border-top: 1px solid #fca5a5;">⏰ Horário:</td>
                    <td style="padding: 10px 0; color: #7f1d1d; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #fca5a5;">${appointmentTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #7f1d1d; font-size: 14px; border-top: 1px solid #fca5a5;">💆 Tipo:</td>
                    <td style="padding: 10px 0; color: #7f1d1d; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #fca5a5;">${appointmentType}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
                <p style="color: #374151; font-size: 16px; margin: 0;">
                  Deseja remarcar? Entre em contato conosco!
                </p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                  Estamos à disposição para agendar um novo horário.
                </p>
              </div>
              
              <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <h3 style="color: #111827; margin-bottom: 15px; font-size: 18px;">📞 Entre em Contato</h3>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>${clinicName}</strong>
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  📞 ${clinicPhone}
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${clinicName}</p>
            </div>
          </div>
        `;
        break;

      case 'reminder':
        subject = `⏰ Lembrete: Consulta Amanhã - ${clinicName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Lembrete de Consulta</h1>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Olá, <strong>${patientName}</strong>!
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Este é um lembrete de que você tem uma consulta <strong>amanhã</strong>:
              </p>
              
              <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #60a5fa;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #1e3a8a; font-size: 14px;">📅 Data:</td>
                    <td style="padding: 10px 0; color: #1e3a8a; font-weight: bold; font-size: 16px; text-align: right;">${appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #1e3a8a; font-size: 14px; border-top: 1px solid #93c5fd;">⏰ Horário:</td>
                    <td style="padding: 10px 0; color: #1e3a8a; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #93c5fd;">${appointmentTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #1e3a8a; font-size: 14px; border-top: 1px solid #93c5fd;">💆 Tipo:</td>
                    <td style="padding: 10px 0; color: #1e3a8a; font-weight: bold; font-size: 16px; text-align: right; border-top: 1px solid #93c5fd;">${appointmentType}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  ⚠️ <strong>Lembre-se:</strong> Chegue com 10 minutos de antecedência. Traga documentos e exames anteriores, se houver.
                </p>
              </div>
              
              <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <h3 style="color: #111827; margin-bottom: 15px; font-size: 18px;">📍 Local</h3>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>${clinicName}</strong>
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  📍 ${clinicAddress}
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  📞 ${clinicPhone}
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 5px 0;">Nos vemos em breve! 😊</p>
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${clinicName}</p>
            </div>
          </div>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: `${clinicName} <agendamentos@activityfisioterapia.com.br>`,
      to: [patientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
