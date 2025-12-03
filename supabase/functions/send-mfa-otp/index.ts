import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  userId: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Serviço de email não configurado" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email }: SendOTPRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "userId e email são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Gerando OTP para usuário ${userId}`);

    // Gerar OTP usando a função do banco
    const { data: otpCode, error: otpError } = await supabase.rpc("generate_mfa_otp", {
      _user_id: userId,
    });

    if (otpError) {
      console.error("Erro ao gerar OTP:", otpError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar código de verificação" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`OTP gerado, enviando email para ${email}`);

    // Enviar email com o código
    const emailResponse = await resend.emails.send({
      from: "FisioFlow <noreply@resend.dev>",
      to: [email],
      subject: "Código de Verificação - FisioFlow",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #5B4FE8; margin: 0; font-size: 28px;">FisioFlow</h1>
              <p style="color: #71717a; margin-top: 8px;">Código de Verificação</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #5B4FE8 0%, #7C3AED 100%); color: white; font-size: 36px; letter-spacing: 8px; padding: 20px 40px; border-radius: 12px; display: inline-block; font-weight: bold;">
                ${otpCode}
              </div>
            </div>
            
            <p style="color: #52525b; text-align: center; font-size: 14px; line-height: 1.6;">
              Use este código para completar sua autenticação.<br>
              O código expira em <strong>10 minutos</strong>.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                Se você não solicitou este código, ignore este email.<br>
                Não compartilhe este código com ninguém.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erro em send-mfa-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
