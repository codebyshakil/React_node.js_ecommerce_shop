import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper: generate a random transaction ID
function generateTrxId(orderId: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `NGD${ts}${rand}`.toUpperCase().substring(0, 20);
}

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
      console.error('[Nagad] Order not found:', orderErr);
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
      console.error('[Nagad] Failed to read payment_methods from admin_settings:', pmErr);
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const paymentConfig = pmRow.value as any;
    const nagadConfig = paymentConfig?.nagad;

    if (!nagadConfig?.enabled) {
      return new Response(JSON.stringify({ error: 'Nagad is not enabled' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { merchant_id, merchant_private_key, sandbox } = nagadConfig;

    if (!merchant_id || !merchant_private_key) {
      console.error('[Nagad] Missing credentials in admin_settings');
      return new Response(JSON.stringify({ error: 'Nagad credentials not configured. Please set them in Admin → Settings → Payment.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const IS_SANDBOX = sandbox === true;
    const baseUrl = IS_SANDBOX
      ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
      : 'https://api.mynagad.com/api/dfs';

    const callbackURL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/nagad-callback`;
    const trxId = generateTrxId(order.id);

    console.log(`[Nagad] Initiating payment for order ${order.id}, amount=${order.total}, sandbox=${IS_SANDBOX}, trxId=${trxId}`);

    // Nagad Checkout URL initialization
    // For simplified integration, use the checkout URL approach
    const dateTime = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);

    // Build sensitive data for initialization
    const sensitiveData = {
      merchantId: merchant_id,
      datetime: dateTime,
      orderId: trxId,
      challenge: crypto.randomUUID().replace(/-/g, '').substring(0, 20),
    };

    // Sign the sensitive data using the merchant's private key
    // For Nagad, we use RSA signing with the merchant private key
    let signature: string;
    try {
      const sensitiveDataStr = JSON.stringify(sensitiveData);
      
      // Import private key for signing
      const pemContent = merchant_private_key
        .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
        .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');
      
      const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
      
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const encoder = new TextEncoder();
      const signatureBuffer = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(sensitiveDataStr)
      );

      signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    } catch (signErr) {
      console.error('[Nagad] Signature generation failed:', signErr);
      return new Response(JSON.stringify({ error: 'Nagad signature generation failed. Please check your private key format.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sensitiveDataStr = JSON.stringify(sensitiveData);
    const sensitiveDataBase64 = btoa(sensitiveDataStr);

    // Step 1: Initialize payment
    const initUrl = `${baseUrl}/check-out/initialize/${merchant_id}/${trxId}`;
    console.log(`[Nagad] Calling init URL: ${initUrl}`);

    const initRes = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-KM-Api-Version': 'v-0.2.0',
        'X-KM-IP-V4': '127.0.0.1',
        'X-KM-Client-Type': 'PC_WEB',
      },
      body: JSON.stringify({
        accountNumber: merchant_id,
        dateTime: dateTime,
        sensitiveData: sensitiveDataBase64,
        signature: signature,
      }),
    });

    const initData = await initRes.json();
    console.log(`[Nagad] Init response: reason=${initData.reason}, has_sensitiveData=${!!initData.sensitiveData}`);

    if (initData.reason || !initData.sensitiveData) {
      console.error('[Nagad] Init failed:', JSON.stringify(initData));
      return new Response(JSON.stringify({ error: 'Nagad initialization failed', details: initData.reason || initData.message || 'Unknown error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt the response sensitive data using merchant private key
    let responseData: any;
    try {
      // The response sensitiveData is encrypted with merchant's public key
      // We need to decrypt it - but Nagad also sends it as base64 encoded JSON in some implementations
      // Try base64 decode first
      const decoded = atob(initData.sensitiveData);
      responseData = JSON.parse(decoded);
    } catch {
      // If base64 decode fails, try using the data as-is
      responseData = initData;
    }

    const paymentReferenceId = responseData.paymentReferenceId || initData.paymentReferenceId;
    const nagadChallenge = responseData.challenge || initData.challenge;

    if (!paymentReferenceId) {
      console.error('[Nagad] No paymentReferenceId in response');
      return new Response(JSON.stringify({ error: 'Nagad initialization incomplete' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Complete checkout
    const checkoutData = {
      merchantId: merchant_id,
      orderId: trxId,
      currencyCode: '050',
      amount: String(order.total),
      challenge: nagadChallenge,
    };

    const checkoutDataStr = JSON.stringify(checkoutData);
    const checkoutDataBase64 = btoa(checkoutDataStr);

    // Sign checkout data
    let checkoutSignature: string;
    try {
      const pemContent = merchant_private_key
        .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
        .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');
      const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const encoder = new TextEncoder();
      const sigBuffer = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(checkoutDataStr)
      );
      checkoutSignature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
    } catch (signErr) {
      console.error('[Nagad] Checkout signature failed:', signErr);
      return new Response(JSON.stringify({ error: 'Nagad checkout signature failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const completeUrl = `${baseUrl}/check-out/complete/${paymentReferenceId}`;
    console.log(`[Nagad] Calling complete URL: ${completeUrl}`);

    const completeRes = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-KM-Api-Version': 'v-0.2.0',
        'X-KM-IP-V4': '127.0.0.1',
        'X-KM-Client-Type': 'PC_WEB',
      },
      body: JSON.stringify({
        sensitiveData: checkoutDataBase64,
        signature: checkoutSignature,
        merchantCallbackURL: callbackURL,
        additionalMerchantInfo: JSON.stringify({ order_id: order.id }),
      }),
    });

    const completeData = await completeRes.json();
    console.log(`[Nagad] Complete response: status=${completeData.status}, has_callBackUrl=${!!completeData.callBackUrl}`);

    if (!completeData.callBackUrl) {
      console.error('[Nagad] Complete checkout failed:', JSON.stringify(completeData));
      return new Response(JSON.stringify({ error: 'Nagad checkout failed', details: completeData.reason || completeData.message || 'No redirect URL' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store Nagad payment reference for callback verification
    await supabaseAdmin.from('orders').update({
      transaction_id: trxId,
      notes: JSON.stringify({ nagad_payment_ref: paymentReferenceId, nagad_trx_id: trxId }),
    }).eq('id', order.id);

    return new Response(JSON.stringify({ gateway_url: completeData.callBackUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Nagad] Init error:', error);
    return new Response(JSON.stringify({ error: 'Nagad payment initialization failed', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
