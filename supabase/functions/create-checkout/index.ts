import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  voucher_id: string;
  price_id?: string;
  quantity?: number;
  success_url?: string;
  cancel_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user?.email) {
      throw new Error("User not authenticated");
    }

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { voucher_id, price_id, quantity = 1, success_url, cancel_url } = body;

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get voucher details if voucher_id provided
    let voucherData = null;
    let priceToUse = price_id;

    if (voucher_id) {
      const { data: voucher, error: voucherError } = await supabaseClient
        .from('vouchers')
        .select('*')
        .eq('id', voucher_id)
        .single();

      if (voucherError || !voucher) {
        throw new Error("Voucher not found");
      }

      voucherData = voucher;
      
      // Use voucher price_id if not explicitly provided
      if (!priceToUse && voucher.stripe_price_id) {
        priceToUse = voucher.stripe_price_id;
      }
    }

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Determine line items
    let lineItems;
    if (priceToUse) {
      lineItems = [{
        price: priceToUse,
        quantity: quantity,
      }];
    } else if (voucherData) {
      // Create price on the fly for voucher
      lineItems = [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: voucherData.name || 'Pacote de Sessões',
            description: `${voucherData.sessions || 1} sessões de fisioterapia`,
          },
          unit_amount: Math.round((voucherData.price || 0) * 100), // Convert to cents
        },
        quantity: 1,
      }];
    } else {
      throw new Error("No price information provided");
    }

    // Get profile for organization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "https://fisioflow.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: success_url || `${origin}/vouchers?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/vouchers?canceled=true`,
      metadata: {
        user_id: user.id,
        voucher_id: voucher_id || '',
        organization_id: profile?.organization_id || '',
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          voucher_id: voucher_id || '',
        },
      },
    });

    // Record purchase attempt
    await supabaseClient
      .from('stripe_purchases')
      .insert({
        organization_id: profile?.organization_id,
        user_id: user.id,
        stripe_session_id: session.id,
        voucher_id: voucher_id || null,
        amount: session.amount_total || 0,
        currency: 'brl',
        status: 'pending',
      });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
