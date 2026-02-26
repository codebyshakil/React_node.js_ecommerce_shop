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
    // Authenticate user
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
      console.error('[bKash] Order not found:', orderErr);
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Order already processed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Read payment credentials from admin_settings table
    const { data: pmRow, error: pmErr } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'payment_methods')
      .single();

    if (pmErr || !pmRow?.value) {
      console.error('[bKash] Failed to read payment_methods from admin_settings:', pmErr);
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const paymentConfig = pmRow.value as any;
    const bkashConfig = paymentConfig?.bkash;

    if (!bkashConfig?.enabled) {
      return new Response(JSON.stringify({ error: 'bKash is not enabled' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { app_key, app_secret, username, password, sandbox } = bkashConfig;

    if (!app_key || !app_secret || !username || !password) {
      console.error('[bKash] Missing credentials in admin_settings');
      return new Response(JSON.stringify({ error: 'bKash credentials not configured. Please set them in Admin → Settings → Payment.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const IS_SANDBOX = sandbox === true;
    const baseUrl = IS_SANDBOX
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    console.log(`[bKash] Initiating payment for order ${order.id}, amount=${order.total}, sandbox=${IS_SANDBOX}`);

    // Step 1: Grant Token
    const tokenRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': username,
        'password': password,
      },
      body: JSON.stringify({
        app_key,
        app_secret,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log(`[bKash] Token response status_code=${tokenData.statusCode}, has_token=${!!tokenData.id_token}`);

    if (!tokenData.id_token) {
      console.error('[bKash] Token grant failed:', JSON.stringify(tokenData));
      return new Response(JSON.stringify({ error: 'bKash authentication failed', details: tokenData.statusMessage || tokenData.msg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';
    const callbackURL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/bkash-callback`;

    // Step 2: Create Payment
    const createRes = await fetch(`${baseUrl}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': tokenData.id_token,
        'X-APP-Key': app_key,
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: userId,
        callbackURL,
        amount: String(order.total),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: order.id,
      }),
    });

    const createData = await createRes.json();
    console.log(`[bKash] Create payment response statusCode=${createData.statusCode}, has_url=${!!createData.bkashURL}`);

    if (!createData.bkashURL) {
      console.error('[bKash] Create payment failed:', JSON.stringify(createData));
      return new Response(JSON.stringify({ error: 'bKash payment creation failed', details: createData.statusMessage || createData.errorMessage }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store bKash paymentID for callback verification
    await supabaseAdmin.from('orders').update({
      transaction_id: createData.paymentID,
    }).eq('id', order.id);

    return new Response(JSON.stringify({ gateway_url: createData.bkashURL }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[bKash] Init error:', error);
    return new Response(JSON.stringify({ error: 'bKash payment initialization failed', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
