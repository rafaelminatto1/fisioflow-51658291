import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // For now, we'll process without signature verification
    // In production, add STRIPE_WEBHOOK_SECRET
    const event = JSON.parse(body) as Stripe.Event;

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update purchase status
        const { error: updateError } = await supabaseAdmin
          .from('stripe_purchases')
          .update({
            status: 'paid',
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_customer_id: session.customer as string,
            paid_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id);

        if (updateError) {
          console.error("Error updating purchase:", updateError);
        }

        // If voucher purchase, create user_voucher
        const voucherId = session.metadata?.voucher_id;
        const userId = session.metadata?.user_id;
        const orgId = session.metadata?.organization_id;

        if (voucherId && userId) {
          // Get voucher details
          const { data: voucher } = await supabaseAdmin
            .from('vouchers')
            .select('*')
            .eq('id', voucherId)
            .single();

          if (voucher) {
            // Create user voucher
            await supabaseAdmin
              .from('user_vouchers')
              .insert({
                user_id: userId,
                voucher_id: voucherId,
                organization_id: orgId,
                sessoes_totais: voucher.sessions || 1,
                sessoes_restantes: voucher.sessions || 1,
                data_compra: new Date().toISOString(),
                data_expiracao: new Date(Date.now() + (voucher.validity_days || 365) * 24 * 60 * 60 * 1000).toISOString(),
                ativo: true,
                stripe_purchase_id: session.id,
              });

            console.log(`Created user_voucher for user ${userId}, voucher ${voucherId}`);
          }
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update purchase status to failed
        await supabaseAdmin
          .from('stripe_purchases')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        
        // Update purchase status to refunded
        await supabaseAdmin
          .from('stripe_purchases')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', charge.payment_intent as string);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
