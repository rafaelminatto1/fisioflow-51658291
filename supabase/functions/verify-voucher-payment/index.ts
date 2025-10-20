import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-VOUCHER-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    logStep("Request received", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Buscar sessão do Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status });

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Payment not completed' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const voucherId = session.metadata?.voucher_id;
    if (!voucherId) throw new Error("Voucher ID not found in session metadata");

    // Buscar voucher
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select('*')
      .eq('id', voucherId)
      .single();

    if (voucherError || !voucher) {
      throw new Error("Voucher not found");
    }

    // Verificar se já existe user_voucher para esta sessão
    const { data: existingUserVoucher } = await supabaseClient
      .from('user_vouchers')
      .select('id')
      .eq('stripe_payment_intent_id', session.payment_intent)
      .single();

    if (existingUserVoucher) {
      logStep("Voucher already processed for this payment");
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Voucher already activated' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calcular data de expiração
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + voucher.validade_dias);

    // Criar user_voucher
    const { data: userVoucher, error: userVoucherError } = await supabaseClient
      .from('user_vouchers')
      .insert([{
        user_id: user.id,
        voucher_id: voucherId,
        sessoes_totais: voucher.sessoes || 1,
        sessoes_restantes: voucher.sessoes || 1,
        data_expiracao: dataExpiracao.toISOString(),
        valor_pago: Number(voucher.preco),
        stripe_payment_intent_id: session.payment_intent,
        ativo: true,
      }])
      .select()
      .single();

    if (userVoucherError) {
      logStep("ERROR creating user_voucher", { error: userVoucherError });
      throw userVoucherError;
    }

    // Criar transação
    await supabaseClient
      .from('transacoes')
      .insert([{
        user_id: user.id,
        tipo: 'voucher_compra',
        valor: Number(voucher.preco),
        status: 'concluido',
        descricao: `Compra de voucher: ${voucher.nome}`,
        stripe_payment_intent_id: session.payment_intent,
        metadata: {
          voucher_id: voucherId,
          voucher_nome: voucher.nome,
          sessoes: voucher.sessoes,
        }
      }]);

    logStep("User voucher and transaction created successfully");

    return new Response(JSON.stringify({ 
      success: true,
      userVoucher
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
