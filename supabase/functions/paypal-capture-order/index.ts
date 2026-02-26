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

    const { paypal_order_id, order_id } = await req.json();
    if (!paypal_order_id || !order_id) {
      return new Response(JSON.stringify({ error: 'paypal_order_id and order_id are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Verify order belongs to user
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status, transaction_id')
      .eq('id', order_id)
      .eq('user_id', userId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Order already processed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Read PayPal config
    const { data: pmRow } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'payment_methods')
      .single();

    const paypalConfig = (pmRow?.value as any)?.paypal;
    if (!paypalConfig?.client_id || !paypalConfig?.client_secret) {
      return new Response(JSON.stringify({ error: 'PayPal not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const IS_SANDBOX = paypalConfig.sandbox === true;
    const baseUrl = IS_SANDBOX
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    // Get access token
    const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${paypalConfig.client_id}:${paypalConfig.client_secret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authRes.json();
    if (!authData.access_token) {
      return new Response(JSON.stringify({ error: 'PayPal authentication failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Capture the order
    console.log(`[PayPal] Capturing order ${paypal_order_id}`);
    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();
    console.log(`[PayPal] Capture response status=${captureData.status}`);

    if (captureData.status === 'COMPLETED') {
      // Update order status
      await supabaseAdmin.from('orders').update({
        status: 'confirmed',
        payment_status: 'paid',
        transaction_id: paypal_order_id,
      }).eq('id', order.id);

      // Send notification
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          },
          body: JSON.stringify({ type: 'order_confirmed', order_id: order.id, user_id: userId }),
        });
      } catch (e) {
        console.error('[PayPal] Notification error:', e);
      }

      return new Response(JSON.stringify({ success: true, status: 'COMPLETED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Payment not completed
      await supabaseAdmin.from('orders').update({
        status: 'payment_failed',
        payment_status: 'failed',
      }).eq('id', order.id);

      return new Response(JSON.stringify({ success: false, status: captureData.status, error: 'Payment not completed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('[PayPal] Capture error:', error);
    return new Response(JSON.stringify({ error: 'PayPal capture failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
