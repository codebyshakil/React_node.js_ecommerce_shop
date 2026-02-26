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
      console.error('[SSLCommerz] Order not found:', orderErr);
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
      console.error('[SSLCommerz] Failed to read payment_methods from admin_settings:', pmErr);
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const paymentConfig = pmRow.value as any;
    const sslConfig = paymentConfig?.sslcommerz;

    if (!sslConfig?.enabled) {
      return new Response(JSON.stringify({ error: 'SSLCommerz is not enabled' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const STORE_ID = sslConfig.store_id;
    const STORE_PASSWD = sslConfig.store_password;
    const IS_SANDBOX = sslConfig.sandbox === true;

    if (!STORE_ID || !STORE_PASSWD) {
      console.error('[SSLCommerz] Missing store credentials in admin_settings');
      return new Response(JSON.stringify({ error: 'SSLCommerz credentials not configured. Please set them in Admin → Settings → Payment.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[SSLCommerz] Initiating payment for order ${order.id}, amount=${order.total}, sandbox=${IS_SANDBOX}, store_id_length=${STORE_ID.length}`);

    // Fetch profile for customer info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, address, city, zip_code, country')
      .eq('user_id', userId)
      .single();

    // Fetch user email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    const baseUrl = IS_SANDBOX
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    const functionsBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;

    const params = new URLSearchParams({
      store_id: STORE_ID,
      store_passwd: STORE_PASSWD,
      total_amount: String(order.total),
      currency: 'BDT',
      tran_id: order.id,
      success_url: `${functionsBase}/sslcommerz-ipn`,
      fail_url: `${functionsBase}/sslcommerz-ipn`,
      cancel_url: `${functionsBase}/sslcommerz-ipn`,
      ipn_url: `${functionsBase}/sslcommerz-ipn`,
      cus_name: profile?.full_name || 'Customer',
      cus_email: authUser?.user?.email || 'no-reply@example.com',
      cus_phone: profile?.phone || '01700000000',
      cus_add1: profile?.address || 'N/A',
      cus_city: profile?.city || 'Dhaka',
      cus_postcode: profile?.zip_code || '1000',
      cus_country: profile?.country || 'Bangladesh',
      shipping_method: 'NO',
      product_name: 'Order Items',
      product_category: 'General',
      product_profile: 'general',
    });

    const sslRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const contentType = sslRes.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const textResponse = await sslRes.text();
      console.error('[SSLCommerz] Non-JSON response:', textResponse.substring(0, 500));
      return new Response(JSON.stringify({ error: 'Payment gateway returned invalid response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sslData = await sslRes.json();
    console.log(`[SSLCommerz] Gateway response status=${sslData.status}, has_url=${!!sslData.GatewayPageURL}`);

    if (sslData.status !== 'SUCCESS') {
      console.error('[SSLCommerz] Init failed:', JSON.stringify(sslData));
      return new Response(JSON.stringify({ error: 'Payment gateway error', details: sslData.failedreason || sslData.status }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ gateway_url: sslData.GatewayPageURL }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SSLCommerz] Init error:', error);
    return new Response(JSON.stringify({ error: 'Payment initialization failed', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
