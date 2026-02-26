import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== 'string') {
      return new Response(JSON.stringify({ error: 'order_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Fetch order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, total, user_id, status')
      .eq('id', order_id)
      .eq('user_id', userId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Order already processed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Read Stripe config from admin_settings
    const { data: pmRow, error: pmErr } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'payment_methods')
      .single();

    if (pmErr || !pmRow?.value) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const stripeConfig = (pmRow.value as any)?.stripe;
    if (!stripeConfig?.enabled) {
      return new Response(JSON.stringify({ error: 'Stripe is not enabled' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const secretKey = stripeConfig.secret_key;
    if (!secretKey) {
      return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const currency = stripeConfig.currency || 'usd';
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';

    // Fetch order items for line items
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('product_name, quantity, price')
      .eq('order_id', order.id);

    const lineItems = (orderItems || []).map((item: any) => ({
      price_data: {
        currency,
        product_data: { name: item.product_name },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    // If no line items, use a single line item with total
    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: 'Order Total' },
          unit_amount: Math.round(Number(order.total) * 100),
        },
        quantity: 1,
      });
    }

    // Check if order total includes shipping/discount difference
    const itemsTotal = (orderItems || []).reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0);
    const diff = Number(order.total) - itemsTotal;
    if (Math.abs(diff) > 0.01 && orderItems && orderItems.length > 0) {
      if (diff > 0) {
        lineItems.push({
          price_data: {
            currency,
            product_data: { name: 'Shipping & Fees' },
            unit_amount: Math.round(diff * 100),
          },
          quantity: 1,
        });
      }
      // Negative diff (discount) - add as a coupon isn't simple via API, so adjust last item or add note
    }

    console.log(`[Stripe] Creating checkout session for order ${order.id}, amount=${order.total}, currency=${currency}`);

    // Create Stripe Checkout Session
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${siteUrl}/payment/success?method=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${siteUrl}/payment/cancel`);
    params.append('metadata[order_id]', order.id);
    params.append('metadata[user_id]', userId);

    lineItems.forEach((item: any, idx: number) => {
      params.append(`line_items[${idx}][price_data][currency]`, item.price_data.currency);
      params.append(`line_items[${idx}][price_data][product_data][name]`, item.price_data.product_data.name);
      params.append(`line_items[${idx}][price_data][unit_amount]`, String(item.price_data.unit_amount));
      params.append(`line_items[${idx}][quantity]`, String(item.quantity));
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok || !session.url) {
      console.error('[Stripe] Session creation failed:', JSON.stringify(session));
      return new Response(JSON.stringify({ error: 'Stripe session creation failed', details: session.error?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store Stripe session ID
    await supabaseAdmin.from('orders').update({ transaction_id: session.id }).eq('id', order.id);

    return new Response(JSON.stringify({ gateway_url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Stripe] Error:', error);
    return new Response(JSON.stringify({ error: 'Stripe checkout failed', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
